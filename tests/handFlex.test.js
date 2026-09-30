import test from 'node:test';
import assert from 'node:assert/strict';
import { readGLB, isConstantPose } from '../scripts/combine-rig-clips.mjs';
import { readAccessor } from '../scripts/repair-hands.mjs';
import { addHandFlex } from '../scripts/add-hand-flex.mjs';
import { CLIP_STORAGE_KEY, CLIPS, findClip, readSelectedClip, availableSelection, saveSelectedClip } from '../src/animationState.js';
const source = readGLB(new URL('../assets/character/character-animated.glb', import.meta.url));

test('Hand flex is a real nonconstant thirty-joint skeletal clip with bounded normalized rotations', () => {
  const {json} = source, clip = json.animations.find(a => a.name === 'Hand flex');
  assert.ok(clip && !isConstantPose(source, clip));
  const channels = clip.channels.filter(c => /^(Left|Right)(Thumb|Index|Middle|Ring|Little)[123]$/.test(json.nodes[c.target.node].name));
  assert.equal(channels.length, 30);
  for (const channel of channels) {
    assert.equal(channel.target.path, 'rotation');
    const sampler = clip.samplers[channel.sampler];
    assert.deepEqual(readAccessor(source, sampler.input).flat(), [0, .6, 1.4, 2, 2.8, 3.6, 4.2, 5].map(Math.fround));
    const rotations = readAccessor(source, sampler.output);
    assert.deepEqual(rotations[0], rotations.at(-1));
    assert.notDeepEqual(rotations[0], rotations[2]);
    for (const q of rotations) assert.ok(Math.abs(q.reduce((sum, v) => sum + v * v, 0) - 1) < 1e-5);
  }
  assert.throws(() => addHandFlex(source), /duplicate flex/);
});

test('Hand flex selection matches the actual clip and persists for close-up reload', () => {
  const values = new Map(), storage = {getItem: k => values.get(k), setItem: (k, v) => values.set(k, v)};
  saveSelectedClip(storage, 'hands');
  assert.equal(values.get(CLIP_STORAGE_KEY), 'hands');
  assert.equal(readSelectedClip(storage), 'hands');
  assert.equal(availableSelection(source.json.animations, readSelectedClip(storage)), 'hands');
  assert.equal(findClip(source.json.animations, CLIPS.find(c => c.key === 'hands')).name, 'Hand flex');
});
