[CmdletBinding()]
param(
  [switch]$CheckOnly,
  [switch]$StageBackendPreview,
  [switch]$Production,
  [switch]$AcceptOwnerAccountSmokeWaiver,
  [string]$ApprovalFile = "",
  [string]$BaselineCommit = "",
  [string]$ExpectedBranch = "main"
)

$ErrorActionPreference = "Stop"
$ExpectedProject = "star-strike-rush"
$ProductionUrl = "https://star-strike-rush.web.app"
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$GeneratedBackendIdentity = Join-Path $RepositoryRoot "functions\release-identity.generated.js"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )
  Write-Host ""
  Write-Host "==> $Label"
  $global:LASTEXITCODE = 0
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

function Get-GitText {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  $output = & git @Arguments
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed." }
  return ($output | Out-String).Trim()
}

function Invoke-ReleaseChecks {
  param([Parameter(Mandatory = $true)][string]$ReleaseCommit)
  Invoke-Checked -Label "Install root dependencies" -Command { npm ci }
  Invoke-Checked -Label "Install Functions dependencies" -Command { npm ci --prefix functions }
  Invoke-Checked -Label "Run unit and browser tests" -Command { npm test }
  Invoke-Checked -Label "Run Firestore Rules emulator tests" -Command { npm run test:rules }
  Invoke-Checked -Label "Run real Firebase client emulator tests" -Command { npm run test:firebase-client }
  Invoke-Checked -Label "Run asserted visual QA" -Command { npm run test:visual }
  Invoke-Checked -Label "Audit root production dependencies" -Command { npm audit --omit=dev --audit-level=high }
  Invoke-Checked -Label "Audit Functions production dependencies" -Command {
    npm audit --prefix functions --omit=dev --audit-level=high
  }
  Invoke-Checked -Label "Scan tracked files for secrets" -Command { npm run test:secret }
  Invoke-Checked -Label "Build exact release commit" -Command {
    $env:RELEASE_COMMIT_SHA = $ReleaseCommit
    try { npm run build } finally { Remove-Item Env:RELEASE_COMMIT_SHA -ErrorAction SilentlyContinue }
  }
}

function Resolve-ReleaseBaseline {
  param([string]$ExplicitBaseline)
  $candidate = $ExplicitBaseline
  if (-not $candidate -and $env:RELEASE_BASELINE_SHA) {
    $candidate = $env:RELEASE_BASELINE_SHA
  }
  if (-not $candidate) {
    try {
      $versionUrl = "$ProductionUrl/version.json?releaseBaseline=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
      $productionVersion = Invoke-RestMethod -Uri $versionUrl -Method Get -Headers @{ "Cache-Control" = "no-cache" }
      $candidate = [string]$productionVersion.commitSha
      Write-Host "Detected last production commit from version.json: $candidate"
    } catch {
      throw "Production version.json did not provide a baseline. Supply -BaselineCommit with a reviewed full SHA."
    }
  }
  if ($candidate -notmatch "^[0-9a-fA-F]{40}$") {
    throw "Release baseline must be a full 40-character Git SHA."
  }
  return $candidate.ToLowerInvariant()
}

