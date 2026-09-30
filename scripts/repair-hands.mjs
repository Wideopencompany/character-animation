import { Matrix4, Vector3, Quaternion, Color, SRGBColorSpace } from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGLB, encodeGLB } from './combine-rig-clips.mjs';

export const HAND_CUT = .661;
export const DIGITS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];

export function readAccessor(document, index) {
  const a = document.json.accessors[index], v = document.json.bufferViews[a.bufferView];
  const sizes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }, components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const size = sizes[a.componentType], stride = v.byteStride ?? components * size;
  const method = { 5126: 'readFloatLE', 5125: 'readUInt32LE', 5123: 'readUInt16LE', 5121: 'readUInt8' }[a.componentType];
  if (!method || a.sparse) throw Error('Unsupported accessor');
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: components }, (_, k) =>
    document.bin[method]((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * stride + k * size)));
}

export function repairHands(source, smoothedGeometry, skinMask) {
  const json = structuredClone(source.json), parts = [source.bin]; let length = source.bin.length;
  const append = (data, type, componentType, target) => {
    const padding = (4 - length % 4) % 4;
    if (padding) { parts.push(Buffer.alloc(padding)); length += padding; }
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    const bufferView = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...(target ? { target } : {}) });
    parts.push(bytes); length += bytes.length;
    const size = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
    const accessor = { bufferView, componentType, type, count: data.length / size };
    if (type === 'VEC3') {
      accessor.min = [0, 1, 2].map(k => Math.min(...Array.from(data).filter((_, i) => i % 3 === k)));
      accessor.max = [0, 1, 2].map(k => Math.max(...Array.from(data).filter((_, i) => i % 3 === k)));
    }
    json.accessors.push(accessor); return json.accessors.length - 1;
  };
  if (json.skins.length !== 1 || json.skins[0].joints.length !== 24) throw Error('Expected original 24-joint Meshy rig');
  const skin = json.skins[0];
  const primitive = json.meshes[0].primitives[0];
  const positions = readAccessor(source, primitive.attributes.POSITION);
  if (skinMask && (skinMask.minX < .61 || skinMask.minX > .65 || skinMask.vertices.some(i => !Number.isInteger(i) || i < 0 || i >= positions.length))) throw Error('Invalid hand-only skin mask');
  const oldIndices = readAccessor(source, primitive.indices).flat();
  const kept = [], removed = [], skinVertices = new Set(skinMask?.vertices ?? []);
  for (let i = 0; i < oldIndices.length; i += 3) {
    const triangle = oldIndices.slice(i, i + 3);
    const skinAtWrist = skinMask && triangle.every(v => Math.abs(positions[v][0]) > skinMask.minX)
      && triangle.filter(v => skinVertices.has(v)).length >= 2;
    (skinAtWrist || triangle.some(v => Math.abs(positions[v][0]) > HAND_CUT) ? removed : kept).push(...triangle);
  }
  if (removed.length < 300 || removed.length > 30000) throw Error('Unexpected distal-hand removal extent');
  primitive.indices = append(new Uint32Array(kept), 'SCALAR', 5125, 34963);
  const parents = new Map(json.nodes.flatMap((node, i) => (node.children ?? []).map(child => [child, i])));
  const world = (index) => {
    const n = json.nodes[index];
    const m = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(
      new Vector3(...n.translation ?? [0, 0, 0]), new Quaternion(...n.rotation ?? [0, 0, 0, 1]), new Vector3(...n.scale ?? [1, 1, 1]));
    return parents.has(index) ? world(parents.get(index)).multiply(m) : m;
  };
  const bindMatrices = readAccessor(source, skin.inverseBindMatrices).flat();
  const point = (side, x, y, z) => new Vector3(side * x, y, z);
  let data = { position: [], normal: [], joints: [], weights: [], indices: [] };
  const addVertex = (p, normal, joints, weights) => {
    data.position.push(...p.toArray()); data.normal.push(...normal.toArray());
    data.joints.push(...joints, ...Array(4 - joints.length).fill(0));
    data.weights.push(...weights, ...Array(4 - weights.length).fill(0));
  };
  // Ring lofts make rounded, tapered digits. Adjacent sections share vertices,
  // and weights blend continuously across the three actual joint transforms.
  const loft = (centers, radii, radial, weightAt) => {
    const start = data.position.length / 3;
    centers.forEach((p, row) => {
      const tangent = centers[Math.min(row + 1, centers.length - 1)].clone().sub(centers[Math.max(0, row - 1)]).normalize();
      const up = new Vector3(0, 1, 0);
      const cross = tangent.clone().cross(up).normalize();
      const normalUp = cross.clone().cross(tangent).normalize();
      const { joints, weights } = weightAt(row / (centers.length - 1));
      for (let col = 0; col < radial; col++) {
        const angle = col / radial * Math.PI * 2;
        const offset = normalUp.clone().multiplyScalar(Math.cos(angle) * radii[row][0]).addScaledVector(cross, Math.sin(angle) * radii[row][1]);
        const normal = normalUp.clone().multiplyScalar(Math.cos(angle) / radii[row][0]).addScaledVector(cross, Math.sin(angle) / radii[row][1]).normalize();
        addVertex(p.clone().add(offset), normal, joints, weights);
      }
    });
    for (let row = 0; row < centers.length - 1; row++) for (let col = 0; col < radial; col++) {
      const a = start + row * radial + col, b = start + row * radial + (col + 1) % radial;
      const c = a + radial, d = b + radial;
      data.indices.push(a, b, c, b, d, c);
    }
    for (const row of [0, centers.length - 1]) {
      const center = data.position.length / 3, w = weightAt(row / (centers.length - 1));
      addVertex(centers[row], centers[1].clone().sub(centers[0]).normalize().multiplyScalar(row === 0 ? -1 : 1), w.joints, w.weights);
      for (let col = 0; col < radial; col++) {
        const a = start + row * radial + col, b = start + row * radial + (col + 1) % radial;
        data.indices.push(center, ...(row === 0 ? [b, a] : [a, b]));
      }
    }
  };
  const digitDefinitions = [
    { name: 'Thumb', x: .665, z: .024, length: .075, dz: .045, radius: .0105 },
    { name: 'Index', x: .711, z: .025, length: .088, dz: .006, radius: .0085 },
    { name: 'Middle', x: .713, z: .003, length: .098, dz: 0, radius: .009 },
    { name: 'Ring', x: .711, z: -.019, length: .091, dz: -.002, radius: .0085 },
    { name: 'Little', x: .701, z: -.038, length: .073, dz: -.006, radius: .007 },
  ];
  for (const [side, prefix] of [[1, 'Left'], [-1, 'Right']]) {
    const handNode = json.nodes.findIndex(n => n.name === `${prefix}Hand`);
    const handJoint = skin.joints.indexOf(handNode), handWorld = world(handNode);
    const y = 1.375;
    const palmCenters = [.619, .639, .65, .674, .70, .718].map(x => point(side, x, y, -.003));
    loft(palmCenters, [[.026, .048], [.027, .048], [.026, .048], [.017, .040], [.015, .042], [.010, .037]], 24,
      () => ({ joints: [handJoint], weights: [1] }));
    for (const digit of digitDefinitions) {
      const centerAt = t => point(side, digit.x + digit.length * t, y - .012 * t * t, digit.z + digit.dz * t);
      const fractions = [0, .42, .72], joints = []; let parent = handNode, parentWorld = handWorld;
      for (let joint = 0; joint < 3; joint++) {
        const desired = new Matrix4().compose(centerAt(fractions[joint]), new Quaternion(), new Vector3(.01, .01, .01));
        const local = parentWorld.clone().invert().multiply(desired);
        const t = new Vector3(), r = new Quaternion(), s = new Vector3(); local.decompose(t, r, s);
        const index = json.nodes.length;
        json.nodes.push({ name: `${prefix}${digit.name}${joint + 1}`, translation: t.toArray(), rotation: r.toArray(), scale: s.toArray() });
        json.nodes[parent].children ??= []; json.nodes[parent].children.push(index);
        joints.push(skin.joints.length); skin.joints.push(index);
        bindMatrices.push(...desired.clone().invert().elements);
        parent = index; parentWorld = desired;
      }
      const centers = Array.from({ length: 21 }, (_, i) => centerAt(i / 20));
      const radii = centers.map((_, i) => {
        const t = i / 20, taper = 1 - .22 * t;
        const cap = t > .9 ? Math.sqrt(Math.max(.015, 1 - ((t - .9) / .1) ** 2)) : 1;
        return [digit.radius * taper * cap * .88, digit.radius * taper * cap];
      });
      loft(centers, radii, 16, t => {
        if (t < .06) return { joints: [handJoint, joints[0]], weights: [1 - t / .06, t / .06] };
        if (t < .28) return { joints: [joints[0]], weights: [1] };
        if (t < .50) return { joints: [joints[0], joints[1]], weights: [1 - (t - .28) / .22, (t - .28) / .22] };
        if (t < .65) return { joints: [joints[1]], weights: [1] };
        if (t < .78) return { joints: [joints[1], joints[2]], weights: [1 - (t - .65) / .13, (t - .65) / .13] };
        return { joints: [joints[2]], weights: [1] };
      });
    }
  }
  if (smoothedGeometry) data = structuredClone(smoothedGeometry);
  // Match the existing cuff's forearm/hand blend, rather than making the wrist
  // extension rigidly follow Hand (which exposed it during the running clip).
  for (let v = 0; v < data.position.length / 3; v++) {
    const x = data.position[v * 3];
    if (Math.abs(x) >= .665) continue;
    const hand = x > 0 ? 15 : 19, forearm = x > 0 ? 14 : 18;
    const weight = Math.max(0, Math.min(1, (Math.abs(x) - .615) / .05));
    data.joints.splice(v * 4, 4, forearm, hand, 0, 0);
    data.weights.splice(v * 4, 4, 1 - weight, weight, 0, 0);
  }
  const count = data.position.length / 3;
  if (!Number.isInteger(count) || data.normal.length !== count * 3 || data.joints.length !== count * 4 || data.weights.length !== count * 4) throw Error('Invalid hand geometry attributes');
  if (data.position.some((v, i) => !Number.isFinite(v) || (i % 3 === 0 && (Math.abs(v) < .61 || Math.abs(v) > .85)) || (i % 3 === 1 && (v < 1.32 || v > 1.44)) || (i % 3 === 2 && Math.abs(v) > .12))) throw Error('Geometry extends outside hands');
  if (data.normal.some(v => !Number.isFinite(v)) || data.indices.some(i => !Number.isInteger(i) || i < 0 || i >= count)) throw Error('Invalid hand normals/indices');
  for (let vertex = 0; vertex < count; vertex++) {
    const weights = data.weights.slice(vertex * 4, vertex * 4 + 4);
    if (weights.some(w => !Number.isFinite(w) || w < 0 || w > 1) || Math.abs(weights.reduce((sum, w) => sum + w, 0) - 1) > 1e-5) throw Error('Invalid hand skin weights');
    if (data.joints.slice(vertex * 4, vertex * 4 + 4).some((j, slot) => !Number.isInteger(j) || j < 0 || j >= skin.joints.length || (weights[slot] > 0 && j < 24 && ![14, 15, 18, 19].includes(j)))) throw Error('Invalid hand joint binding');
  }
  skin.inverseBindMatrices = append(new Float32Array(bindMatrices), 'MAT4', 5126);
  // Median base-color texels sampled from both original hands, converted from
  // sRGB into the linear glTF material factor; no changes to face/body textures.
  const color = new Color().setRGB(.862745, .670588, .580392, SRGBColorSpace);
  const material = json.materials.length;
  json.materials.push({ name: 'Repaired hands skin', doubleSided: true,
    pbrMetallicRoughness: { baseColorFactor: [...color.toArray(), 1], metallicFactor: 0, roughnessFactor: 1 } });
  const mesh = json.meshes.length;
  json.meshes.push({ name: 'Repaired five-digit hands', primitives: [{
    attributes: {
      POSITION: append(new Float32Array(data.position), 'VEC3', 5126, 34962),
      NORMAL: append(new Float32Array(data.normal), 'VEC3', 5126, 34962),
      JOINTS_0: append(new Uint16Array(data.joints), 'VEC4', 5123, 34962),
      WEIGHTS_0: append(new Float32Array(data.weights), 'VEC4', 5126, 34962),
    }, indices: append(new Uint32Array(data.indices), 'SCALAR', 5125, 34963), material,
  }] });
  const originalMeshNode = json.nodes.findIndex(n => n.mesh === 0), node = json.nodes.length;
  json.nodes.push({ ...structuredClone(json.nodes[originalMeshNode]), name: 'Repaired hands', mesh });
  json.nodes[parents.get(originalMeshNode)].children.push(node);
  json.extras = { ...json.extras, handRepair: { version: 1, originalBodyJoints: 24, fingerJoints: 30,
    removedTriangles: removed.length / 3, addedTriangles: data.indices.length / 3, cut: HAND_CUT,
    skinMaskMinX: skinMask?.minX, smoothed: !!smoothedGeometry } };
  return { json, bin: Buffer.concat(parts) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output, smoothed, mask] = process.argv.slice(2);
  if (!output) throw Error('Usage: repair-hands.mjs original.glb output.glb');
  const result = repairHands(readGLB(input), smoothed ? JSON.parse(readFileSync(smoothed)) : undefined, mask ? JSON.parse(readFileSync(mask)) : undefined); writeFileSync(output, encodeGLB(result));
  console.log(JSON.stringify(result.json.extras.handRepair));
}
