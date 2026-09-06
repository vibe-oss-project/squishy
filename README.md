# Squishy Playground

A little world of softness. Pick one of ten cute 3D Squishy, squeeze it between your fingers, stretch it, and give it a gentle throw. Classic Squishy compress and spring back; sticky Mochi cling to the floor and walls until you peel them away. Five pastel worlds give each little friend somewhere to play.

**Built on [Jelly Baby](https://github.com/scottstts/Jelly-Baby), created by [Scott — @scottstts](https://github.com/scottstts).** Scott's volumetric soft-body physics, grabbing interactions, procedural sound, and rendering work are the foundation of this adaptation. Please visit **[his original interactive demo](https://jelly.scottsun.io)** and **[his repository](https://github.com/scottstts/Jelly-Baby)**. His Git history is preserved here. [Full credits](CREDITS.md).

**[Play live →](https://squishy-snowy.vercel.app)** · [Repository](https://github.com/vibe-oss-project/squishy) · [Implementation notes](docs/squishy-implementation.md)

## The idea

This is a small tactile playground: no score, no timer, just expressive little toys that react to how you hold them. Their eyes blink and squint, and their smiles respond to stretching, squeezing, impacts, and release.

The toy references and visual inspiration come from [Squishy Official](https://squishy-official.com/). The interface uses Fredoka, Lexend, the store's sky blue **#84D1FB**, and a complementary pastel palette. This is an independent adaptation, with product and asset attribution in [CREDITS.md](CREDITS.md).

## Ten little friends

| Classic — soft, without adhesion | Mochi — sticky in the simulation |
| --- | --- |
| [Original Panda](https://squishy-official.com/produit/squishy-panda-original/) | [Fluffy Cat](https://squishy-official.com/produit/squishy-mochi-chat-fluffy/) |
| [Kawaii Hamster](https://squishy-official.com/produit/squishy-hamster-kawaii/) | [Mochi Bunny](https://squishy-official.com/produit/squishy-mochi-lapin/) |
| [Sleepy Cat](https://squishy-official.com/produit/squishy-chat-endormi/) | [Mochi Seal](https://squishy-official.com/produit/squishy-mochi-phoque/) |
| [Cat Burger](https://squishy-official.com/produit/squishy-hamburger-chat/) | [Mochi Chick](https://squishy-official.com/produit/squishy-mochi-poussin/) |
| [Milk Carton](https://squishy-official.com/produit/squishy-brique-de-lait/) | [Mochi Hamster](https://squishy-official.com/produit/squishy-mochi-hamster/) |

Each toy has a refined closed surface mesh (approximately 48,000–94,000 vertices), volumetric cage, colors, face, and material preset. Paint boundaries are evaluated per pixel, so bands, ears, and markings stay smooth as the skin deforms. The selected variants include an orange hamster and burger, a pink milk carton, and a very pale pink bunny. Models load on demand; only one toy is simulated at a time.

The sculptures interpret the available photographs, including unseen surfaces. They are not verified pixel-perfect replicas. Material settings are tuned for play, not laboratory measurements; the sticky classification describes this simulation and does not certify that the store's products stick to walls.

## How to play

- **Squish mode (default for classics):** press and hold anywhere to make a local dent. A temporary supporting palm keeps the toy from flying away. Slide to knead and release for a soft recovery.
- **Touch screen:** place several fingers on different parts. Pull apart to stretch or move together to squeeze, horizontally or from top to bottom. Up to 13 independent holds in Squish mode, or 16 in Grab & throw mode, are supported; lifting one finger keeps the others in place. A pen and finger can work together.
- **Grab & throw mode:** drag to move and throw. For sticky Mochi, drag onto a patterned wall and release to attach; grab again and pull to peel away.
- **Mouse:** in Grab & throw mode, **Shift + click** pins a point so you can drag another part against it. The **Pin a point** button does the same. Shift + click a pin again to remove it.
- **Trackpad:** use pins for multiple holds. Browsers do not expose separate trackpad fingers as individual points on the toy.
- **Camera:** drag the background to rotate; scroll or pinch the background to zoom. The camera stays still while you hold the toy.
- **Keyboard:** **R** resets, **Esc** releases all holds, and **Space** makes a little hop. **WASD / arrow keys** give small nudges along the floor.

Holds are cleared on cancellation, loss of focus, and changes of toy or world. Sound starts after a user gesture and can be muted.

## Five little worlds

**Pastel Studio**, **Mochi Room**, **Candy Break**, **Vanilla Beach**, and **Starry Dream** are available from the world picker. Pastel Studio is the first Blender-authored environment: a continuous cream play surface, sculpted clouds, a ceramic rainbow, rounded stars, and baked ambient occlusion. Classics have an open composition with freestanding accessories; sticky Mochi have a lavender room with shallow wall reliefs and clear surfaces to cling to. The other four worlds retain their procedural artwork.

The floor in every world is a single surface, including its painted inlay. Stable shadow filtering and a constant light direction prevent the previous overlapping floor layers and moving shadow noise. Sticky walls continue above the camera, and high throws are preserved; only throws far outside the horizontal play area reset.

The editable [Blender source](assets/blender/pastel-studio.blend), [web asset](public/environments/pastel-studio.glb), and [authoring guide](docs/pastel-studio.md) are included. The Blender lighting is a review setup; the game uses its own real-time lighting and dynamic toy shadows.

## Run locally

Use **Node.js 24 LTS** and npm.

```sh
npm ci
npm run dev
```

The game requires **WebGPU** on HTTPS or localhost. Compatibility on phones, iPads, and computers depends on the browser, operating system, and GPU. Startup checks report unsupported devices and GPU failures explicitly; there is no WebGL fallback.

## Deploy on Vercel

Import this repository into a new Vercel project. The checked-in `vercel.json` configures **Vite**, `npm ci`, `npm run build`, and the `dist` output directory. Select **Node.js 24.x** and **main** as the production branch. No environment variables or backend services are required. Generated models and the WebAssembly kernel are included in the repository.

With the Git repository connected, pushes to `main` deploy to production and pull requests can create previews. See [Vercel's GitHub integration documentation](https://vercel.com/docs/git/vercel-for-github).

## Physics and rendering

- **Three.js r185, WebGPU, and TSL**, with Vite 8 and TypeScript/JavaScript.
- Volumetric neo-Hookean elasticity and XPBD constraints at **240 Hz**. Classics are more compressible and damped; Mochi are denser and nearly incompressible.
- Distributed adhesion with local contact capture, compliant force-limited bonds, aging, peeling, and a reattachment cooldown. Gravity remains active.
- The C/WebAssembly solver invokes the same contact system as the JavaScript path between constraint iterations.
- Eyes, mouths, and small facial details follow the deformed surface.
- Bounded simulation work: at most **768 contact samples**, **48 adhesive bonds**, and **12 physics substeps per frame**.
- A strict **4-million-pixel** drawing-buffer cap, including effective DPR values below 1 on large displays. Startup and fatal GPU errors stop the game and show diagnostics.

The new toys use matte and satin materials. Scott's original jelly optics, source modules, assets, and regression tests remain in the repository.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:squishies
npm run test:gestures
npm run test:rest
npm run test:multitouch
npm run test:selection
npm run test:studio
npm run test:collisions
npm run test:physics
npm run test:performance
npm run test:faces
npm run build
```

Tests cover closed meshes, upright resting poses, opposing grabs, stationary compression, deformed face attachment, drag-to-wall adhesion and peeling, bond aging, all five surface presets, and JavaScript/WebAssembly parity. Interaction tests cover independent touch holds, mouse pins, and pen + touch. Selection tests cover cancellation, stale requests, serialized compilation, open and tall worlds, and resource disposal.

Numerical tests and a production build do not validate visual likeness, GPU frame rates, or simultaneous gestures on a physical phone or iPad. Those need hands-on testing. Discrete surface contacts can show small temporary penetration during fast corner impacts; see the [implementation notes](docs/squishy-implementation.md).

## Make it your own

- `src/squishy/catalog.js`: collection, physical presets, product links, and world palettes.
- `src/squishy/shapes.js`: implicit sculptures, color regions, and facial landmarks.
- `src/physics/sticky-world.js`: collisions, adhesive bonds, and peeling.
- `src/squishy/`: rendering, faces, worlds, input presentation, selection, and UI.

```sh
npm run build:squishies
npm run test:squishies
```

The generated files in `public/models/` are ready to use. `npm run build:model` rebuilds only the historical Jelly Baby model. `npm run build:kernel` regenerates the embedded physics kernel and requires a Clang toolchain with `wasm32` support; choose it with `CLANG=/path/to/clang`. The current kernel was built with [wasi-sdk 34](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-34).

## Provenance

[Full credits](CREDITS.md) · [Initial repository audit](docs/repository-audit.md) · [Initial physics proposal](docs/squishy-physics.md) · [Unmodified original README](docs/jelly-baby-original-readme.md).

The original revision did not include a license file. This adaptation preserves attribution and does not declare a license on Scott's behalf. Font licenses are included alongside the font files.
