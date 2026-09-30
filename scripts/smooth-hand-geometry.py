"""Blender geometry-only union/finish; does not import/re-export the character.

Usage: blender --background --factory-startup --python smooth-hand-geometry.py --
       raw-hands.glb smoothed-hands.json
Only the replacement mesh is touched. Source character bytes stay in Node's GLB
packager. Vertex weights are transferred locally, capped/normalized to 4 joints.
"""
import bpy, json, struct, sys
from pathlib import Path
from mathutils.kdtree import KDTree

source, output=sys.argv[sys.argv.index('--')+1:]
raw=Path(source).read_bytes();size=struct.unpack_from('<I',raw,12)[0]
meta=json.loads(raw[20:20+size]);binary=raw[28+size:]
def values(index):
    a=meta['accessors'][index];v=meta['bufferViews'][a['bufferView']]
    count={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
    fmt,width={5126:('f',4),5125:('I',4),5123:('H',2)}[a['componentType']]
    return [struct.unpack_from('<'+fmt*count,binary,v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',count*width)) for i in range(a['count'])]
p=meta['meshes'][-1]['primitives'][0];a=p['attributes']
positions=values(a['POSITION']);joints=values(a['JOINTS_0']);weights=values(a['WEIGHTS_0'])
indices=[v[0] for v in values(p['indices'])];faces=[indices[i:i+3] for i in range(0,len(indices),3)]
mesh=bpy.data.meshes.new('Replacement hands only');mesh.from_pydata(positions,[],faces);mesh.update()
obj=bpy.data.objects.new('Replacement hands only',mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
mesh.remesh_voxel_size=.00125;mesh.use_remesh_preserve_volume=True
bpy.ops.object.voxel_remesh()
modifier=obj.modifiers.new('Finish palm and finger unions','SMOOTH');modifier.factor=.8;modifier.iterations=12
bpy.ops.object.modifier_apply(modifier=modifier.name)
modifier=obj.modifiers.new('Keep hands economical','DECIMATE');modifier.ratio=.16
bpy.ops.object.modifier_apply(modifier=modifier.name)
obj.data.update();tree=KDTree(len(positions))
for i,p in enumerate(positions):tree.insert(p,i)
tree.balance()
result={'position':[],'normal':[],'joints':[],'weights':[],'indices':[]}
for vertex in obj.data.vertices:
    merged={}
    for _,i,distance in tree.find_n(vertex.co,8):
        factor=1/(distance+.0002)**2
        for joint,weight in zip(joints[i],weights[i]):merged[joint]=merged.get(joint,0)+factor*weight
    selected=sorted(merged.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in selected)
    result['position'].extend(vertex.co);result['normal'].extend(vertex.normal)
    result['joints'].extend([j for j,_ in selected]+[0]*(4-len(selected)))
    result['weights'].extend([w/total for _,w in selected]+[0]*(4-len(selected)))
obj.data.calc_loop_triangles()
for triangle in obj.data.loop_triangles:result['indices'].extend(triangle.vertices)
Path(output).write_text(json.dumps(result,separators=(',',':')))
print('HAND_FINISH',len(obj.data.vertices),'vertices',len(result['indices'])//3,'triangles')
