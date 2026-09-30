# Character asset provenance

Nico supplied the front and back reference images in this repository and authorized their use in this public prototype on September 29, 2026.

## Current character — Nico's supplied T-pose

### Local finger repair

Nico requested finger repair after the body rig. Both original hands had fused
fingers. The current GLB replaces those surfaces with two locally modeled,
rounded five-digit hands, with three joints per digit (30 added, 54 total).
The original 24 body joint transforms, inverse bind matrices, all three clip
channels and source binary bytes remain preserved. Only distal hand / sampled
wrist-skin triangles are removed from the original mesh's visible index list.
Face, body, clothing UVs and texture images are unchanged.

Hand geometry is finished via Blender voxel union, smoothing and reduction;
`hand-geometry.json` preserves the accepted result. `hand-skin-mask.json` classifies
wrist skin from the original atlas so clothing is not removed along with it.
Hand material color uses median original hand base-color texels. New wrists
blend ForeArm/Hand skin weights to follow existing cuffs during Walk/Run.

Second hand revision responds to Nico's report that the first repair was not
visibly convincing. Narrower rounded palm, thumb mound, varied knuckle line,
tapered finger lengths, relaxed arc and subtle matte nail/knuckle vertex colors
replace the first flat comb-like silhouette. Hand geometry: 19,284 triangles.
Total: 202,421 visible triangles; original body/face/cloth data remain unchanged.

Reproduce current GLB: `npm run build:character`. Input source rig and clips
remain immutable; repair scripts reject invalid hand-only geometry, masks and
weights. No Meshy costs. `scripts/add-hand-flex.mjs` appends a real five-second
`Hand flex` clip with 30 nonconstant finger rotation channels and original
constant body rest channels, preserving the original three clips byte-for-byte.
Selecting Hand flex automatically frames the left hand; orbit/close zoom now
allow inspection. Selection and close-up framing work after reload. Switching
back to Rest/Walk/Run restores full-body framing and finger rest transforms.
This is a stylized hand-flex inspection action, not a restored Conversation.
Idle, Conversation and Sit remain missing from this character.

### Meshy body rig preceding finger repair

Nico supplied `Meshy_AI_Cozy_Redhead_Characte_0930014355_texture.glb` and
approved remesh + rig for 10 Meshy credits. This replaces the generated character
below; it is not a newly generated interpretation of the reference images.

- Immutable source: `assets/character/user-source-tpose.glb`, 716,736 triangles,
  no skin or animation. SHA256:
  `8cd093191f71f41fc53bbd0e7e4c815a8c6f6bfc5a5a119bf227547df91a557f`.
- Remesh task `01a0efff-7f11-70e9-b95a-4e96c8fe4da7`: triangle topology,
  200,000 target triangles, actual 204,860, 1.8 m / bottom origin; 5 credits.
- Rig task `01a0f002-89d2-7142-aca1-9621eef6b13a`: succeeded, 190,211 triangles,
  24 joints, 5 credits. Includes free Walking and Running clips.
- Final `character-animated.glb` keeps the rigged geometry, skin, materials and
  embedded texture bytes intact. `scripts/combine-rig-clips.mjs` adds only clip
  data after checking bone names, rest transforms and hierarchy compatibility.
  The rig's constant reference clip is labeled `Rest pose`, not `Idle`.
- Active clips: Rest pose, Walking, Running. Idle, Conversation and Sit are
  disabled because this replacement does not yet include those actions.
- Source/remesh/rig close-ups reviewed independently: identity and texture
  alignment accepted, with softened surface detail from remesh/baking.
  Existing eyelid and baked high-frequency texture imperfections remain.
- Runtime retains diffuse-only shading, zero emission and inexpensive AO.
  Trilinear mipmaps / anisotropy capped at 8 reduce texture minification aliasing;
  they do not remove artifacts already present in the source texture.
- The Meshy output itself is a body rig with no individual finger bones or
  facial controls. The local repair above adds finger joints. Walk/run still
  play in place; grid navigation is not implemented.
- Balance verified after completion: 1,706 (previously 1,716). No retexture,
  new generation, or paid custom animation was performed in this replacement.

## Previous generated character (retained in Git history)

1. Multi-image generation from the two supplied views, requesting a textured T-pose, bottom origin, and GLB output: `01a0ef95-f24e-776b-aa03-dd978be16571`.
2. Quad remesh to 60,000 target polygons for the rigging limit: `01a0ef98-cdb1-7285-8d8d-a67be20572dc`.
3. Auto-rig at 1.8 m height: `01a0ef9a-b4c2-716a-bb26-be8769bea773`.
4. Final skeletal-animation export: `01a0ef9e-17fc-7720-95cc-fd260d603768`.

The previous GLB contained these Meshy library clips:

- `Idle`
- `Casual Walk`
- `Agree Gesture` (shown as Conversation)
- `Sit Cross-legged on Floor` (shown as Sit)

The browser plays the GLB clips through Three.js' skeletal animation mixer. Positioning a walking actor across the stage is intentionally outside this first asset-validation pass.
