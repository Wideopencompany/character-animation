# Restore reference color / avoid washed-out character

User feedback: the matte character is overexposed versus the supplied front
reference. On opening the viewer, the sweater should read cream with tonal
detail, skin peach, hair copper and jeans blue rather than pale washed-out tones.

- Disable the exported human asset's full-strength emissive texture contribution
  (emissiveFactor [1,1,1], emissiveTexture0); retain texture data. Reduce excessive
  hemisphere and directional light; calibrate ACES exposure.
- Retain diffuse-only/no-specular shading, half-resolution AO, original textures,
  geometry, rig, animations, grid, camera and selected-clip storage.
- No new UI, assets, texture repainting or hand/rig changes. The Meshy asset is
  not an exact replica of the reference; do not claim missing knit/geometry
  details are recovered by exposure alone.
- Acceptance: before/after screenshot against the supplied reference;
  independent visual/code review; focused light/material tests and build;
  all four clips, reload persistence, public bundle/assets and clean console.
- Regression: calibrated settings tested; visual comparison documented because
  numeric light settings alone cannot certify likeness to a raster reference.
