import { ACESFilmicToneMapping, DirectionalLight, HemisphereLight } from 'three';

// Calibrated for the diffuse character: bright studio references are not a
// reason to flood the scene with light and flatten its cream/skin/denim tones.
export const LIGHTING = Object.freeze({ exposure: 1, fillIntensity: 2, keyIntensity: 2.4 });

export function configureLighting(renderer, scene) {
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHTING.exposure;
  const fill = new HemisphereLight(0xfff5eb, 0x202223, LIGHTING.fillIntensity);
  const key = new DirectionalLight(0xfff0df, LIGHTING.keyIntensity);
  key.position.set(7, 12, 9);
  key.castShadow = true;
  scene.add(fill, key);
  return { fill, key };
}
