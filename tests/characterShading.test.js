import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture, Vector2, Scene, PerspectiveCamera, SkinnedMesh, Skeleton, Bone, LinearFilter, LinearMipmapLinearFilter, NearestFilter } from 'three';
import { makeMatteMaterial, applyMatteShading, configureCharacterTextures, AO_SETTINGS, aoSize } from '../src/characterShading.js';
import { LightweightAOPass } from '../src/ambientOcclusion.js';

test('matte material has no specular lighting and retains texture/normal/alpha settings', () => {
  const map = new Texture();
  const normalMap = new Texture();
  const emissiveMap = new Texture();
  const source = new MeshStandardMaterial({ color: 0xc87e49, map, normalMap,
    emissive: 0xffffff, emissiveMap, emissiveIntensity: 1,
    normalScale: new Vector2(.7, -.7), transparent: true, opacity: .8, alphaTest: .2 });
  const matte = makeMatteMaterial(source);
  assert.equal(matte.isMeshLambertMaterial, true);
  assert.equal(matte.envMap, null);
  assert.equal(matte.specularMap, null);
  assert.equal(matte.map, map);
  assert.equal(matte.normalMap, normalMap);
  assert.deepEqual(matte.normalScale.toArray(), [.7, -.7]);
  assert.notEqual(matte.normalScale, source.normalScale);
  assert.equal(matte.color.getHex(), source.color.getHex());
  assert.equal(matte.opacity, .8);
  assert.equal(matte.alphaTest, .2);
  assert.equal(matte.emissiveMap, emissiveMap);
  assert.equal(matte.emissiveIntensity, 0);
});

test('character maps retain their images/UVs with trilinear mip filtering and bounded anisotropy', () => {
  const image = { width: 2048, height: 2048 };
  const map = new Texture(image);
  map.minFilter = NearestFilter;
  map.generateMipmaps = false;
  const material = new MeshStandardMaterial({ map, normalMap: map });
  const actor = new Mesh(new BoxGeometry(), [material, material]);
  configureCharacterTextures(actor, 16);
  assert.equal(map.image, image);
  assert.equal(map.minFilter, LinearMipmapLinearFilter);
  assert.equal(map.magFilter, LinearFilter);
  assert.equal(map.generateMipmaps, true);
  assert.equal(map.anisotropy, 8);
  assert.equal(map.version, 1);
  configureCharacterTextures(actor, 4);
  assert.equal(map.anisotropy, 4);
});

test('mesh material arrays/shared materials convert without changing bones or geometry', () => {
  const actor = new Group();
  const original = new MeshStandardMaterial();
  const geometry = new BoxGeometry();
  const mesh = new Mesh(geometry, [original, original]);
  const skinned = new SkinnedMesh(geometry, original);
  const bone = new Bone();
  skinned.add(bone);
  const skeleton = new Skeleton([bone]);
  skinned.bind(skeleton);
  actor.add(mesh);
  actor.add(skinned);
  applyMatteShading(actor);
  assert.equal(skinned.skeleton, skeleton);
  assert.equal(skinned.skeleton.bones[0], bone);
  assert.equal(skinned.material, mesh.material[0]);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material[0], mesh.material[1]);
  assert.equal(mesh.material[0].isMeshLambertMaterial, true);
  assert.equal(mesh.castShadow, true);
  assert.equal(mesh.receiveShadow, true);
});

test('AO uses 12 samples and half-resolution buffers, clamped for tiny viewports', () => {
  assert.equal(AO_SETTINGS.samples, 12);
  assert.deepEqual(aoSize(1200, 800), [600, 400]);
  assert.deepEqual(aoSize(1, 0), [1, 1]);
  const pass = new LightweightAOPass(new Scene(), new PerspectiveCamera());
  try {
    pass.setSize(780, 1688);
    assert.equal(pass.kernel.length, 12);
    for (const target of [pass.normalRenderTarget, pass.ssaoRenderTarget, pass.blurRenderTarget]) {
      assert.deepEqual([target.width, target.height], [390, 844]);
    }
    assert.equal(pass.copyMaterial.uniforms.aoStrength.value, .65);
    assert.match(pass.copyMaterial.fragmentShader, /mix\(vec3\(1.0\), ao, aoStrength\)/);
  } finally { pass.dispose(); }
});
