# Original repository audit

> Historical audit of Jelly Baby before the Squishy adaptation. See the [implementation notes](squishy-implementation.md) for the current game.

Audited September 6, 2026: `emmgui/squishy`, branch `main`, revision `61bbcaf` (`facial animations`), a fork of [Scott's Jelly Baby](https://github.com/scottstts/Jelly-Baby).

## Findings

The repository provides volumetric deformation, grabs that follow the real surface, and a soft translucent rendering system. Squishy primarily needs a new contact model, independent shape/material definitions, and passive toy posture. Replacing the entire solver would discard a tested foundation without solving adhesion by itself.

At this baseline there were no physical walls, adhesive constraints, self-collision, or tearing. The [initial physics proposal](squishy-physics.md) describes the intended additions.

## Architecture

| Area | Main files | Role |
| --- | --- | --- |
| Entry and UI | `src/main.ts`, `index.html`, `src/style.css` | Loading, diagnostics, controls, and identity |
| Orchestration | `src/game/runtime.ts` | Connects physics, camera, rendering, sound, and frame loop |
| Timing | `src/game/fixed-step.ts` | 240 Hz, frame interval capped at 50 ms, up to 12 substeps |
| Volumetric body | `src/physics/soft-body.js`, `constants.js` | Elasticity, volume resistance, orientation protection, grabs, and floor |
| Acceleration | `src/physics/soft-body-kernel.js`, `scripts/native/soft-body-kernel.c` | WebAssembly path; new constraints must also reach it |
| Model and binding | `scripts/build-model.mjs`, `scripts/model-cage.mjs`, `src/physics/baby-cage.ts` | Binary generation, cage loading, and skin bindings |
| Grabbing | `src/game/input.ts`, `src/physics/grab.ts` | BVH picking on deformed skin, multiple fingers, force limits, and throwing |
| Locomotion | `src/game/locomotion.ts` | Shape-specific posture, walking, and jumping |
| Material and face | `src/graphics/baby.ts`, `baby-face.ts`, `face-skin.ts`, `face-expression.ts` | Transmissive material and skin-attached facial details |
| Lighting | `src/graphics/environment.ts`, `studio-light.ts`, `refractive-light.js` | EXR, lighting, shadows, and caustics |
| Asynchronous optics | `src/graphics/transport.ts`, `transport.worker.ts` | Shadow/contact and transmission thickness, up to 30 requests/s with one in flight |
| Table and output | `src/graphics/table.ts`, `renderer.ts`, `composite.ts` | Horizontal receiver, pixel cap, WebGPU, compositing, and diagnostics |
| Sound | `src/game/sound.ts` | Procedural contact sounds |

## Baseline physics

The body has **980 nodes and 4,026 tetrahedra**, with a reference volume of approximately 181 cm³. Density is 1,050 kg/m³, giving a simulated mass of approximately **190 g** for the original character.

The visible surface has **72,234 vertices and 144,464 triangles**. The optical proxy has **10,090 vertices and 20,176 triangles**. There are **2,138 skin-bound contact samples**, but the baseline solver applies only a horizontal floor plane.

`PHYS` uses shear stiffness 1,200 Pa, bulk stiffness 65,000 Pa, damping 3, gravity 2.4 m/s², static/dynamic friction 0.65/0.42, restitution 0.065, and three iterations per 1/240-second substep. Grabs are limited to 2.8 N per component.

Elasticity couples shape and volume. Local orientation corrections protect compressed tetrahedra; existing scenarios check a minimum Jacobian of 0.12. Dissipation acts on relative edge velocities. Sleep follows approximately 0.45 seconds of sufficiently quiet motion under contact and interaction conditions.

Friction corrects tangential displacement after a floor penetration correction. It cannot resist normal separation: the baseline has no tensile constraint connecting skin to the support.

## Shape dependencies

1. `build-model.mjs` extracts geometry definitions from `refs/jelly_baby_mesh.html`, calls `buildJellyGeometry` / `jellySDF`, and sets a 7 cm height. It has no general shape interface at this revision.
2. The cage spacing is 7.5 mm; thin ears, tails, or folds need explicit resolution checks.
3. `FaceSkin` searches a front-facing XY window. New facial landmarks must be attached to the new surface.
4. Feet and arms are identified by coordinate thresholds. Passive posture forces could unintentionally pull a sticky toy off a wall.
5. Grab projection, collisions, the table, shadows, and caustics assume a horizontal floor. A visible wall alone does not create physical contact.
6. The baseline package name, copy, favicon, canonical URL, and social metadata use Jelly Baby identity. The adaptation needs its own identity while retaining explicit attribution.

## Differences from the inherited README

The [original README](jelly-baby-original-readme.md) is archived unchanged, but some descriptions lag behind this revision:

- It describes six substeps and an 8 ms catch-up cutoff; `FixedStepper` now accepts 12 substeps without that wall-clock budget.
- It describes worker-generated caustics; this revision uses GPU passes, while the worker supplies shadow/contact and thickness.
- It describes rolling back a whole step on inversion; the code repairs local elements and keeps `stepFraction = 1`.
- Its optical test claims include historical guarantees. Current tests construct the GPU graph and check CPU shadow/thickness, without validating browser caustic pixels.

## Proposed progression

Preserve the solver and regression suite while adding visible credits, independent shapes/materials, coherent wall contacts, local adhesion, peeling, and tuning. Keep Jelly Baby silhouette tests associated with the original model; add tests for the new collection.

## Baseline verification

Lint, TypeScript, physics, multi-touch, structural performance, face checks, and production build passed under Node 26.0.0. The initial Node 20.18 installation missed a native Rolldown binding; reinstalling with Node 26 resolved it without changing source or lockfile.

Measured baseline checks included rest volume at 99.49% of reference, a maximum multi-touch JavaScript/WebAssembly difference of approximately `8.33e-17`, and optical-proxy thickness RMS error of approximately 0.167 mm. These scenarios had no adhesion.

The baseline production bundle included about 1.03 MB of minified JavaScript, a 14.11 MB color texture, a 10.05 MB model, and a 6.09 MB EXR. These motivated mobile loading review; structural performance checks do not establish device frame rates.

Local documentation links, the byte-identical README archive, and whitespace checks passed. No local development server or browser inspection was run, following the repository instructions. This audit did not validate visual appearance, sound, device WebGPU support, or touch comfort. Changes at this historical stage were documentation only.
