import { MeshLambertMaterial } from 'three';

// Diffuse-only lighting: increasing roughness alone still leaves specular.
export function makeMatteMaterial(source) {
  const matte = new MeshLambertMaterial();
  const preserved = [
    'name', 'color', 'map', 'normalMap', 'normalMapType', 'normalScale',
    'bumpMap', 'bumpScale', 'aoMap', 'aoMapIntensity', 'lightMap',
    'lightMapIntensity', 'emissive', 'emissiveMap', 'emissiveIntensity',
    'alphaMap', 'alphaTest', 'transparent', 'opacity', 'side',
    'depthWrite', 'depthTest', 'vertexColors', 'flatShading', 'toneMapped',
  ];
  for (const key of preserved) {
    if (source[key] === undefined) continue;
    if (matte[key]?.copy) matte[key].copy(source[key]);
    else matte[key] = source[key];
  }
  return matte;
}

export function applyMatteShading(actor) {
  const materials = new Map();
  const convert = (source) => {
    if (!materials.has(source)) materials.set(source, makeMatteMaterial(source));
    return materials.get(source);
  };
  actor.traverse((node) => {
    if (!node.isMesh) return;
    node.material = Array.isArray(node.material)
      ? node.material.map(convert) : convert(node.material);
    node.castShadow = true;
    node.receiveShadow = true;
  });
  for (const source of materials.keys()) source.dispose();
}

export const AO_SETTINGS = Object.freeze({
  resolutionScale: .5,
  samples: 12,
  radius: .25,
  minDistance: .00005,
  maxDistance: .004,
  strength: .65,
});

export function aoSize(width, height) {
  return [Math.max(1, Math.round(width * AO_SETTINGS.resolutionScale)),
    Math.max(1, Math.round(height * AO_SETTINGS.resolutionScale))];
}
