# Remove character shadow banding

- Outcome: opening the lab and selecting Rest pose / Walk / Run shows a clean
  face and body without the self-shadow bands reported as moire.
- Diagnose separately: shadow acne versus baked high-frequency hair/cloth
  texture. Existing local A/B showed face bands vanish with shadow bias; AO off
  alone does not remove them.
- Preserve the accepted character, textures, rig/clips, matte shading, exposure,
  lightweight AO, grid, camera and saved clip selection. No Meshy calls/credits.
- Tune shadow bias/normal bias and use a bounded shadow camera and modest map
  resolution. Retain attached feet/contact shadows without obvious light leaks.
- Acceptance: deterministic shadow settings regression, full test/build, local
  and public browser Rest pose/Walk/Run screenshots, reload selection and console,
  independent visual review, verify isolated public release/main app unchanged.
- Remaining baked texture detail is not claimed completely shimmer-free.
