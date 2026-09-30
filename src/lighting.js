import { ACESFilmicToneMapping, DirectionalLight, HemisphereLight } from 'three';

// Calibrated for the diffuse character: bright studio references are not a
// reason to flood the scene with light and flatten its cream/skin/denim tones.
export const LIGHTING = Object.freeze({ exposure: 1, fillIntensity: 2, keyIntensity: 2.4 });
// Zero bias plus the default 0.5–500 depth range caused the visible face/body
// bands. Keep depth precision around the 1.8 m actor, with a small normal offset
// to prevent a surface comparing against its own quantized shadow depth.
export const CHARACTER_SHADOW = Object.freeze({
  bias: -.0001, normalBias: .02, mapSize: 1024, extent: 3, near: .5, far: 40,
});

export function configureLighting(renderer, scene) {
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHTING.exposure;
  const fill = new HemisphereLight(0xfff5eb, 0x202223, LIGHTING.fillIntensity);
  const key = new DirectionalLight(0xfff0df, LIGHTING.keyIntensity);
  key.position.set(7, 12, 9);
  key.castShadow = true;
  key.shadow.bias = CHARACTER_SHADOW.bias;
  key.shadow.normalBias = CHARACTER_SHADOW.normalBias;
  key.shadow.mapSize.set(CHARACTER_SHADOW.mapSize, CHARACTER_SHADOW.mapSize);
  Object.assign(key.shadow.camera, {
    left: -CHARACTER_SHADOW.extent, right: CHARACTER_SHADOW.extent,
    top: CHARACTER_SHADOW.extent, bottom: -CHARACTER_SHADOW.extent,
    near: CHARACTER_SHADOW.near, far: CHARACTER_SHADOW.far,
  });
  key.shadow.camera.updateProjectionMatrix();
  scene.add(fill, key);
  return { fill, key };
}
