# Self-shadow banding correction

Contract: `docs/feature-contracts/shadow-artifact-fix.md`.
Route: https://woco.64.23.240.194.sslip.io:8443/shot-planning-animation/

Cause: zero shadow bias/normal bias, default 512 map and .5–500 shadow depth
range caused face/body self-shadow acne. Shadow-only A/B reproduced the bands;
normal offset removed them without texture/geometry changes.

Fix: bias -.0001, normalBias .02 m, map1024, bounded ±3 m orthographic camera,
near .5 / far40. Matte/exposure/AO/rig/GLB unchanged. No Meshy calls or credits.

| Criterion | Action / result | Reload | Status |
| --- | --- | --- | --- |
| Build/regression | 12/12 tests; server build; diff check. Dedicated test protects depth range, bias and map budget. Existing bundle-size warning only. | Defaults tested. | PASS |
| Local visual | Source failure `qa/evidence/incoming-character/face-shadow-default.jpg` versus tuned shadows+AO `qa/evidence/shadow-fix/face-after.jpg`. Face bands gone; some baked hair texture noise remains. | Fresh browser. | PASS |
| Local behavior | Walk/Run distinct limb motion; floor shadow retained. Console error/warn empty. | Run restored and replayed. | PASS |
| Asset preservation | No GLB, rig, texture or animation file modifications. | Same asset hash/name. | PASS |

Independent reviewer: PASS continuous face shading, preserved knit detail,
contact shadows without conspicuous detachment/leaks/tearing. Focused lighting
test rerun 2/2 passed. Source hair texture noise remains. Evidence caption now
states tuned production bias, rather than the stale default label.

| Criterion | Action / result | Reload | Status |
| --- | --- | --- | --- |
| Public integration | Uploaded release `/opt/character-animation/releases/20260930T021136Z-shadow-fix`, `rsync -anic` comparison empty, atomic symlink switch. Browser DOM loads `index-ClnIH9-n.js`; JS returns200. | Fresh public tab. | PASS |
| Public behavior | Rest pose / Walk / Run selected and rendered, face bands absent, ground shadows retained. Error/warn console empty. | Walk persisted and replayed after reload. | PASS |
| Isolation | Main symlink stays `/opt/shot-planning/releases/20260930T015230Z-9a34478`; main route returns200. Caddy unchanged. Rollback lab release retained at `/opt/character-animation/releases/20260930T022500Z-user-rig`. | Before/after checked. | PASS |

Public evidence: `qa/evidence/shadow-fix/public-walk.jpg`, `public-run.jpg`.

Generated evidence is ignored under `qa/evidence/shadow-fix/`.
Remaining source texture noise is not claimed eliminated; this regression targets
the confirmed self-shadow banding defect.
