# First Flight Onboarding Design

## Product intent

First Flight is a four-to-six-minute playable certification flight. It begins
with one short Colonel Vega transmission, moves immediately into ship control,
teaches only mechanics the player is using, and ends with an optional identity
offer. It is not a help screen and it never becomes a source of gameplay
progress.

The player verbs are positioning, automatic fire, threat avoidance, Ghost
Shift, powerup collection, boss-window recognition, and Wraith Realm Hop. The
center and lower-middle playfield remain clear while those verbs are active.

## Canonical mechanic contract

- The fighter fires automatically every 14 simulation frames, or every 10
  frames under Rapid Fire. The player never receives a fire button.
- Normal Ghost Shift costs 35 energy, uses the current movement vector, applies
  the real burst, gives 18 frames of phasing and 24 frames of protection, and
  uses the normal cooldown.
- During a Wraith encounter, the same action becomes Realm Hop. It costs 18
  energy, changes `state.playerRealm`, and has no cooldown or movement burst.
- Physical and ghost Wraith projectiles collide only when their `realm` equals
  the player's current realm.
- Player shots inherit the player's realm. The Wraith takes damage only when
  the shot kind matches the Wraith realm and normal boss staging has completed.
- Standard and Wraith bosses remain invulnerable until `entered` and
  `combatActive` are both true.
- The normal pause-health policy stays intact. Tutorial pause adds training
  recovery actions but does not create a free production pause path.

The director observes these real state changes. It does not award success from
a timer or substitute a tutorial-only animation for an ability.

## Architecture

The implementation keeps the ordered-script Canvas architecture and adds three
explicit boundaries:

1. `00-onboarding-state.js` is a pure persistence and routing module. It
   sanitizes versioned local state, detects meaningful existing progress,
   chooses first-launch/resume/availability routing, and exposes prompt
   selection for keyboard, touch, pen, and hybrid input.
2. `07-tutorial-director.js` is the only owner of tutorial sequencing,
   deterministic spawn plans, checkpoints, objective progress, dialogue state,
   recovery, and graduation. The run declares `state.runMode = "tutorial"`.
3. Tutorial presentation is rendered from director snapshots. Canvas owns the
   hologram, training-space art, hazards, indicators, and objective chip. A
   small semantic DOM layer owns the live region and accessible Continue, Skip,
   Resume, and Restart Checkpoint actions.

No tutorial step state is stored as unrelated global booleans. Ordinary Play
and First Flight both call the same time-based launch-transition model.

## First-launch detection and persistence

Storage key: `star_strike_rush_onboarding_v1`.

Persisted fields:

- `schemaVersion`
- `tutorialVersion`
- `status`: `unseen`, `in_progress`, `completed`, or `skipped`
- `checkpoint`
- `startedAtMs`
- `updatedAtMs`
- `completedAtMs`
- `existingPlayerOfferDismissed`
- `accountOfferShown`
- `codexGraduationApplied`

A player is new only when onboarding state is absent and all meaningful
progress indicators are empty: high score, lifetime runs/score/kills/bosses,
Glory, Season XP, Credits, claimed rewards, local achievements, and Codex
discovery. New players enter the incoming-transmission screen automatically.

Existing players remain on the title and receive one quiet
`FIRST FLIGHT TRAINING IS NOW AVAILABLE` invitation with Start Training and
Later. In-progress players receive Resume Training, Restart Training, and Skip
for Now. Completion and skip remain replayable from Pilot Dossier > Settings.
Reset Local Data deliberately does not remove onboarding state.

## Tutorial state machine

Every step has an ID, objective text, input-aware glyph, entry operation,
completion predicate, hint escalation, deterministic spawn plan, recovery
checkpoint, and next step. Timers control presentation cadence only.

