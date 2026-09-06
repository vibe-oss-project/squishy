"""Export the currently open, edited studio without rebuilding its sculptures.

Blender assets/blender/pastel-studio.blend --background --python scripts/export-studio.py
The .blend is never overwritten by this export operation.
"""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'environments'
OUT.mkdir(parents=True, exist_ok=True)
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH'
           and o.get('studioPart') in ['floor', 'open', 'sticky']]
materials = {m for o in objects for m in o.data.materials}
for material in materials:
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    # Export the PBR constant and active color attribute separately. glTF
    # multiplies them, exactly as the preview's vertex-color node does.
    for link in list(bsdf.inputs['Base Color'].links):
        material.node_tree.links.remove(link)

for o in objects:
    old = o.data.color_attributes.active_color
    values = [tuple(c.color) for c in old.data]
    o.data.color_attributes.remove(old)
    packed = o.data.color_attributes.new(name='StudioAO', type='BYTE_COLOR', domain='CORNER')
    for c, value in zip(packed.data, values):
        c.color = value
    o.data.color_attributes.active_color_index = 0
    o.data.color_attributes.render_color_index = 0

batches = [(part, material, [o for o in objects if o['studioPart'] == part and o.data.materials[0] == material])
           for part in ['floor', 'open', 'sticky'] for material in sorted(materials, key=lambda m: m.name)]
merged = []
for part, material, members in batches:
    if not members:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in members:
        o.hide_render = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = members[0]
    if len(members) > 1:
        bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'StudioFloor' if part == 'floor' else part.title() + ' • ' + material.name
    merged.append(o)

bpy.ops.object.select_all(action='DESELECT')
for o in merged:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'pastel-studio.glb'), export_format='GLB',
                          use_selection=True, export_cameras=False, export_lights=False,
                          export_extras=True, export_vertex_color='ACTIVE',
                          export_all_vertex_colors=False, export_materials='EXPORT')
stats = {'generator': 'Blender ' + bpy.app.version_string, 'source': 'assets/blender/pastel-studio.blend',
         'meshes': len(merged), 'vertices': sum(len(o.data.vertices) for o in merged),
         'bytes': (OUT / 'pastel-studio.glb').stat().st_size,
         'parts': {part: len([o for o in merged if o['studioPart'] == part]) for part in ['floor', 'open', 'sticky']}}
(OUT / 'pastel-studio.json').write_text(json.dumps(stats, indent=2) + '\n')
print('STUDIO_EXPORT', json.dumps(stats))
