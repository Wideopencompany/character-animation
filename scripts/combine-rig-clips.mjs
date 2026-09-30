import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function readGLB(path) {
  const bytes = readFileSync(path);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw Error('Expected GLB2');
  let json, bin;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString());
    if (type === 0x004e4942) bin = data;
    offset += length + 8;
  }
  if (!json || !bin || json.buffers.length !== 1) throw Error('Expected one embedded buffer');
  return { json, bin };
}

export function encodeGLB({ json, bin }) {
  json.buffers[0].byteLength = bin.length;
  const raw = Buffer.from(JSON.stringify(json));
  const metadata = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20); raw.copy(metadata);
  const data = Buffer.alloc(Math.ceil(bin.length / 4) * 4); bin.copy(data);
  const output = Buffer.alloc(12 + 8 + metadata.length + 8 + data.length);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(metadata.length, 12); output.writeUInt32LE(0x4e4f534a, 16); metadata.copy(output, 20);
  const start = 20 + metadata.length;
  output.writeUInt32LE(data.length, start); output.writeUInt32LE(0x004e4942, start + 4); data.copy(output, start + 8);
  return output;
}

export function isConstantPose(document, animation) {
  const { json, bin } = document;
  if (!animation.channels.length) return false;
  return animation.channels.every((channel) => {
    const accessor = json.accessors[animation.samplers[channel.sampler].output];
    const view = json.bufferViews[accessor.bufferView];
    const components = { VEC3: 3, VEC4: 4 }[accessor.type];
    if (accessor.componentType !== 5126 || !components || accessor.sparse) return false;
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? components * 4;
    for (let sample = 1; sample < accessor.count; sample++) {
      for (let component = 0; component < components; component++) {
        const initial = bin.readFloatLE(offset + component * 4);
        const value = bin.readFloatLE(offset + sample * stride + component * 4);
        if (Math.abs(initial - value) > 1e-5) return false;
      }
    }
    return true;
  });
}

// Merge only animation accessors/data, never the duplicate armature proxy mesh,
// textures, geometry or skin. This is packaging compatible bones, not baking.
export function combineRigClips(base, sources) {
  const json = structuredClone(base.json);
  const nodes = new Map();
  json.nodes.forEach((node, index) => {
    if (!node.name) return;
    if (nodes.has(node.name)) throw Error(`Duplicate target node: ${node.name}`);
    nodes.set(node.name, index);
  });
  json.animations ??= [];
  if (json.animations.length === 1 && isConstantPose(base, json.animations[0])) json.animations[0].name = 'Rest pose';
  const pieces = [base.bin]; let byteLength = base.bin.length;
  const parentsOf = (data) => new Map(data.nodes.flatMap((node, index) => (node.children ?? []).map((child) => [child, index])));
  const targetParents = parentsOf(json);
  for (const { document, name } of sources) {
    const views = new Map(), accessors = new Map();
    const sourceParents = parentsOf(document.json), verified = new Set();
    const verifyNode = (sourceIndex) => {
      const source = document.json.nodes[sourceIndex];
      const targetIndex = nodes.get(source.name);
      if (targetIndex === undefined) throw Error(`Missing target node: ${source.name}`);
      if (verified.has(sourceIndex)) return targetIndex;
      const target = json.nodes[targetIndex];
      for (const key of ['translation', 'rotation', 'scale', 'matrix']) {
        const a = source[key], b = target[key];
        if (!!a !== !!b || (a && (a.length !== b.length || a.some((v, i) => Math.abs(v - b[i]) > 1e-5)))) {
          throw Error(`Incompatible rest transform: ${source.name}.${key}`);
        }
      }
      const parent = sourceParents.get(sourceIndex), targetParent = targetParents.get(targetIndex);
      if ((parent === undefined) !== (targetParent === undefined)) throw Error(`Incompatible hierarchy: ${source.name}`);
      if (parent !== undefined && verifyNode(parent) !== targetParent) throw Error(`Incompatible parent: ${source.name}`);
      verified.add(sourceIndex);
      return targetIndex;
    };
    const copyAccessor = (index) => {
      if (accessors.has(index)) return accessors.get(index);
      const accessor = structuredClone(document.json.accessors[index]);
      if (accessor.sparse || accessor.bufferView === undefined) throw Error('Unsupported animation accessor');
      const originalView = accessor.bufferView;
      if (!views.has(originalView)) {
        const view = structuredClone(document.json.bufferViews[originalView]);
        if (view.buffer !== 0) throw Error('External animation buffer');
        const padding = (4 - byteLength % 4) % 4;
        if (padding) { pieces.push(Buffer.alloc(padding)); byteLength += padding; }
        const data = document.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
        view.byteOffset = byteLength; pieces.push(data); byteLength += data.length;
        views.set(originalView, json.bufferViews.length); json.bufferViews.push(view);
      }
      accessor.bufferView = views.get(originalView);
      accessors.set(index, json.accessors.length); json.accessors.push(accessor);
      return accessors.get(index);
    };
    if (document.json.animations.length !== 1) throw Error('Expected one source clip');
    const animation = structuredClone(document.json.animations[0]); animation.name = name;
    for (const channel of animation.channels) {
      channel.target.node = verifyNode(channel.target.node);
    }
    for (const sampler of animation.samplers) {
      sampler.input = copyAccessor(sampler.input); sampler.output = copyAccessor(sampler.output);
    }
    json.animations.push(animation);
  }
  return { json, bin: Buffer.concat(pieces) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [base, walk, run, output] = process.argv.slice(2);
  if (!output) throw Error('Usage: combine-rig-clips.mjs base.glb walk.glb run.glb output.glb');
  const result = combineRigClips(readGLB(base), [
    { name: 'Walking', document: readGLB(walk) }, { name: 'Running', document: readGLB(run) },
  ]);
  writeFileSync(output, encodeGLB(result));
  console.log(JSON.stringify({ output, clips: result.json.animations.map((a) => a.name), bytes: result.bin.length }));
}
