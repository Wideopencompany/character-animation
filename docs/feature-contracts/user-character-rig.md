# Rig Nico's supplied T-pose character

- Source: Meshy_AI_Cozy_Redhead_Characte_0930014355_texture.glb supplied29Sep2026,
  716,736 triangles, T-pose visually inspected, no skin/animations.
- Nico approved10 Meshy credits: remesh5 then rig5 (includes walk/run). No new
  generation/retexture/custom-animation expenditure. Use GLB for the web lab.
- Preserve immutable original and compare face before/after remesh and rig.
  Stop if facial identity or texture alignment changes materially.
- Target200k triangles rather than aggressive60k; verify actual count≤300k
  before rigging. Target height1.8m, foot origin. Preserve source textures.
- Replace the public prototype's old character with this asset; retain matte
  shading, calibrated lighting, AO, grid/orbit, selected-clip persistence.
- Show only supported animation behavior. Walk/run work; existing unavailable
  conversation/sit must not masquerade as completed actions. No pathfinding.
- Address texture sampling conservatively (mipmap/trilinear/anisotropy), without
  repainting or modifying face. Judge motion/shimmer at practical zoom levels;
  do not promise all baked high-frequency texture aliasing is eliminated.
- Gates: GLB geometry/skin/clip metadata, before/after screenshots and independent
  acceptance review, browser clips/reload/console/mobile, regression tests/build,
  verified public deployment while main /shot-planning/ remains unchanged.