| Order | Step | Action-gated completion |
| --- | --- | --- |
| 0 | `incoming` | Player begins or skips after the Colonel identifies the local call sign. |
| 1 | `lightspeed` | The shared time-based launch reaches arrival. |
| 2 | `movement` | Player enters three sequential beacon collision radii. |
| 3 | `auto_weapons` | Three slow training drones are destroyed by real automatic shots. |
| 4 | `evasion` | Player crosses the telegraphed danger area without relying on a timeout. A hit never restarts the whole tutorial. |
| 5 | `ghost_shift` | A real Ghost Shift is used and the fighter crosses the marked danger lane while phased. |
| 6 | `powerup` | The player collides with one intentionally placed Phase Shield. |
| 7 | `controlled_wave` | Two deterministic early-enemy waves are cleared. |
| 8 | `command_boss` | A staged standard boss at 25% normal HP is defeated through normal collision and damage rules. |
| 9 | `wraith_briefing` | The two-realm explanation is acknowledged while combat is safely frozen. |
| 10 | `realm_practice` | One real Realm Hop, one realm-specific avoidance, and one matching-realm state are observed. |
| 11 | `wraith_boss` | A staged Wraith at 22% normal HP is defeated after a hop and matching-realm damage. |
| 12 | `graduation` | Hostiles are cleared, completion is persisted, and the player advances to the optional identity offer. |

Checkpoints are persisted after movement, Ghost Shift, before Command Ship,
before the Wraith lesson, before the Wraith boss, and graduation. Resume maps a
checkpoint to the earliest safe step that reconstructs all required state.

## Deterministic encounters

Training drones use existing early-enemy rendering and collision with isolated
low HP and fixed paths. The director disables normal wave selection, dynamic
difficulty changes, random debris, random powerups, and unrelated hazards while
`runMode` is `tutorial`.

The Command Ship override changes only max HP, attack sequence, warning length,
and add-spawning policy on the tutorial instance. Normal spawn formulas remain
unchanged. The tutorial instance stages visibly, then alternates a generous
aimed volley with one readable fan.

The Wraith override changes only instance HP, realm-shift schedule, reaction
windows, and attack selection. It begins physical, requires a director-observed
Realm Hop, presents one labeled realm-specific threat, and changes realm on a fixed
sequence. The same shot-kind, realm, staging, and collision rules used by normal
play decide damage.

Tutorial death invokes emergency recovery: clear hazards, restore health and
energy, apply a short visible recovery shield, reconstruct the checkpoint, and
continue. It never invokes normal Game Over.

## Colonel Vega and dialogue

Colonel Vega is an original procedural Canvas hologram: a helmet/high-collar
silhouette, restrained rank bars, cyan communication lines, limited amber
warning accents, and low-amplitude scan noise. Its source is the renderer; no
external portrait or training media is used.

Transmission cards contain the speaker label, at most two short lines, and a
 restrained type reveal. First confirm reveals the complete text; second
confirm advances. Enter, Space, pointer, and accessible DOM buttons are
equivalent. Reduced Motion makes text immediate and removes scan motion.
Effects-enabled transmissions use short procedural radio chirps.

Representative final copy:

- “Cadet, weapons track automatically. Your job is positioning.”
- “Good. Cross the danger lane with Ghost Shift.”
- “The Wraith occupies two realities. Match its realm before you fire.”
- “Flight certification confirmed, {CALL_SIGN}. Command will remember this.”

Transmission placement moves above the player on desktop and to an upper safe
edge on touch layouts. It never overlaps the joystick, action control, health,
energy, pause, or a live critical threat.

## Active objective and controls

The objective chip uses a short verb, optional literal progress such as `2 / 3`,
and a control hint selected from the last meaningful input:

- keyboard: `WASD / ARROWS`, `SPACE / SHIFT / E`
- touch: `VIRTUAL STICK`, `GHOST CONTROL`
- pen: touch-style controls with `PEN` labeling
- pointer/hybrid: preserve the last gameplay-capable mode until a meaningful
  keyboard, touch, or pen input occurs

Input switching updates the chip immediately and ignores incidental mouse
movement. Inactivity adds one restrained beacon pulse and a secondary hint;
there is no failure copy.

Realm instructions include icon shape and text (`PHYSICAL` / `GHOST`) as well
as color. Current player and Wraith realms are shown together.

## Lightspeed transition

The transition is time-based, not frame-count based. Normal duration is 1.5
seconds:

- lock-in, 0–20%: controls stop accepting input, title UI retracts, traffic
  fades, and the title fighter becomes the focal ship;
- acceleration, 20–62%: camera push, depth-separated stars, engine plume, and
  title-music fade;
- lightspeed, 62–84%: directional streaks converge on a stable vanishing point
  with capped cyan bloom;
- arrival, 84–100%: streaks compress, gameplay resolves, the visible ship
  position becomes the player position, and controls/objective fade in.

