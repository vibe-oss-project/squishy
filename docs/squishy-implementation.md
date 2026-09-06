# Squishy implementation — September 6, 2026

This version replaces the game entry point with a collection of ten Squishy. It preserves Scott's volumetric physics and provenance, and is maintained in [vibe-oss-project/squishy](https://github.com/vibe-oss-project/squishy). A dedicated Vercel project serves the [live playground](https://squishy-snowy.vercel.app), with its production branch connected to `main`. The interface, README, credits, and project documentation are in English.

## What is implemented

| Request | Implementation |
| --- | --- |
| Five classic and five sticky toys | Ten sculptures and material presets, a photo selector, and product links |
| Reference likeness | Silhouettes, secondary volumes, colors, and faces interpreted from product photos |
| Multiple holds | Up to 16 independent touch holds, pen + touch, and persistent mouse pins |
| Opposing stretches and squeezes | Constraints act on distinct material points of the volume |
| Wall and floor adhesion | Contact planes, force-limited local bonds, peeling, aging, and reattachment cooldown |
| Cute expressions | Blinks, squinting eyes, subtle cheeks, and smiles driven by deformation and release |
| Visual direction | Fredoka, Lexend, the store's primary blue, and complementary pastel colors |
| Five environments | Cloud Nine, Mochi Room, Candy Break, Vanilla Beach, and Starry Dream |
| Original creator credit | Prominent README attribution, CREDITS, and an in-game credits dialog linking Scott's repository and demo |

## Models and visual references

`shapes.js` defines implicit volumes. Marching tetrahedra reconstructs a closed, indexed surface; `buildCage` associates it with a mechanical volume. Ears, paws, cheeks, burger layers, and other appendages belong to that volume.

Visible surfaces contain 15,504–29,784 vertices. Cages contain 1,176–3,000 tetrahedra. Each visible vertex follows a four-node stencil. The skin, ray picking, and facial details use the same deformed positions.

The milk carton is pink, the classic hamster and burger are orange, and the bunny is very pale pink. The reference catalog retains the source photograph URLs. Unseen backs, undersides, fine relief, paint imperfections, and internal details cannot be reconstructed exactly from these views. No manufacturer scans or 3D files were provided; pixel-perfect likeness is not verified.

## Physical differences

| Property | Classics | Sticky Mochi |
| --- | --- | --- |
| Simulation density | 280 kg/m³ | 980 kg/m³ |
| Shear stiffness | 310–520 Pa | 370–850 Pa |
| Bulk stiffness | 2,600–3,500 Pa | 26,000 Pa |
| Solver damping | 29–44 | 5–13 |
| Adhesion preset | 0 | 0.4–1, depending on the toy |
| Maximum grab force per axis | 1.5 N | 2.8 N |

These settings tune play feel; they are not product measurements. Classics use more compressible elasticity and stronger dissipation. The implementation does not include a complete cellular foam law or viscoelastic memory calibrated to a measured recovery time.

Gravity remains 2.4 m/s², as in the base project. Four fixed axis-aligned planes provide the floor, back wall, and side walls. Visual walls sit 0.3 mm behind the physical planes, leaving room for flat illustrations behind the contact surface. Throws far outside the arena reset the toy.

Adhesive bonds have a lifecycle separate from finger holds. One end follows the skin through barycentric interpolation; the other stays on the support. Bonds are solved between elasticity and grabbing passes. Estimated XPBD force, extension, and age can break each bond independently. A 0.35-second cooldown prevents immediate reattachment of the same sample.

There are at most 40 bonds, with a minimum spacing of 4.5 mm. Total capacity depends on mass and material preset. This is not an area-integrated adhesive traction or measured fracture law. Individual bonds age; total wall-hold time also depends on new contacts forming.

The C/WebAssembly solver imports four `StickyWorld` callbacks operating on shared position and velocity arrays. Elasticity stays accelerated in C while contacts use the same implementation as the JavaScript path.

## Interaction and selection

Pointer IDs own independent holds. The final release sample reaches the simulation before removal to preserve throwing. Pointer capture, cancellation, visibility changes, and focus loss are cleaned up.

Mouse pins persist without capturing the physical pointer, allowing a second grab. Shift + click removes a pin; Esc and Let go release all holds. Visible markers identify pins. A trackpad does not expose separate finger positions to the browser, so this workflow uses pins.

Selection aborts old downloads, ignores stale choices, warms models in bounded batches, and serializes GPU compilation with world changes. Previous geometry and materials are disposed after replacement. The old toy stays visible while the next one is prepared.

## Verification

The implementation passed lint, TypeScript, a production build, and the inherited physics, multi-touch, structural performance, and face tests. Additional checks cover:

- All ten closed meshes and normalized skin stencils.
- Top/bottom compression and opposing stretches on every toy, with finite states and preserved orientation barriers.
- Face attachment to deformed surfaces throughout expression cycles.
- The same wall throw with and without adhesion; only the sticky preset supports the toy's weight.
- Pull-off, aging, reset, bond limits, and five surface presets.
- JavaScript/WebAssembly parity: a maximum position difference of approximately **7.2 × 10⁻¹⁶ m** in the tested wall scenario.
- Mouse pins, pin mode, pen + touch, independent release, and focus loss.
- Aborted downloads, stale compilation, latest selection, serialized changes, and resource disposal.
- Fast corner throws: approximately **0.97–1.96 mm** maximum skin penetration in three tested scenarios without inversion. Discrete contacts do not guarantee perfect separation at every instant.
- The 4-million-pixel drawing-buffer cap, including effective DPR below 1.

With at most 768 contact samples, four iterations, and conservative plane culling, one local compression test pass measured approximately **0.94–2.05 ms per substep** across models. These are Node CPU timings on the development machine, excluding rendering. They do not guarantee a frame rate on a phone or iPad.

## Visual and device validation

The initial implementation did not start a local development server or browser inspection, following the repository instructions. TypeScript and Vite compilation do not execute shaders on a real GPU.

Hands-on review should check photo likeness, framing of all ten toys, on-screen colors and materials, environment readability, sound, and simultaneous gestures on physical phones and iPads. Material, adhesion, and expression settings are isolated for these adjustments.

The game requires WebGPU and provides no WebGL fallback. Historical source modules and assets remain for provenance and regression tests; the main entry point loads Squishy Playground.
