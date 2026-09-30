import { readFileSync, writeFileSync } from 'node:fs';
import { readGLB, combineRigClips, encodeGLB } from './combine-rig-clips.mjs';
import { repairHands } from './repair-hands.mjs';
import { addHandFlex } from './add-hand-flex.mjs';
const asset = name => new URL(`../assets/character/${name}`, import.meta.url);
const body = combineRigClips(readGLB(asset('user-rigged.glb')), [
  { name: 'Walking', document: readGLB(asset('clips/walking.glb')) },
  { name: 'Running', document: readGLB(asset('clips/running.glb')) },
]);
const repaired = repairHands(body, JSON.parse(readFileSync(asset('hand-geometry.json'))), JSON.parse(readFileSync(asset('hand-skin-mask.json'))));
writeFileSync(asset('character-animated.glb'), encodeGLB(addHandFlex(repaired)));
console.log(JSON.stringify(repaired.json.extras.handRepair));
