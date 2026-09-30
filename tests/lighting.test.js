import test from 'node:test';
import assert from 'node:assert/strict';
import { ACESFilmicToneMapping, Scene } from 'three';
import { configureLighting, LIGHTING, CHARACTER_SHADOW } from '../src/lighting.js';

test('diffuse lighting keeps exposure/fill/key calibrated instead of washing out the character', () => {
  const renderer = {};
  const scene = new Scene();
  const { fill, key } = configureLighting(renderer, scene);
  assert.equal(renderer.toneMapping, ACESFilmicToneMapping);
  assert.equal(renderer.toneMappingExposure, 1);
  assert.equal(fill.intensity, 2);
  assert.equal(key.intensity, 2.4);
  assert.equal(fill.color.getHex(), 0xfff5eb);
  assert.ok(LIGHTING.fillIntensity < 2.2 && LIGHTING.keyIntensity < 2.7);
  assert.deepEqual(key.position.toArray(), [7, 12, 9]);
  assert.equal(key.castShadow, true);
  assert.deepEqual(scene.children, [fill, key]);
});

test('body shadows use bounded depth precision and nonzero bias to prevent face banding', () => {
  const { key } = configureLighting({}, new Scene());
  assert.equal(key.shadow.bias, -.0001);
  assert.equal(key.shadow.normalBias, .02);
  assert.deepEqual(key.shadow.mapSize.toArray(), [1024, 1024]);
  const camera = key.shadow.camera;
  assert.deepEqual([camera.left, camera.right, camera.bottom, camera.top], [-3, 3, -3, 3]);
  assert.equal(camera.near, .5);
  assert.equal(camera.far, 40);
  assert.ok(camera.far > key.position.length() + 3);
  assert.ok(CHARACTER_SHADOW.normalBias < .03, 'avoid large detached contact shadows');
});
