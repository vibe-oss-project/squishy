# Pastel Studio

The first Blender-authored environment for [Squishy Playground](https://squishy-snowy.vercel.app). The scene is original to this adaptation; the interactive playground remains built on [Scott's Jelly Baby](https://github.com/scottstts/Jelly-Baby).

## Files

- `assets/blender/pastel-studio.blend`: editable sculptures, material nodes, baked vertex colors, and a camera/softbox setup for review.
- `public/environments/pastel-studio.glb`: the geometry and PBR materials loaded by the game.
- `public/environments/pastel-studio.png`: Blender review render. This is not a screenshot of the game.
- `public/environments/pastel-studio.json`: export size and mesh statistics.
- `scripts/build-studio.py`: reproducible authoring, ambient-occlusion bake, review render, and export.
- `scripts/export-studio.py`: re-export an edited file without rebuilding the sculptures.

## Edit in Blender

Open the `.blend` file in Blender 5.2 or newer. Each mesh has a `studioPart` custom property: `floor`, `open`, or `sticky`. Keep those tags when replacing meshes. `helper` objects represent the room during baking and preview; they are not exported. Cameras and lights also remain in the source file only.

The scene is stored in metres. The authoring script accepts centimetres and converts them explicitly. The gameplay floor is at `y = 0` after glTF export, the back wall is at `z = -0.14`, and side walls are at `x = ±0.185`. Blender uses Z up; glTF converts to the game's Y-up coordinates.

Keep the central floor clear. The `open` accessories are decorative, without additional physical colliders. Sticky wall relief is shallow (around one millimetre): the original plane contact and adhesion system continues to handle grabbing, throwing, and peeling. The source stores color and ambient occlusion in the active `StudioAO` vertex-color layer. Major shape edits require rebaking this layer.

Rebuild the original scene on macOS:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/build-studio.py
```

Export your saved edits:

```sh
/Applications/Blender.app/Contents/MacOS/Blender assets/blender/pastel-studio.blend --background --python scripts/export-studio.py
npm run test:studio
npm run test:selection
npm run lint
npm run typecheck
npm run build
```

Export merges objects by material and mode and packs vertex colors. It never overwrites the `.blend` source. The runtime keeps one cached copy of the GLB, switches visibility between the two compositions, converts its PBR materials into WebGPU node materials, and disposes its shared geometry only at shutdown. Missing or invalid assets use the existing visible startup error path.

## Floor and lighting

The cream inlay is vertex color in the same ground mesh. There are no almost-coplanar discs, stars, or transparent shadow plates under the toy. The remaining procedural worlds similarly paint their floor motifs in a single material, with derivative antialiasing for the candy pattern.

The directional light keeps a constant orientation. Its shadow projection remains fixed near the starting play area and moves in whole shadow texels during high throws. Thirteen fixed weighted PCF samples soften shadow edges without screen-space noise. Neutral tone mapping preserves the pastels. Baked occlusion adds quiet shading to the decorations; the deformable toy still casts and receives live shadows. The camera's near plane is six millimetres, improving depth precision while retaining the existing orbit limits and infinite-height sticky walls. Small ceramic coves soften the sticky room's floor junction; open compositions fade distant scenery into the background.

The four-million-pixel drawing-buffer cap and WebGPU-only renderer are unchanged. The GLB budget is three megabytes before HTTP compression, and each composition uses fewer than twelve asset draw calls. Device frame rates must still be measured on real hardware.