function Deploy-HostingPreview {
  param([Parameter(Mandatory = $true)][string]$ReleaseCommit)
  $channel = "release-$($ReleaseCommit.Substring(0, 12))"
  Write-Host ""
  Write-Host "==> Deploy Hosting preview channel $channel"
  $previewJson = & npx firebase hosting:channel:deploy $channel --only app --project $ExpectedProject --expires 7d --json
  if ($LASTEXITCODE -ne 0) { throw "Firebase Hosting preview deployment failed." }
  $previewText = ($previewJson | Out-String)
  $previewMatches = [regex]::Matches($previewText, "https://[^`"'\s]+\.web\.app")
  if ($previewMatches.Count -eq 0) { throw "Preview deployment succeeded but no preview URL was returned." }
  return $previewMatches[$previewMatches.Count - 1].Value
}

$modeCount = 0
if ($CheckOnly) { $modeCount++ }
if ($StageBackendPreview) { $modeCount++ }
if ($Production) { $modeCount++ }
if ($modeCount -eq 0) { $CheckOnly = $true }
if ($modeCount -gt 1) { throw "Choose exactly one release mode: -CheckOnly, -StageBackendPreview, or -Production." }
if ($AcceptOwnerAccountSmokeWaiver -and -not $Production) {
  throw "-AcceptOwnerAccountSmokeWaiver is valid only with -Production."
}

Write-Host "Detected repository path: $RepositoryRoot"
Set-Location -LiteralPath $RepositoryRoot

$detectedRoot = Get-GitText -Arguments @("rev-parse", "--show-toplevel")
if ([IO.Path]::GetFullPath($detectedRoot).TrimEnd("\") -ne [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd("\")) {
  throw "release.ps1 must run inside the Star Strike RUSH repository."
}
$nodeVersion = (& node --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch "^v22\.") {
  throw "Node.js 22 is required for Firebase release tooling; found '$nodeVersion'. Select Node 22 and rerun."
}
Write-Host "Verified release Node runtime: $nodeVersion"
$remote = Get-GitText -Arguments @("remote", "get-url", "origin")
if ($remote -notmatch "RENEGADE21AI[/:]Star_Strike_RUSH(?:\.git)?$") {
  throw "origin does not point to RENEGADE21AI/Star_Strike_RUSH: $remote"
}
$dirty = Get-GitText -Arguments @("status", "--porcelain")
if ($dirty) { throw "Worktree must be clean before release.`n$dirty" }

$branch = Get-GitText -Arguments @("branch", "--show-current")
if ($ExpectedBranch -ne "*" -and $branch -ne $ExpectedBranch) {
  throw "Expected branch '$ExpectedBranch' but found '$branch'."
}
Write-Host "Detected branch: $branch"

Invoke-Checked -Label "Fetch origin" -Command { git fetch origin --prune }
$localMain = Get-GitText -Arguments @("rev-parse", "main")
$originMain = Get-GitText -Arguments @("rev-parse", "origin/main")
if ($localMain -ne $originMain) {
  throw "Local main ($localMain) differs from origin/main ($originMain). Update main before release."
}

$releaseCommit = Get-GitText -Arguments @("rev-parse", "HEAD")
Write-Host "Commit being released: $releaseCommit"

$firebaseConfig = Get-Content -Raw -LiteralPath (Join-Path $RepositoryRoot ".firebaserc") | ConvertFrom-Json
if ($firebaseConfig.projects.default -ne $ExpectedProject) {
  throw ".firebaserc default project is '$($firebaseConfig.projects.default)', expected '$ExpectedProject'."
}
Write-Host "Verified configured Firebase project: $ExpectedProject"

if ($CheckOnly) {
  Invoke-ReleaseChecks -ReleaseCommit $releaseCommit
  Write-Host ""
  Write-Host "Release checks passed for $releaseCommit. No Firebase credentials were required and no resources were changed."
  exit 0
}

$projectsJson = & npx firebase projects:list --json
if ($LASTEXITCODE -ne 0) { throw "Unable to prove authenticated access to Firebase project '$ExpectedProject' with the locked CLI." }
$projects = $projectsJson | ConvertFrom-Json
$visibleProjects = @($projects.result | ForEach-Object { $_.projectId })
if ($visibleProjects -notcontains $ExpectedProject) {
  throw "Authenticated Firebase CLI account cannot access '$ExpectedProject'."
}
Write-Host "Verified authenticated Firebase project access: $ExpectedProject"

if ($StageBackendPreview) {
  $baseline = Resolve-ReleaseBaseline -ExplicitBaseline $BaselineCommit
  $planJson = & node scripts/release-plan.js $baseline $releaseCommit
  if ($LASTEXITCODE -ne 0) { throw "Release range validation failed." }
  $plan = $planJson | ConvertFrom-Json
  Write-Host "Validated complete release range: $baseline...$releaseCommit"
  Write-Host "Changed paths: $($plan.changedPaths.Count)"

  Invoke-ReleaseChecks -ReleaseCommit $releaseCommit
  Invoke-Checked -Label "Generate exact backend release identity" -Command {
    node scripts/generate-backend-release.js --sha $releaseCommit --output $GeneratedBackendIdentity
  }
  try {
    Invoke-Checked -Label "Deploy Functions with exact backend release identity" -Command {
      npx firebase deploy --only functions --project $ExpectedProject
    }
  } finally {
    if (Test-Path -LiteralPath $GeneratedBackendIdentity) {
      Remove-Item -LiteralPath $GeneratedBackendIdentity -Force
    }
  }

  # The currently deployed Rules revision cannot be proven from GitHub. Stage
  # the exact emulator-tested file idempotently after the matching Functions.
  Invoke-Checked -Label "Deploy exact tested Firestore Rules after Functions" -Command {
    npx firebase deploy --only firestore:rules --project $ExpectedProject
  }

  $indexesDeployed = $false
  if ($plan.components.indexes) {
    Invoke-Checked -Label "Deploy changed Firestore indexes" -Command {
      npx firebase deploy --only firestore:indexes --project $ExpectedProject
    }
    $indexesDeployed = $true
  } else {
    Write-Host "Firestore indexes did not change in the complete release range; index deployment skipped."
  }

  $previewUrl = Deploy-HostingPreview -ReleaseCommit $releaseCommit
  Write-Host "Preview URL: $previewUrl"
  Invoke-Checked -Label "Verify preview Hosting/backend SHAs, Google Auth origin, headers, private paths, and closed callables" -Command {
    node scripts/smoke-release.js $previewUrl $releaseCommit --verify-callables
  }

  $evidenceDirectory = Join-Path $RepositoryRoot "release-evidence"
  New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
  $stageReport = [ordered]@{
    schemaVersion = 1
    releaseSha = $releaseCommit
    baselineSha = $baseline
    previewUrl = $previewUrl
    previewHostingShaVerified = $true
    backendShaVerified = $true
    functionsDeployed = $true
    rulesDeployed = $true
    indexesDeployed = $indexesDeployed
    components = $plan.components
    stagedAtUtc = [DateTimeOffset]::UtcNow.ToString("o")
  }
  $stageReportPath = Join-Path $evidenceDirectory "staged-release-report.local.json"
  $stageReport | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stageReportPath -Encoding utf8

  Write-Host ""
  Write-Host "Backend and preview staging passed for $releaseCommit."
  Write-Host "Production Hosting remains withheld."
  Write-Host "Complete Account A/B evidence or record an explicit owner waiver, plus migration and music authorization, in release-approval.local.json."
  Write-Host "Staged report: $stageReportPath"
  exit 0
}

if (-not $ApprovalFile) {
  throw "-Production requires -ApprovalFile. Copy release-approval.template.json to release-approval.local.json and complete only verified fields."
}
$approvalPath = [IO.Path]::GetFullPath((Join-Path $RepositoryRoot $ApprovalFile))
if (-not (Test-Path -LiteralPath $approvalPath)) { throw "Approval file does not exist: $approvalPath" }
$approval = Get-Content -Raw -LiteralPath $approvalPath | ConvertFrom-Json
$approvedPreviewUrl = [string]$approval.previewUrl
$approvalValidatorArguments = @($approvalPath, $releaseCommit, $approvedPreviewUrl)
if ($AcceptOwnerAccountSmokeWaiver) {
  $approvalValidatorArguments += "--accept-owner-account-smoke-waiver"
}
Invoke-Checked -Label "Validate exact release human approval" -Command {
  node scripts/validate-release-approval.js @approvalValidatorArguments
}
Invoke-Checked -Label "Reverify staged preview Hosting/backend SHAs and Google Auth origin" -Command {
  node scripts/smoke-release.js $approvedPreviewUrl $releaseCommit --verify-callables
}
Invoke-Checked -Label "Rebuild exact approved Hosting commit" -Command {
  $env:RELEASE_COMMIT_SHA = $releaseCommit
  try { npm run build } finally { Remove-Item Env:RELEASE_COMMIT_SHA -ErrorAction SilentlyContinue }
}
Invoke-Checked -Label "Deploy Hosting production last" -Command {
  npx firebase deploy --only hosting:app --project $ExpectedProject
}
Invoke-Checked -Label "Verify production SHAs, Google Auth origin, headers, private paths, and closed callables" -Command {
  node scripts/smoke-release.js $ProductionUrl $releaseCommit --verify-callables
}
Write-Host ""
Write-Host "Production release verified: $ProductionUrl"
