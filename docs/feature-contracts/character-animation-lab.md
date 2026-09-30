# Character Animation Lab

## Outcome

A public, standalone browser lab lets Nico assess a single stylized, rigged character on a 20 m × 20 m grid and play its animation clips before any character system enters Shot Planning App.

## Interaction and visual requirements

- The scene contains only the charcoal platform/grid, one character, a camera orbit, and an animation picker.
- The character stands at the grid origin, is normalized to 1.8 m, and has its origin at the soles of its feet.
- The picker can play `Idle`, `Walk`, `Conversation`, and `Sit` when those clips exist. Switching clips cross-fades rather than snapping.
- If an expected clip or the model is absent, the UI says so plainly and stays usable.
- The selected clip survives reload in the same browser.

## Non-goals

- No Shot Planning App source code, scene editor, shot list, asset library, pathfinding, multi-character interaction, or character-customization UI.
- No baked vertex animation. Runtime animation must use a GLB skeleton and animation clips.

## Data and acceptance

- The generated source model, rigged model, and animated model are recorded as Meshy task metadata. Nico authorized the supplied references and final generated asset for this public prototype.
- `npm test` covers clip selection and saved state.
- `npm run build` passes.
- Browser proof covers model load, one clip switch, missing-clip messaging, and selected-clip persistence after reload.
