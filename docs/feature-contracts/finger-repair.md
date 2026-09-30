# Repair fused fingers

- Outcome: character has two clean stylized hands with five separated digits,
  relaxed fingers during Walk/Run, and real finger joints for later gestures.
- Confirmed source defect: four fingers fused into a paddle in both hands;
  24-joint Meshy rig has LeftHand/RightHand only, no finger joints.
- Rebuild hands locally; no full-character generation, Meshy costs or external
  model uploads. Preserve immutable source/current accepted model in Git.
- Preserve face/body/sleeves and existing animation data. New joints must inherit
  the original hand motion. Wrist seam must stay inside/at the existing cuff.
- Local preview first; reject unnatural silhouettes, sleeve clipping, wrist
  gaps or finger collapse before deploying. No new unrequested UI controls.
- Tests: 5 digits / 3 joints each per hand, normalized finite skin weights,
  original body joint/clip transforms preserved, only distal hand indices removed,
  fingers bend independently in local diagnostic, Rest pose/Walk/Run browser
  flows and reload, console, full build/tests, independent visual review.
- Required evidence: both close-up hands, relaxed and bend diagnostics, body
  and moving clips, public release isolation and screenshots.
