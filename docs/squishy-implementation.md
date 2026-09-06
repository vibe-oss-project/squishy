# Squishy implementation — September 6, 2026

This playground adapts [Scott's Jelly Baby](https://github.com/scottstts/Jelly-Baby), preserving its volumetric physics, history, and credit. The maintained repository is [vibe-oss-project/squishy](https://github.com/vibe-oss-project/squishy); [the live playground](https://squishy-snowy.vercel.app) deploys from `main` to a dedicated Vercel project. The interface and documentation are in English.

## Interaction

Classics start in **Squish** mode. A stationary press pushes a broad fingertip patch into the actual mechanical volume. Three temporary supporting palm patches stop that pressure from simply moving the whole toy. Each touch has its own material point and pressure value: slide to knead, pull two points apart, or bring them together horizontally or vertically. Releasing the last press removes the palm and most rigid translation velocity, while retaining elastic recovery.

**Grab & throw** moves the toy freely. Sticky toys start in this mode. Once a drag moves away from its initial point, the pointer ray projects toward the visible back or side wall. A depth allowance for the toy presses its skin against that surface. Releasing removes the finger constraint; adhesive bonds then carry the weight. Picking up a mounted toy and dragging outward opens and progressively weakens the nearby patch. Opening patches cannot form fresh bonds while being peeled. This closes the previous gap where every grab stayed on a camera-parallel plane and could never reach the wall behind it.

Pointer IDs own independent holds. The native budget is 16 constraints: up to 13 user holds plus the palm in Squish mode, or 16 user holds in Grab & throw mode. Mouse pins allow opposing holds without a touch screen. Trackpads do not expose individual fingers as separate touch points; use Shift + click or Pin a point in Grab & throw mode. Cancellation, focus loss, toy changes, world changes, and mode changes release holds and capture. The final pointer sample is simulated before removal to preserve throws.

## Physical presets

| Property | Classics | Sticky Mochi |
| --- | --- | --- |
| Density | 160–220 kg/m³ | 980 kg/m³ |
| Shear stiffness | 120–340 Pa | 370–850 Pa |
| Bulk stiffness | 1,100–1,600 Pa | 26,000 Pa |
| Damping | 58–68 | 5–13 |
| Gravity | 1.2 m/s² | 2.4 m/s² |
| Adhesion | 0 | 0.4–1, depending on toy |
| Maximum grab force per axis | 1.6 N | 2.8 N |

These are play presets, not measured product properties. Classics use compressible elasticity and stronger dissipation. There is no laboratory-calibrated cellular foam or viscoelastic memory law.

The floor and wall contacts use barycentric samples of the deforming skin. There are at most 768 contact samples and 48 adhesive bonds. Capture occurs within 0.65 mm of a support, with bonds spaced at least 4 mm apart. Each bond has finite stiffness and force capacity, ages over 6–12 seconds, and can break earlier under extension or traction. A 0.35-second sample cooldown prevents immediate reattachment. Individual bonds age separately; new contacts can change the total hold duration. Gravity stays active.

The C/WebAssembly solver calls the same `StickyWorld` hooks as the JavaScript path between elastic and grab iterations. Physics runs at 240 Hz with four iterations, bounded to twelve substeps per rendered frame. Conservative plane culling avoids contact work against unreachable surfaces.

## Worlds and camera

All five palettes support both families: **Pastel Studio**, **Mochi Room**, **Candy Break**, **Vanilla Beach**, and **Starry Dream**. Pastel Studio replaces Cloud Nine with an editable Blender scene: a continuous cream floor, sculpted accessories, baked vertex occlusion, and rounded ceramic floor coves. Its open and sticky compositions share one cached GLB and use fewer than ten asset draw calls each. The other four worlds retain their procedural artwork. See the [studio authoring guide](pastel-studio.md).

Classics have an open floor and no visible or physical walls; distant scenery fades softly into the background. Sticky worlds have a 37 cm wide room, a back wall at −14 cm, and side walls at ±18.5 cm. Vertical collision planes have no height limit. Large visual wall panels follow the camera vertically, retaining color above the original room; the procedural worlds also repeat their illustrations. Studio reliefs stay near the initial play area.

Moving above the original room no longer resets the toy. Only escape more than three metres horizontally from the origin, or below the floor, triggers recovery. Reset restores the view as well as the toy. Framing accounts for the collection dock and the gesture buttons on desktop, phone, and tablet layouts.

## Models and rendering

`shapes.js` defines implicit volumes; marching tetrahedra reconstructs closed, indexed skins. Refined edge roots and finer sampling produce approximately 48,000–94,000 visible vertices per model. The mechanical cages remain much smaller, around 1,200–3,000 tetrahedra. Rounded supporting undersides make upright resting poses more stable without adding adhesion to classics.

The visible mesh, picking, and face attachment share the same deformed surface. Rest-space paint is evaluated per fragment with derivative antialiasing, removing color borders that previously followed individual triangles. Eyes and mouth curves have more segments. Matte grain is subtle, while sticky materials have a satin finish. Neutral tone mapping preserves the pastel palette. A 2,048-pixel shadow map uses thirteen fixed weighted samples, with constant light orientation and a projection that follows high throws on whole shadow texels. A six-millimetre camera near plane improves depth precision. Every world uses one ground surface instead of almost-coplanar disks and stars. The renderer retains MSAA and the strict four-million-pixel drawing-buffer cap, including effective DPR below one on very large displays.

The sculptures interpret product photographs, including unseen backs and undersides. They are not verified pixel-perfect replicas. No manufacturer scans or 3D files were supplied. Product references, creator attribution, and the original demo remain linked from the README and in-game credits.

## Verification and limits

Automated checks cover:

- All ten closed meshes, skin stencils, pressure and opposing stretch, finite states, and orientation barriers.
- Stationary presses, recovery, independent touch release, mouse pins, pen + touch, and palm cleanup.
- Actual input handlers driving wall placement, release under gravity, and peeling on the five sticky toys.
- Bond force, age, reset, cooldown, and five world presets; JavaScript/WebAssembly agreement.
- Ten-second resting poses, open classic worlds, and visual walls following a camera 100 metres above the origin.
- Deformed expressions, selection cancellation, serialized shader preparation, and resource disposal.
- Fast impacts and the drawing-buffer cap, alongside inherited physics and rendering regressions.

Discrete contact samples can allow small temporary penetration during abrupt impacts. In three checked scenarios, maximum visible penetration was about 0.98–1.35 mm; this is not a guarantee of perfect separation in every possible gesture.

GPU inspection uses deployed Vercel previews, without starting a local development server. Desktop Chrome and responsive phone/tablet layouts can validate shader compilation, framing, and controls. Simultaneous gestures on physical phones and iPads, their sustained frame rates, and exact product likeness still need hands-on device review. Node timings exclude rendering and vary with machine load; they are not mobile frame-rate claims.

The game requires WebGPU, with no WebGL fallback. Startup and fatal GPU failures stop the render loop and show diagnostics. Scott's historical modules, assets, and tests remain for provenance and regression coverage.
