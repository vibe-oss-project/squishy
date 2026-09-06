# Initial physics proposal: soft and sticky Squishy

**Historical design document**, prepared September 6, 2026 before the ten models were chosen. It records the explored assumptions. See the [implementation notes](squishy-implementation.md) for the decisions actually implemented, tests, and limitations.

## References and material distinction

[Squishy Official](https://squishy-official.com/) describes PU foam toys, rubber models, and a silicone model. The reviewed pages did not provide measured stiffness, damping, or adhesive force for simulator calibration. The name “Squishy” alone does not establish wall adhesion.

The desired interaction appears in other toys: [Schylling's Wally Crawly Gummies](https://schylling.com/product/wally-crawly-gummies/) stretch and tumble down walls after being thrown; [Toysmith's Sticky Starfish](https://www.toysmith.com/products/sticky-starfish-12) is described as soft, stretchy, and sticky on hard surfaces. These references inform the interaction, not the selected products' exact composition.

The proposed starting point was a soft, nearly incompressible solid with damped recovery and temporary local adhesion. Its appearance could be satin, opaque, or translucent independently of its mechanics. A highly compressible foam needs a different material preset and potentially a more complete constitutive law.

## Intended feel

| Action | Response | Proposed mechanism |
| --- | --- | --- |
| Press the body | Flattening with lateral bulging | Low shear resistance and high bulk resistance |
| Release | Gradual recovery and a small wobble | Elasticity and internal dissipation |
| Throw at a wall | Flattening, small oscillation, local hold | Collision, low restitution, adhesive contact |
| Pull one side | One area stays attached while the body stretches | Local compliant, force-limited bonds |
| Keep pulling | Edges peel progressively | Bond failure driven by tension or separation work |
| Wait on a wall | Sagging, sliding, or falling | Weight, tangential creep, adjustable bond weakening |
| Set down | Stable rest, resistance when lifting | Separate normal support and adhesion |

The rest shape should remain recoverable. This does not require a liquid simulation. Damping alone does not reproduce a complete viscoelastic memory law; an internal relaxation state could be added if measured recovery calls for it.

## Preserve the mechanical foundation

The tetrahedral neo-Hookean / XPBD solver is suitable for stretching and lateral bulging. [XPBD by Macklin, Müller, and Chentanez](https://matthias-research.github.io/pages/publications/XPBD.pdf) provides adjustable compliance and a force estimate that can inform bounded bonds. The proposed adhesive application is our design, not a Squishy model supplied by the paper.

Begin by adjusting shear stiffness and internal dissipation. Preserve a persistent rest shape rather than animating positions directly or making deformation permanent.

## Floor and walls

Replace the single `y >= PHYS.floor` assumption with fixed world planes having position, normal, and surface presets. Keep visible walls and physical contact surfaces coherent.

Reuse barycentrically bound skin samples. For point `p`, unit normal `n`, and plane constant `d`, signed distance is `dot(n, p) - d`. Collision prevents penetration; adhesion separately resists separation. Compressive friction alone cannot hold a body against a wall.

Include simultaneous corner contacts, fast throws, and a strict work budget per substep.

## Distributed bonds and peeling

Each bond connects a material point on the skin to a support anchor, with support identity, barycentric weights, age, damage state, and constraint variables. XPBD multipliers accumulate within a substep; carrying them between substeps would require separate validation.

Proposed lifecycle: `free → contact → attached → peeling → free`.

1. **Capture:** create bonds only at contact or within a very short geometric tolerance. Do not attract distant surfaces. Impacts may extend the contact area without increasing each bond's strength without bound.
2. **Hold:** solve compliant normal and tangential constraints alongside elasticity, grabs, and collisions. Limit normal adhesion; tangential response may include a threshold and creep.
3. **Distribute:** ideally weight capacity by representative skin area, for example `maximum force = adhesive traction × area`, so doubling sample count does not double adhesion.
4. **Peel:** tension loads edge bonds. Separation or accumulated work can reduce capacity until local failure. In the chosen XPBD convention, `force ≈ |lambda| / h²` provides an estimate.
5. **Release:** remove bonds without artificial impulses. Use a cooldown and distinct separation/capture thresholds to avoid immediate reattachment.

Gravity must remain active. Timed weakening can make falling useful for play but would be a gameplay choice, not a measured product constant. A floor bond can fail while gravity keeps the toy resting on the floor.

Do not freeze the character's center or disable its dynamics when attached. The suspended body should still deform. Finger holds and adhesive bonds have different lifecycles and should not share the `grabs` array.

## Independent profiles

The proposed separation is shape geometry and facial landmarks, material softness/recovery/adhesion, and support friction/adhesion/restitution. The conceptual `ShapeDefinition`, `MaterialProfile`, and `SurfaceProfile` interfaces were not present in the baseline.

| Setting | Baseline | Initial exploration |
| --- | --- | --- |
| Shear stiffness | 1,200 Pa | 400–1,200 Pa with stability checks |
| Bulk stiffness | 65,000 Pa | Preserve initially, then measure volume and strain |
| Internal dissipation | `damping = 3` | Try 1–3 times the value; not measured viscosity |
| Restitution | 0.065 | Compare 0–0.065 with and without adhesion |
| Gravity | 2.4 m/s² | Preserve during comparison |
| Visible recovery | No time parameter | Explore 0.3–1.5 seconds after standardized pressure |
| Wall hold | None | Explore 0.5–3 seconds in a fixed scenario |
| Pull-off force | None | Tune against mass, contact area, and grab force |

These are design hypotheses, not certified product properties. Recovery and hold durations are outcomes to measure, not guarantees controlled by one coefficient. Total adhesive capacity must still allow gradual peeling by a grab.

## Integration

- Use passive toy posture so anatomical muscles do not unintentionally detach the body.
- Keep bodies awake while bonds age, creep, or peel; reset all bonds with R.
- Preserve exact picking, multiple holds, throwing, and focus-loss cleanup. Extend contact handling beyond the table.
- Integrate changes into both JavaScript and the active C/WebAssembly path, then regenerate the embedded kernel.
- Choose roughness and transmission from the visual reference; gloss does not establish adhesion. Walls need coherent shadows and contacts.
- Reuse procedural sounds and add restrained impact/peeling events, grouped to avoid one sound per bond.

## Validation targets

Compare zero adhesion with sticky behavior; press and release; throw normally and obliquely; pull slowly and quickly with multiple holds; wait on walls; contact the floor, wall, and corners; vary contact density; reset and lose focus; render at 30/60/120 Hz over fixed-step physics; compare JavaScript and WebAssembly; and measure long-session memory and cost on mobile.

Desired criteria include bounded recovery, controlled volume, no invalid states or inversion, contact-only adhesion, gravity during wall holds, progressive local release, no ghost grabs, bounded bond counts, and comparable total capacity when sampling density changes. These were proposed targets; the implementation notes state what was actually tested and where approximations remain.

Browser checks are also needed for appearance, sound, and tactile feel. Reference dimensions, additional views, and a short video of squeezing and throwing would help calibrate the chosen toy without guessing its material.
