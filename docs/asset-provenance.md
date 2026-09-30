# Character asset provenance

Nico supplied the front and back reference images in this repository and authorized their use in this public prototype on September 29, 2026.

## Meshy pipeline

1. Multi-image generation from the two supplied views, requesting a textured T-pose, bottom origin, and GLB output: `01a0ef95-f24e-776b-aa03-dd978be16571`.
2. Quad remesh to 60,000 target polygons for the rigging limit: `01a0ef98-cdb1-7285-8d8d-a67be20572dc`.
3. Auto-rig at 1.8 m height: `01a0ef9a-b4c2-716a-bb26-be8769bea773`.
4. Final skeletal-animation export: `01a0ef9e-17fc-7720-95cc-fd260d603768`.

The final GLB contains these Meshy library clips:

- `Idle`
- `Casual Walk`
- `Agree Gesture` (shown as Conversation)
- `Sit Cross-legged on Floor` (shown as Sit)

The browser plays the GLB clips through Three.js' skeletal animation mixer. Positioning a walking actor across the stage is intentionally outside this first asset-validation pass.
