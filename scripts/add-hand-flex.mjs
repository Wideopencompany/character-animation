import { Quaternion, Vector3 } from 'three';

// Add an actual skeletal inspection clip, leaving the original three clips
// and their binary data unchanged. This is not a geometry/morph animation.
export function addHandFlex(source) {
  const json = structuredClone(source.json), pieces = [source.bin];
  let length = source.bin.length;
  const append = (values, type) => {
    const data = new Float32Array(values), bytes = Buffer.from(data.buffer);
    const padding = (4 - length % 4) % 4;
    if (padding) { pieces.push(Buffer.alloc(padding)); length += padding; }
    const bufferView = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
    pieces.push(bytes); length += bytes.length;
    const accessor = json.accessors.length;
    json.accessors.push({ bufferView, componentType: 5126, type, count: values.length / (type === 'VEC4' ? 4 : 1),
      ...(type === 'SCALAR' ? { min: [Math.min(...values)], max: [Math.max(...values)] } : {}) });
    return accessor;
  };
  const rest = json.animations.find(a => a.name === 'Rest pose');
  if (!rest || json.animations.some(a => a.name === 'Hand flex')) throw Error('Expected rest pose and no duplicate flex clip');
  const clip = structuredClone(rest); clip.name = 'Hand flex';
  const times = [0, .6, 1.4, 2.0, 2.8, 3.6, 4.2, 5.0];
  const amounts = [0, 0, 1, 1, 0, 0, .65, 0];
  const input = append(times, 'SCALAR');
  const fingers = json.nodes.map((node, i) => ({node, i})).filter(({node}) => /^(Left|Right)(Thumb|Index|Middle|Ring|Little)[123]$/.test(node.name));
  if (fingers.length !== 30) throw Error('Expected thirty finger joints');
  for (const {node, i} of fingers) {
    const thumb = node.name.includes('Thumb'), joint = Number(node.name.at(-1)) - 1;
    const maximum = (thumb ? [.20, .30, .22] : [.52, .64, .42])[joint];
    const sign = node.name.startsWith('Left') ? -1 : 1;
    const base = new Quaternion(...node.rotation);
    const rotations = amounts.flatMap(amount => base.clone().multiply(
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), sign * maximum * amount)).toArray());
    clip.channels.push({ sampler: clip.samplers.length, target: { node: i, path: 'rotation' } });
    clip.samplers.push({ input, output: append(rotations, 'VEC4'), interpolation: 'LINEAR' });
  }
  json.animations.push(clip);
  json.extras.handRepair.inspectionClip = 'Hand flex';
  return {json, bin: Buffer.concat(pieces)};
}
