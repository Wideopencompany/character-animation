# Nico's supplied character — remesh and rig

Public route: https://woco.64.23.240.194.sslip.io:8443/shot-planning-animation/

Contract: `docs/feature-contracts/user-character-rig.md`.
Meshy remesh and rig completed for the approved 10 credits. See asset provenance.

## Local acceptance evidence

- Regression: 11/11 tests, server build, `git diff --check` passed. Tests cover
  immutable geometry/skin/texture packaging, actual triangle/joint metadata,
  animation channels, bone hierarchy rejection, texture filtering and clip fallback.
- Source and rigged face compared with identical matte light/camera. Independent
  review accepted identity, with source texture/eyelid limitations and softened
  bake detail documented; no face repainting or new generation.
- Browser: Walking and Running visibly animate different limb poses. Rest pose
  returns to the constant reference pose. Unsupported controls are disabled.
- Run selection survives reload and replays. Fresh console has no warnings/errors.
- Mobile 390×844: content width390, canvas356×669, no horizontal overflow;
  all controls visible. Desktop orbit/zoom works. Viewport override reset.
- Evidence (ignored): `qa/evidence/incoming-character/` source/rig face close-ups,
  `walk-a.jpg`, `walk-b.jpg`, `run.jpg`, `mobile.jpg`.
- Existing Vite >500 kB bundle warning remains. Baked texture quality, finger
  animation, facial animation and navigation are not claimed complete.

## Deployment verification

- Release `/opt/character-animation/releases/20260930T022500Z-user-rig` uploaded
  and byte-compared with local dist (`rsync -anic` empty), atomically switched.
  Rollback retained at `/opt/character-animation/releases/20260930T002534Z-exposure`.
- HTML, JS `index-mq6O0vcb.js`, GLB `character-animated-COPGBb6y.glb` return200.
- Main app remained `/opt/shot-planning/releases/20260930T015230Z-9a34478`
  before/after this deployment; `/shot-planning/` returns200. No Caddy changes.
- Independent final local review: PASS motion/controls/mobile and 11/11 rerun;
  hair still has fine baked texture noise. No elimination-of-shimmer claim.
- Fresh public browser loaded3 clips and the expected new JS bundle. Walk and
  Run selected and visibly changed pose; Run persisted and replayed on reload.
  Console warnings/errors empty. Initial loading selector deadline expired
  while downloading the 18.6 MB asset; later state confirmed full successful load.
- Saved public screenshots: `public-walk.jpg`, `public-after.jpg`. Public tab
  retained as deliverable. Public/browser/reload/integration gates PASS.
