import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Matrix4, Vector3, Quaternion } from 'three';
import { readGLB, combineRigClips, encodeGLB } from '../scripts/combine-rig-clips.mjs';
import { repairHands, readAccessor, DIGITS, HAND_CUT } from '../scripts/repair-hands.mjs';
import { addHandFlex } from '../scripts/add-hand-flex.mjs';
const asset = name => new URL(`../assets/character/${name}`, import.meta.url);
const body = combineRigClips(readGLB(asset('user-rigged.glb')), [
  { name: 'Walking', document: readGLB(asset('clips/walking.glb')) },
  { name: 'Running', document: readGLB(asset('clips/running.glb')) },
]);
const geometry = JSON.parse(readFileSync(asset('hand-geometry.json'))), mask = JSON.parse(readFileSync(asset('hand-skin-mask.json')));
const result = repairHands(body, geometry, mask);

test('hand repair preserves source bytes, face/body attributes, textures and all original clips/bone transforms', () => {
  assert.ok(result.bin.subarray(0, body.bin.length).equals(body.bin));
  for (const key of ['images', 'textures', 'animations']) assert.deepEqual(result.json[key], body.json[key]);
  assert.deepEqual(result.json.meshes[0].primitives[0].attributes, body.json.meshes[0].primitives[0].attributes);
  assert.deepEqual(result.json.materials[0], body.json.materials[0]);
  body.json.nodes.forEach((node, i) => {
    for (const key of ['translation', 'rotation', 'scale', 'matrix']) assert.deepEqual(result.json.nodes[i][key], node[key]);
  });
  assert.deepEqual(readAccessor(result, result.json.skins[0].inverseBindMatrices).slice(0, 24), readAccessor(body, body.json.skins[0].inverseBindMatrices));
  assert.ok(encodeGLB(addHandFlex(result)).equals(readFileSync(asset('character-animated.glb'))));
});

test('ten digits have three real joints each, with valid local normalized hand skin weights', () => {
  const { json } = result;
  assert.equal(json.skins[0].joints.length, 54);
  for (const side of ['Left', 'Right']) for (const digit of DIGITS) for (let joint = 1; joint <= 3; joint++) {
    const i = json.nodes.findIndex(n => n.name === `${side}${digit}${joint}`);
    assert.ok(i >= 0 && json.skins[0].joints.includes(i));
    const parent = json.nodes.find(n => n.children?.includes(i));
    assert.equal(parent.name, joint === 1 ? `${side}Hand` : `${side}${digit}${joint - 1}`);
  }
  geometry.weights.forEach(w => assert.ok(Number.isFinite(w) && w >= 0 && w <= 1));
  for (let v = 0; v < geometry.weights.length; v += 4) assert.ok(Math.abs(geometry.weights.slice(v, v + 4).reduce((a, b) => a + b, 0) - 1) < 1e-5);
});

test('hand-only matte vertex colors add subtle surface variation without changing source texture images', () => {
  const p = result.json.meshes[1].primitives[0];
  const colors = readAccessor(result, p.attributes.COLOR_0);
  assert.equal(colors.length, geometry.position.length / 3);
  assert.ok(colors.every(c => c.every(v => Number.isFinite(v) && v >= 0 && v <= 1)));
  assert.ok(new Set(colors.map(c => c.map(v => v.toFixed(4)).join(','))).size > 100);
  assert.deepEqual(result.json.images, body.json.images);
  assert.equal(result.json.materials[p.material].pbrMetallicRoughness.roughnessFactor, 1);
});

test('only distal hand and atlas-classified wrist skin triangles are removed, never head/body or cuff fabric', () => {
  const p = body.json.meshes[0].primitives[0], positions = readAccessor(body, p.attributes.POSITION);
  const old = readAccessor(body, p.indices).flat(), maskIds = new Set(mask.vertices);
  const expected = [];
  for (let i = 0; i < old.length; i += 3) {
    const triangle = old.slice(i, i + 3);
    const distal = triangle.some(v => Math.abs(positions[v][0]) > HAND_CUT);
    const skin = triangle.every(v => Math.abs(positions[v][0]) > mask.minX) && triangle.filter(v => maskIds.has(v)).length >= 2;
    if (!distal && !skin) expected.push(...triangle);
    else triangle.forEach(v => assert.ok(Math.abs(positions[v][0]) > .60));
  }
  assert.deepEqual(readAccessor(result, result.json.meshes[0].primitives[0].indices).flat(), expected);
  assert.equal(result.json.extras.handRepair.removedTriangles, 7074);
  assert.equal(result.json.extras.handRepair.addedTriangles, geometry.indices.length / 3);
  assert.ok(geometry.indices.length / 3 < 25000);
});

test('index joints deform their own hand only and preserve valid rest skin positions', () => {
  const { json } = result, parents = new Map(json.nodes.flatMap((n, i) => (n.children ?? []).map(c => [c, i])));
  const world = (i, bend) => {
    const n = json.nodes[i], r = new Quaternion(...n.rotation ?? [0, 0, 0, 1]);
    if (bend && /^LeftIndex[123]$/.test(n.name)) r.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -.6));
    const m = new Matrix4().compose(new Vector3(...n.translation ?? [0, 0, 0]), r, new Vector3(...n.scale ?? [1, 1, 1]));
    return parents.has(i) ? world(parents.get(i), bend).multiply(m) : m;
  };
  const matrices = bend => readAccessor(result, json.skins[0].inverseBindMatrices).map((a, i) => world(json.skins[0].joints[i], bend).multiply(new Matrix4().fromArray(a)));
  const rest = matrices(false), bend = matrices(true); let changed = 0;
  const p = json.meshes[1].primitives[0];
  const actualJoints = readAccessor(result, p.attributes.JOINTS_0), actualWeights = readAccessor(result, p.attributes.WEIGHTS_0);
  geometry.position.forEach((_, i) => {
    if (i % 3) return;
    const v = i / 3, original = new Vector3(...geometry.position.slice(i, i + 3));
    const transform = matrices => {
      const output = new Vector3();
      for (let j = 0; j < 4; j++) output.addScaledVector(original.clone().applyMatrix4(matrices[actualJoints[v][j]]), actualWeights[v][j]);
      return output;
    };
    assert.ok(transform(rest).distanceTo(original) < .00001);
    const moved = transform(bend).distanceTo(original);
    if (original.x < 0) assert.ok(moved < .00001, 'opposite hand must not move');
    if (moved > .001) changed++;
  });
  assert.ok(changed > 100);
  assert.ok(actualJoints.some((j, i) => j[0] === 14 && actualWeights[i][0] > .3), 'left cuff uses forearm blend');
  assert.ok(actualJoints.some((j, i) => j[0] === 18 && actualWeights[i][0] > .3), 'right cuff uses forearm blend');
});

test('invalid geometry and masks fail before any asset is written', () => {
  const invalid = structuredClone(geometry); invalid.weights[0] = NaN;
  assert.throws(() => repairHands(body, invalid, mask), /skin weights/);
  assert.throws(() => repairHands(body, geometry, { minX: 0, vertices: [] }), /skin mask/);
});
