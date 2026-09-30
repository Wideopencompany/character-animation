import test from 'node:test';
import assert from 'node:assert/strict';
import { readGLB, combineRigClips, encodeGLB, isConstantPose } from '../scripts/combine-rig-clips.mjs';
const base = readGLB(new URL('../assets/character/user-rigged.glb', import.meta.url));
const walk = readGLB(new URL('../assets/character/clips/walking.glb', import.meta.url));
const run = readGLB(new URL('../assets/character/clips/running.glb', import.meta.url));

test('packaging preserves every original geometry/skin/texture byte and adds bone clips only', () => {
  const output = combineRigClips(base, [{ name: 'Walking', document: walk }, { name: 'Running', document: run }]);
  for (const key of ['meshes', 'skins', 'nodes', 'images', 'textures', 'materials']) {
    assert.deepEqual(output.json[key], base.json[key]);
  }
  assert.ok(output.bin.subarray(0, base.bin.length).equals(base.bin));
  assert.deepEqual(output.json.animations.map((a) => a.name), ['Rest pose', 'Walking', 'Running']);
  assert.equal(isConstantPose(base, base.json.animations[0]), true);
  assert.equal(isConstantPose(walk, walk.json.animations[0]), false);
  assert.equal(isConstantPose(run, run.json.animations[0]), false);
  for (const animation of output.json.animations) {
    assert.equal(animation.channels.length, 72);
    for (const channel of animation.channels) assert.ok(output.json.nodes[channel.target.node]);
  }
  const bytes = encodeGLB(output);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
});

test('incompatible bone names, root scaling and hierarchy are rejected rather than silently retargeted', () => {
  const renamed = { json: structuredClone(walk.json), bin: walk.bin };
  renamed.json.nodes.find((node) => node.name === 'Hips').name = 'UnknownHips';
  assert.throws(() => combineRigClips(base, [{ name: 'Walking', document: renamed }]), /Missing target node/);
  const scaled = { json: structuredClone(walk.json), bin: walk.bin };
  scaled.json.nodes.find((node) => node.name === 'Armature').scale[0] *= 2;
  assert.throws(() => combineRigClips(base, [{ name: 'Walking', document: scaled }]), /Incompatible rest transform/);
  const hierarchy = { json: structuredClone(walk.json), bin: walk.bin };
  const hipsIndex = hierarchy.json.nodes.findIndex((node) => node.name === 'Hips');
  hierarchy.json.nodes.forEach((node) => { if (node.children) node.children = node.children.filter((id) => id !== hipsIndex); });
  assert.throws(() => combineRigClips(base, [{ name: 'Walking', document: hierarchy }]), /Incompatible hierarchy/);
});

test('deployed character is the approved rig with supported clips and vertex skin weights', () => {
  const { json } = readGLB(new URL('../assets/character/character-animated.glb', import.meta.url));
  const primitives = json.meshes.flatMap((mesh) => mesh.primitives);
  const count = primitives.reduce((n, primitive) => n + json.accessors[primitive.indices].count / 3, 0);
  assert.equal(count, 190211 - json.extras.handRepair.removedTriangles + json.extras.handRepair.addedTriangles);
  assert.ok(count <= 300000);
  assert.equal(json.skins[0].joints.length, 54);
  for (const primitive of primitives) {
    assert.ok(primitive.attributes.JOINTS_0 !== undefined);
    assert.ok(primitive.attributes.WEIGHTS_0 !== undefined);
  }
  assert.deepEqual(json.animations.map((clip) => clip.name), ['Rest pose', 'Walking', 'Running', 'Hand flex']);
});
