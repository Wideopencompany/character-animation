import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIP_STORAGE_KEY, findClip, readSelectedClip, saveSelectedClip, availableSelection } from '../src/animationState.js';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('saved clip selection falls back to idle and persists known clips', () => {
  const saved = storage({ [CLIP_STORAGE_KEY]: 'bad-value' });
  assert.equal(readSelectedClip(saved), 'idle');
  saveSelectedClip(saved, 'walk');
  assert.equal(readSelectedClip(saved), 'walk');
  assert.throws(() => saveSelectedClip(saved, 'dance'), RangeError);
});

test('a legacy missing clip falls back to supported walk/run instead of showing a fake idle', () => {
  const animations = [{ name: 'Walking' }, { name: 'Running' }];
  assert.equal(availableSelection(animations, 'conversation'), 'walk');
  assert.equal(availableSelection(animations, 'idle'), 'walk');
  assert.equal(availableSelection(animations, 'run'), 'run');
  assert.equal(availableSelection([], 'walk'), null);
  const saved = storage();
  saveSelectedClip(saved, 'run');
  assert.equal(readSelectedClip(saved), 'run');
});

test('clip matching accepts Meshy-style animation names', () => {
  const animations = [{ name: 'Idle 1' }, { name: 'Casual Walk' }, { name: 'Agree Gesture' }, { name: 'Walk to Sit' }];
  assert.equal(findClip(animations, { matcher: /idle/i }).name, 'Idle 1');
  assert.equal(findClip(animations, { matcher: /walk/i }).name, 'Casual Walk');
  assert.equal(findClip(animations, { matcher: /gesture/i }).name, 'Agree Gesture');
  assert.equal(findClip(animations, { matcher: /sit/i }).name, 'Walk to Sit');
});
