# Repair fused character fingers

Contract: `docs/feature-contracts/finger-repair.md`.
Route: https://woco.64.23.240.194.sslip.io:8443/shot-planning-animation/

Both original hand meshes fused four fingers into paddles; body rig had no
finger joints. Replaced hands locally with rounded five-digit hands and added
30 joints (three per digit). Sampled original skin color; preserve body, face,
cloth/texture images, all original joint transforms and clip data. No Meshy calls.

First local geometry rejected independently for cuff gaps and assembled seams.
Voxel union/smoothing/reduction, wrist extension, skin-only atlas mask and
forearm/hand wrist blend address those defects. Close-up review then PASS.

| Criterion | Action / result | Reload | Status |
| --- | --- | --- | --- |
| Build | 17/17 tests; character package rebuild; server build; diff-check. Existing >500 kB JS bundle warning only. | Reproducible GLB bytes checked. | PASS |
| Asset regression | Original binary prefix, textures, original body attributes/TRS/inverse-bind matrices and clips preserved; only approved hand/wrist-skin faces removed; 54 joints, finite normalized weights. | Current GLB exact deterministic rebuild. | PASS |
| Digit behavior | Two five-digit silhouettes; independent index bend stays connected, other hand unaffected. CPU skin test and close-up browser diagnostic. | Same geometry reload. | PASS |
| Local flows | Rest pose / Walk / Run render; wrists follow cuffs, ground shadows/AO retained. Browser warning/error console empty. | Rest pose persists and replays after reload. | PASS |

Generated evidence (ignored): `qa/evidence/fingers/left-before.jpg`,
`right-before.jpg`, `left-top.jpg`, `right-top.jpg`, `left-bend-finished.jpg`,
`walk-close-final.jpg`, `run-close-final.jpg`, `walk.jpg`, `run.jpg`, `rest.jpg`.
Small fingertip angularity accepted for prototype; no nails/realistic crease
detail or new gesture animation clips are claimed.

Independent final review: PASS on the corrected Walk/Run close-ups and full-body
Rest/Walk/Run frames. No remaining wrist gaps or protruding skin patches; simple
smooth hands accepted for this prototype.

Public verification: PASS. Fresh browser loaded three clips from
`assets/index-CR43PWGn.js`; Rest pose, Walk and Run selected and rendered.
Run selection survived reload, and warning/error console was empty. Saved
`qa/evidence/fingers/public-after.jpg` and `public-run.jpg`.

Published release: `/opt/character-animation/releases/20260930T023017Z-fingers`.
Rollback retained: `/opt/character-animation/releases/20260930T021136Z-shadow-fix`.
Uploaded build matched local dist before atomic symlink switch. Public JS and
`assets/character-animated-QgB6nFtV.glb` returned HTTP 200; GLB size 21,670,716
bytes. Separate main app remained on
`/opt/shot-planning/releases/20260930T021741Z-a1e8940` before/after publication
and returned HTTP 200. No main-app changes or additional Meshy credits.
