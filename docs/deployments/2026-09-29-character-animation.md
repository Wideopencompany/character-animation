# Character Animation public deployment — 29 September 2026

- Public URL: `https://woco.64.23.240.194.sslip.io:8443/shot-planning-animation/`
- Route: `/shot-planning-animation/`
- Immutable release: `/opt/character-animation/releases/20260930T000438Z/`
- Active path: `/opt/character-animation/current`
- The existing `/shot-planning/` Caddy route was preserved. The Caddy configuration was backed up before adding the dedicated character-lab route.

| Criterion | Action performed | Observed result | Persistence / reload result | Status |
| --- | --- | --- | --- | --- |
| Build | Ran `npm test` and `npm run build:server` | 2/2 tests passed; production build completed and included the 10.5 MB animated GLB | — | PASS |
| Source asset | Generated from supplied front/back references, remeshed, auto-rigged, and exported with four skeletal clips | GLB loaded as a 1.8 m character on the 20 × 20 m stage | — | PASS |
| Public load | Requested HTML, JavaScript, and animated GLB from the public route | Each returned HTTP 200; GLB served as `model/gltf-binary` | Fresh public browser session loaded four clips | PASS |
| Clip interaction | Played Idle, Walk, Conversation, and floor Sit in browser | Each control selected a Meshy animation clip; Walk played `Casual_Walk` | Walk remained selected and replayed after a browser reload | PASS |
| Visual review | Reviewed public 3D scene at desktop size | Character remains legible against the grid; floor sit does not assume an invisible chair | — | PASS |

The Vite build retains its non-blocking warning about a JavaScript chunk above 500 kB. The GLB is intentionally bundled for this single-character prototype.
