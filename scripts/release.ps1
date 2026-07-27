[CmdletBinding()]
param(
  [switch]$Production,
  [switch]$CheckOnly,
  [string]$ExpectedBranch = "main"
)

$ErrorActionPreference = "Stop"
$ExpectedProject = "star-strike-rush"
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )
  Write-Host ""
  Write-Host "==> $Label"
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

Write-Host "Detected repository path: $RepositoryRoot"
Set-Location -LiteralPath $RepositoryRoot

$DetectedRoot = Get-GitText -Arguments @("rev-parse", "--show-toplevel")
if ([IO.Path]::GetFullPath($DetectedRoot).TrimEnd("\") -ne [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd("\")) {
  throw "release.ps1 must run inside the Star Strike RUSH repository."
}
$NodeVersion = (& node --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $NodeVersion -notmatch "^v22\.") {
  throw "Node.js 22 is required for Firebase release tooling; found '$NodeVersion'. Select Node 22 and rerun."
}
Write-Host "Verified release Node runtime: $NodeVersion"
$Remote = Get-GitText -Arguments @("remote", "get-url", "origin")
if ($Remote -notmatch "RENEGADE21AI[/:]Star_Strike_RUSH(?:\.git)?$") {
  throw "origin does not point to RENEGADE21AI/Star_Strike_RUSH: $Remote"
}
$Dirty = Get-GitText -Arguments @("status", "--porcelain")
if ($Dirty) { throw "Worktree must be clean before release.`n$Dirty" }

$Branch = Get-GitText -Arguments @("branch", "--show-current")
if ($ExpectedBranch -ne "*" -and $Branch -ne $ExpectedBranch) {
  throw "Expected branch '$ExpectedBranch' but found '$Branch'."
}
Write-Host "Detected branch: $Branch"

Invoke-Checked -Label "Fetch origin" -Command { git fetch origin --prune }
$LocalMain = Get-GitText -Arguments @("rev-parse", "main")
$OriginMain = Get-GitText -Arguments @("rev-parse", "origin/main")
if ($LocalMain -ne $OriginMain) {
  throw "Local main ($LocalMain) differs from origin/main ($OriginMain). Update main before release."
}

$ReleaseCommit = Get-GitText -Arguments @("rev-parse", "HEAD")
Write-Host "Commit being released: $ReleaseCommit"

$FirebaseConfig = Get-Content -Raw -LiteralPath (Join-Path $RepositoryRoot ".firebaserc") | ConvertFrom-Json
if ($FirebaseConfig.projects.default -ne $ExpectedProject) {
  throw ".firebaserc default project is '$($FirebaseConfig.projects.default)', expected '$ExpectedProject'."
}
$ProjectsJson = & npx firebase projects:list --json
if ($LASTEXITCODE -ne 0) { throw "Unable to list Firebase projects with the locked CLI." }
$Projects = $ProjectsJson | ConvertFrom-Json
$VisibleProjects = @($Projects.result | ForEach-Object { $_.projectId })
if ($VisibleProjects -notcontains $ExpectedProject) {
  throw "Authenticated Firebase CLI account cannot access '$ExpectedProject'."
}
Write-Host "Verified Firebase project: $ExpectedProject"

Invoke-Checked -Label "Install root dependencies" -Command { npm ci }
Invoke-Checked -Label "Install Functions dependencies" -Command { npm ci --prefix functions }
Invoke-Checked -Label "Run unit and browser tests" -Command { npm test }
Invoke-Checked -Label "Run Firestore Rules emulator tests" -Command { npm run test:rules }
Invoke-Checked -Label "Run real Firebase client emulator tests" -Command { npm run test:firebase-client }
Invoke-Checked -Label "Run asserted visual QA" -Command { npm run test:visual }
Invoke-Checked -Label "Audit root production dependencies" -Command { npm audit --omit=dev --audit-level=high }
Invoke-Checked -Label "Audit Functions production dependencies" -Command { npm audit --prefix functions --omit=dev --audit-level=high }
Invoke-Checked -Label "Scan tracked files for secrets" -Command { node scripts/secret_scan.js }
Invoke-Checked -Label "Build exact release commit" -Command {
  $env:RELEASE_COMMIT_SHA = $ReleaseCommit
  try { npm run build } finally { Remove-Item Env:RELEASE_COMMIT_SHA -ErrorAction SilentlyContinue }
}

if ($CheckOnly) {
  Write-Host ""
  Write-Host "Release checks passed for $ReleaseCommit. No Firebase resources were changed."
  exit 0
}

if ($Production) {
  Invoke-Checked -Label "Deploy changed Functions before preview and Hosting" -Command {
    npx firebase deploy --only functions --project $ExpectedProject
  }
  git diff --quiet HEAD^ HEAD -- firestore.rules
  $RulesChanged = $LASTEXITCODE -ne 0
  if ($RulesChanged) {
    Invoke-Checked -Label "Deploy matching Firestore Rules after Functions" -Command {
      npx firebase deploy --only firestore:rules --project $ExpectedProject
    }
  } else {
    Write-Host "Firestore rules are unchanged in the release commit; rules deployment skipped."
  }
}

$Channel = "release-$($ReleaseCommit.Substring(0, 12))"
Write-Host ""
Write-Host "==> Deploy Hosting preview channel $Channel"
$PreviewJson = & npx firebase hosting:channel:deploy $Channel --only app --project $ExpectedProject --expires 7d --json
if ($LASTEXITCODE -ne 0) { throw "Firebase Hosting preview deployment failed." }
$PreviewText = ($PreviewJson | Out-String)
$PreviewMatches = [regex]::Matches($PreviewText, "https://[^`"'\s]+\.web\.app")
if ($PreviewMatches.Count -eq 0) { throw "Preview deployment succeeded but no preview URL was returned." }
$PreviewUrl = $PreviewMatches[$PreviewMatches.Count - 1].Value
Write-Host "Preview URL: $PreviewUrl"

$SmokeArguments = @("scripts/smoke-release.js", $PreviewUrl, $ReleaseCommit)
if ($Production) { $SmokeArguments += "--verify-callables" }
Invoke-Checked -Label "Smoke-test Hosting preview" -Command { node @SmokeArguments }

if (-not $Production) {
  Write-Host ""
  Write-Host "Preview passed. Production was not requested; no live Hosting deployment occurred."
  Write-Host "Use -Production only after PR checks and required live-account evidence pass."
  exit 0
}

Invoke-Checked -Label "Deploy Hosting production last" -Command {
  npx firebase deploy --only hosting:app --project $ExpectedProject
}
$ProductionUrl = "https://star-strike-rush.web.app"
Invoke-Checked -Label "Verify live Hosting, SHA, headers, private paths, and closed callables" -Command {
  node scripts/smoke-release.js $ProductionUrl $ReleaseCommit --verify-callables
}
Write-Host ""
Write-Host "Production release verified: $ProductionUrl"
