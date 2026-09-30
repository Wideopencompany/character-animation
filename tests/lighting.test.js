import test from 'node:test';
import assert from 'node:assert/strict';
import { ACESFilmicToneMapping, Scene } from 'three';
import { configureLighting, LIGHTING } from '../src/lighting.js';

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
