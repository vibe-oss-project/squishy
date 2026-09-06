"""Author the editable Pastel Studio and its lightweight glTF scene in Blender.

Run: Blender --background --factory-startup --python scripts/build-studio.py
Coordinates below are centimetres: x = right, y = up, z = toward the viewer.
The GLB contains a single floor, shared props, and removable sticky wall details.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'environments'
SOURCE = ROOT / 'assets' / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
bpy.context.preferences.filepaths.save_version = 0
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 10
scene.world.color = (.32, .32, .32)
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 1440
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.bake.target = 'VERTEX_COLORS'
scene.render.bake.use_clear = True


def linear(hex_color):
    c = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


PALETTE = {
    'Porcelain': '#fff7ed', 'Vanilla': '#f6e6cf', 'Lavender': '#c1a8d9',
    'Rose': '#eeb5c3', 'Butter': '#f3d58e', 'Mint': '#b8d6c8',
    'Blue': '#b6d9ea', 'Plum': '#88749e', 'Floor': '#ffffff',
}
mats = {}
for name, color in PALETTE.items():
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*linear(color), 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = mat.diffuse_color
    bsdf.inputs['Roughness'].default_value = .67 if name != 'Floor' else .86
    bsdf.inputs['Coat Weight'].default_value = .08 if name != 'Floor' else 0
    bsdf.inputs['Coat Roughness'].default_value = .5
    mats[name] = mat


def pos(x, y, z):
    return (x * .01, -z * .01, y * .01)


def finish(obj, name, material, group='shared'):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mats[material])
    obj['studioPart'] = group
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def sphere(name, xyz, size, material, group='shared'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=pos(*xyz))
    o = bpy.context.object
    o.scale = (size[0] * .01, size[2] * .01, size[1] * .01)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, material, group)


def rounded_box(name, xyz, size, radius, material, group='shared'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(*xyz))
    o = bpy.context.object
    o.scale = (size[0] * .01, size[2] * .01, size[1] * .01)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = o.modifiers.new('Soft, hand-finished edges', 'BEVEL')
    bevel.width = radius * .01
    bevel.segments = 5
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    normal = o.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    normal.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return finish(o, name, material, group)


def sweep(name, points, radius, material, group='shared', depth_scale=1):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 2
    curve.bevel_resolution = 4
    curve.bevel_depth = radius * .01
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, xyz in zip(spline.points, points):
        p.co = (*pos(*xyz), 1)
    o = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    # Flatten only the cross section for wall-mounted ceramic reliefs.
    if depth_scale != 1:
        middle = sum(v.co.y for v in o.data.vertices) / len(o.data.vertices)
        for v in o.data.vertices:
            v.co.y = middle + (v.co.y - middle) * depth_scale
    o.select_set(False)
    return finish(o, name, material, group)


def cloud(name, xyz, size, material='Porcelain', group='shared'):
    # Voxel union gives one continuous sculpture instead of intersecting balls.
    parts = []
    for dx, dy, r in [(-.55, -.12, .45), (-.10, .13, .60), (.48, -.05, .46)]:
        parts.append(sphere(name, (xyz[0] + dx * size, xyz[1] + dy * size, xyz[2]),
                            (r * size, r * size * .88, size * .22), material, group))
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    remesh = o.modifiers.new('Sculpted seamless cloud', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = size * .01 / 38
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = o.modifiers.new('Soft clay surface', 'SMOOTH')
    smooth.factor = .85
    smooth.iterations = 4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    simplify = o.modifiers.new('Web silhouette budget', 'DECIMATE')
    simplify.ratio = .5
    bpy.ops.object.modifier_apply(modifier=simplify.name)
    return finish(o, name, material, group)


def star(name, xyz, radius, material, group='shared', turn=0):
    # A smooth inflated five-point silhouette, with a gently domed face.
    rings, segments = 10, 100
    vertices = [pos(xyz[0], xyz[1], xyz[2] + radius * .25)]
    faces = []
    for j in range(1, rings + 1):
        u = j / rings
        for k in range(segments):
            a = 2 * math.pi * k / segments + math.pi / 2 + turn
            outline = radius * (.78 + .22 * math.cos(5 * (a - math.pi / 2 - turn)))
            r = outline * math.sin(u * math.pi / 2)
            vertices.append(pos(xyz[0] + math.cos(a) * r, xyz[1] + math.sin(a) * r,
                                xyz[2] + math.cos(u * math.pi / 2) * radius * .25))
    for k in range(segments):
        faces.append((0, 1 + k, 1 + (k + 1) % segments))
    for j in range(rings - 1):
        a, b = 1 + j * segments, 1 + (j + 1) * segments
        for k in range(segments):
            n = (k + 1) % segments
            faces.append((a + k, b + k, b + n, a + n))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(o)
    return finish(o, name, material, group)


# One radial mesh extends to twenty metres. Fine central rings carry the baked
# ambient occlusion and the subtle inlaid color; there is no second floor layer.
segments = 160
radii = [i * .25 for i in range(1, 91)] + [40, 60, 100, 200, 500, 1000, 2000]
vertices = [pos(0, 0, 0)]
faces = []
for r in radii:
    for k in range(segments):
        a = 2 * math.pi * k / segments
        vertices.append(pos(math.cos(a) * r, 0, math.sin(a) * r))
for k in range(segments):
    faces.append((0, 1 + k, 1 + (k + 1) % segments))
for j in range(len(radii) - 1):
    a, b = 1 + j * segments, 1 + (j + 1) * segments
    for k in range(segments):
        n = (k + 1) % segments
        faces.append((a + k, b + k, b + n, a + n))
mesh = bpy.data.meshes.new('Continuous ceramic play surface')
mesh.from_pydata(vertices, [], [tuple(reversed(f)) for f in faces])
mesh.update()
floor = bpy.data.objects.new('StudioFloor', mesh)
scene.collection.objects.link(floor)
finish(floor, 'StudioFloor', 'Floor', 'floor')

# Freestanding objects sit outside the central 18 cm play area in the open view.
# They are removed in sticky mode, where the playable surfaces remain clear.
cloud('Cloud cushion • left', (-12.8, 2.6, -13.4), 4.0, group='open')
cloud('Cloud cushion • right', (13.0, 2.1, -15.0), 3.2, 'Vanilla', 'open')
star('Butter star cushion', (10.1, 1.5, -10.7), 1.7, 'Butter', 'open', -.23)
star('Rose star cushion', (-9.6, .8, -11.3), .9, 'Rose', 'open', .30)
for i, color in enumerate(['Rose', 'Butter', 'Mint', 'Blue']):
    radius = 4.8 - .83 * i
    pts = [(-10.0 + math.cos(t * math.pi / 100) * radius,
            .7 + math.sin(t * math.pi / 100) * radius, -18.7) for t in range(101)]
    sweep('Rainbow • ' + color, pts, .37, color, 'open')
rounded_box('Lilac display plinth', (12.7, .8, -19), (7, 1.6, 5), .75, 'Lavender', 'open')
cloud('Little cloud on the plinth', (12.5, 3.4, -19), 3.1, group='open')
star('Little plum star', (16.0, 1.0, -16.5), 1.0, 'Plum', 'open', -.25)

# Seat every accessory on its actual support, including the curved undersides.
for o in [o for o in scene.objects if o.type == 'MESH' and o.get('studioPart') == 'open']:
    support = .016 if o.name == 'Little cloud on the plinth' else 0
    lowest = min(v.co.z for v in o.data.vertices) + o.location.z
    o.location.z += support - lowest

# Sticky details are shallow sculptures around a large uninterrupted center.
# Their fronts remain within 1.2 mm of the actual wall contact plane.
for i, color in enumerate(['Rose', 'Butter', 'Mint', 'Blue']):
    radius = 4.25 - .77 * i
    pts = [(-10.0 + math.cos(t * math.pi / 100) * radius,
            3.7 + math.sin(t * math.pi / 100) * radius, -13.94) for t in range(101)]
    sweep('Wall rainbow • ' + color, pts, .33, color, 'sticky', depth_scale=.16)
for name, xyz, size, material in [
    ('Wall cloud • left', (-10.0, 3.6, -14.05), 3.3, 'Porcelain'),
    ('Wall cloud • right', (10.0, 7.6, -14.05), 3.8, 'Porcelain'),
]:
    o = cloud(name, xyz, size, material, 'sticky')
    # A real rounded relief, no collapsed or coplanar triangles.
    for v in o.data.vertices:
        v.co.y *= .13
    o.location.y = .1405
for x, y, r, color, turn in [(6.0, 4.8, 1.1, 'Butter', -.2),
                             (13.4, 11.6, 1.3, 'Butter', .2),
                             (-14.6, 11.2, .85, 'Lavender', -.1),
                             (-4.0, 11.0, .65, 'Rose', .3)]:
    o = star('Wall star • ' + color, (x, y, -13.96), r, color, 'sticky', turn)
    # The star's curved front is 0.08–0.12 cm above the wall.
    for v in o.data.vertices:
        v.co.y = .1396 + (v.co.y - .1396) * .20

# Studio trim has enough thickness to remain stable as the camera moves.
for x in [-18.55, 18.55]:
    rounded_box('Rounded corner trim', (x, 14, -14.0), (.28, 28, .28), .13, 'Vanilla', 'sticky')

# Small concave ceramic coves soften the floor-to-wall junction. The center of
# the floor stays perfectly planar; these curves live only along the perimeter.
for side in ['back', 'left', 'right']:
    radius, steps = .32, 24
    vertices, faces = [], []
    for end in range(2):
        for k in range(steps + 1):
            angle = k / steps * math.pi / 2
            y = radius * (1 - math.cos(angle))
            inward = radius * (1 - math.sin(angle))
            if side == 'back':
                xyz = (-18.25 + end * 36.5, y, -14.03 + inward)
            else:
                xyz = ((18.53 - inward) * (-1 if side == 'left' else 1), y, -14.03 + end * 40)
            vertices.append(pos(*xyz))
    for k in range(steps):
        face = (k, steps + 1 + k, steps + 2 + k, k + 1)
        faces.append(tuple(reversed(face)) if side == 'left' else face)
    mesh = bpy.data.meshes.new('Curved ceramic junction')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    o = bpy.data.objects.new('Soft floor cove • ' + side, mesh)
    scene.collection.objects.link(o)
    finish(o, o.name, 'Porcelain', 'sticky')

# Bake against the same walls used at runtime, without exporting a second wall.
helpers = []
for name, xyz, size in [('Back', (0, 20, -14.035), (37.1, 40, .04)),
                       ('Left', (-18.535, 20, 5), (.04, 40, 38)),
                       ('Right', (18.535, 20, 5), (.04, 40, 38))]:
    helpers.append(rounded_box('Bake helper • ' + name, xyz, size, .001, 'Vanilla', 'helper'))

objects = [o for o in scene.objects if o.type == 'MESH' and o not in helpers]
for o in objects:
    o.data.color_attributes.new(name='StudioAO', type='FLOAT_COLOR', domain='CORNER')
    o.data.color_attributes.active_color_index = 0
    o.data.color_attributes.render_color_index = 0

# Each mode is baked separately so invisible objects cannot leave ghost shadows.
for mode in ['open', 'sticky']:
    print('Baking studio ambient occlusion: ' + mode, flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    bake_objects = []
    for o in objects:
        group = o['studioPart']
        o.hide_render = group not in [mode, 'floor']
        if group == mode:
            o.select_set(True)
            bake_objects.append(o)
    for h in helpers:
        h.hide_render = mode == 'open'
    if bake_objects:
        bpy.context.view_layer.objects.active = bake_objects[0]
        bpy.ops.object.bake(type='AO')

# Floor contact shade is a gentle analytic vertex wash, independent of walls.
# It is part of this same mesh and stays still under all camera/lighting motion.
cream, warm = linear('#fff6e9'), linear('#eadbcb')
for o in objects:
    colors = o.data.color_attributes.active_color
    for loop, value in zip(o.data.loops, colors.data):
        if o == floor:
            p = o.data.vertices[loop.vertex_index].co
            x, z = p.x * 100, -p.y * 100
            r = math.sqrt((x / 10.8) ** 2 + (z / 9.0) ** 2)
            blend = max(0, min(1, (r - .95) / .08))
            blend = blend * blend * (3 - 2 * blend)
            # A broad satin inlay, with a fine outer border painted into it.
            edge = .032 * math.exp(-((r - 1.11) / .045) ** 2)
            value.color = (*(max(0, a * (1 - blend) + b * blend - edge)
                             for a, b in zip(cream, warm)), 1)
        else:
            ao = max(.32, min(1, value.color[0]))
            value.color = (ao * .64 + .36,) * 3 + (1,)

# Color attributes multiply PBR base colors in glTF. The equivalent nodes make
# the editable .blend preview match, without shipping any procedural shaders.
for mat in mats.values():
    nodes = mat.node_tree.nodes
    attr = nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'StudioAO'
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1
    mix.inputs[1].default_value = mat.diffuse_color
    mat.node_tree.links.new(attr.outputs['Color'], mix.inputs[2])
    bsdf = nodes.get('Principled BSDF')
    mat.node_tree.links.new(mix.outputs[0], bsdf.inputs['Base Color'])


def area(name, xyz, power, size, color):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = power
    light.shape = 'DISK'
    light.size = size * .01
    light.color = linear(color)
    o = bpy.data.objects.new(name, light)
    scene.collection.objects.link(o)
    o.location = pos(*xyz)
    o.rotation_euler = (Vector(pos(0, 3, -4)) - o.location).to_track_quat('-Z', 'Y').to_euler()


area('Large softbox', (-15, 30, 20), 1.6, 25, '#fff3e5')
area('Lilac bounce', (22, 16, 6), .65, 30, '#e9e2ff')
area('Sky fill', (-3, 28, -15), 1.0, 20, '#e6f1ff')
camera_data = bpy.data.cameras.new('Studio review camera')
camera = bpy.data.objects.new('Studio review camera', camera_data)
scene.collection.objects.link(camera)
camera.location = pos(0, 12, 32)
camera.rotation_euler = (Vector(pos(0, 3.4, -5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.lens = 38
camera_data.clip_start = .002
camera_data.clip_end = 50
scene.camera = camera

for o in objects:
    o.hide_render = o['studioPart'] == 'open'
for o in helpers:
    o.hide_render = False
    # Helpers deliberately have no vertex bake; use a plain wall material.
    mat = mats['Vanilla'].copy()
    mat.name = 'Preview wall'
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    for link in list(bsdf.inputs['Base Color'].links):
        mat.node_tree.links.remove(link)
    bsdf.inputs['Base Color'].default_value = (*linear('#e8dfed'), 1)
    o.data.materials.clear()
    o.data.materials.append(mat)

scene['Studio notes'] = 'One continuous floor. Open props and sticky relief are mutually exclusive. Centimetre authoring, metre export. Baked vertex AO; editable PBR materials.'
scene.render.filepath = str(OUT / 'pastel-studio.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'pastel-studio.blend'), compress=True)
print('Rendering the Blender review image', flush=True)
bpy.ops.render.render(write_still=True)

import runpy
runpy.run_path(str(ROOT / 'scripts' / 'export-studio.py'))