At 30, 60, 90, and 120 Hz the elapsed-second model reaches the same stage at the
same wall-clock time. Focus loss freezes progression safely. Reduced Motion
uses a 0.42-second crossfade/scale with no long streaks; Reduced Flash caps bloom
and never draws a pure-white full-screen wipe. Audio failure cannot delay
arrival.

## Graduation, Codex, and identity

Graduation marks onboarding complete before opening the debrief. No standard
achievement is added; the canonical catalog remains exactly 79 entries.

On first completion only, the tutorial reveals the exact entities it taught:
red/orange training fighters, Command Ship, and Wraith Sovereign. Ordinary
Codex discovery is suppressed during training, and `codexGraduationApplied`
makes the completion reveal idempotent.

The post-flight sequence is optional:

1. Confirm or edit the current call sign.
2. Connect Google or continue as a device pilot, with explicit text that Google
   secures public identity and the legacy account archive while gameplay
   progress stays on this device.
3. If signed in, optionally claim one public account-bound `@handle`.
4. Enter Hangar.

Firebase absence produces a quiet status and never blocks Enter Hangar. A
player who skips gets one Account-control pulse, not repeated prompts. Replays
return directly to title and do not reopen account setup.

## No-progression contract

`tutorial` is a non-record run mode alongside `debug`. During training:

- high score and dirty-record state cannot change or save;
- `applyRunMetaProgress`, normal achievement finalization, normal Codex
  discovery, difficulty sampling, and normal Game Over are bypassed;
- score and kill counters are tutorial-local objective data only;
- no recent receipt is created;
- `submitRunReceipt`, `joinWeeklyLeague`, and `claimSeasonReward` are never
  called;
- Glory, Season XP, Credits, lifetime statistics, claimed rewards, account
  archive, public records, and the 79 achievement IDs remain unchanged.

The director snapshots progression-bearing storage on entry and exposes
development assertions so browser tests compare the same values after
graduation, reload, skip, and recovery.

## Development and production boundary

Localhost builds support `?debug=1&scenario=tutorial` and named tutorial steps.
The existing build removes the entire marked development block, so those
scenario routes and state-changing helpers are inaccessible in production.
The debug snapshot adds only read-only onboarding/director/layout/progression
evidence and transition timing.

## Test plan

- Pure contract tests cover detection, state sanitization, checkpoint mapping,
  skip/replay, step order, action gates, spawn determinism, prompt selection,
  boss override isolation, Wraith predicates, no-progression policy, launch
  timing, reduced-motion timing, and the unchanged 79-entry catalog.
- Chromium flows complete fresh desktop and touch training through real
  movement, shooting, ability, pickup, boss, realm, recovery, graduation,
  resume, skip, replay, account-skip, and Firebase-unavailable paths.
- Accessibility tests inspect live-region text, accessible actions, focus,
  keyboard confirmation, non-color realm labels, instant reduced-motion text,
  and mobile type size.
- Asserted visual QA captures the incoming transmission, every major lesson,
  both bosses, realm indicators, graduation, identity offer, lightspeed on
  desktop/mobile/reduced motion, and resumed checkpoints. It checks bounds,
  control clearance, state, duration, title removal, and arrival continuity.

## Self-review and resolved risks

- **Vague objectives:** every lesson names one observable player action and one
  completion predicate.
- **Softlocks:** required energy and health are restored at entry; required
  entities are deterministic; checkpoint restart reconstructs state; inactivity
  changes hints, not completion.
- **Progression contradiction:** tutorial objectives use director counters and
  never normal receipts or achievements.
- **Dialogue length:** copy is limited to two short lines and disappears during
  combined waves.
- **Obstruction:** dialogue freezes or slows only safe training states; live
  combat uses the edge objective chip.
- **Touch/desktop drift:** prompts use last meaningful input rather than
  viewport width; visual assertions cover both control layouts.
- **Replay/interruption:** replay does not erase prior completion until it
  begins, resume starts from a safe checkpoint, and replay graduation returns
  directly to title.
- **Boss mechanic drift:** tutorial overrides are instance configuration only;
  staging, shot collision, realm collision, and ability functions stay
  canonical.
- **Skip abuse:** skip changes onboarding status only and grants no Codex,
  score, achievement, reward, or account state.
