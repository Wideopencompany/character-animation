# Matte character shading and lightweight AO

- Outcome: opening the existing prototype shows the same character without
  specular highlights, with subtle occlusion between nearby surfaces.
- Diffuse-only Lambert shading retains color/normal/alpha textures, skinning,
  all four animation clips, stage, camera controls and selected-clip persistence.
- SSAO: 12 samples, half-resolution normals/AO/blur, full-resolution beauty,
  modest 0.25 m radius and 65% composite strength. No asset regeneration/baking.
- Non-goals: hand geometry/finger rig, new animations, pathfinding, new UI controls,
  main Shot Planning app changes.
- Acceptance: unit tests/build; browser screenshots before/after; all clips,
  orbit/zoom, narrow viewport and reload; clean WebGL/browser error log;
  public deployment and unchanged main app route. Independent evidence review.
- Persistence: only existing selected-clip local storage; renderer defaults are
  fixed and apply after reload. Visual regression requires screenshots because
  node tests cannot validate GPU shaders.
