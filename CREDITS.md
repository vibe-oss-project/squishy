# Credits

## Original creator

**Jelly Baby was created by Scott — [@scottstts](https://github.com/scottstts).**

- Original repository: **[scottstts/Jelly-Baby](https://github.com/scottstts/Jelly-Baby)**
- Original interactive demo: **[jelly.scottsun.io](https://jelly.scottsun.io)**
- Creator's website: [scottsun.io](https://scottsun.io)
- Starting revision: `61bbcaf` — `facial animations`.

Squishy Playground is an adaptation of Scott's project. The original character, reference scenes, volumetric physics, rendering systems, grabbing interactions, procedural sound, supplied assets, build tools, and verification scripts come from his work. Their inclusion here does not make them original work by this adaptation's author, and this attribution does not replace any third-party asset credits.

Scott's Git history is preserved. His [original README](docs/jelly-baby-original-readme.md) is archived without rewriting; its relative links were written for the original repository root.

## Squishy adaptation

Maintained by [Emmanuel Guillo — @emmgui](https://github.com/emmgui) in **[vibe-oss-project/squishy](https://github.com/vibe-oss-project/squishy)**. Work began in [emmgui/squishy](https://github.com/emmgui/squishy).

The adaptation adds ten implicit sculptures, classic and sticky material families, wall contacts, local adhesive bonds and peeling, mouse pins, new faces, five environments, and a collection interface. Scott's volumetric solver and grabbing system remain the foundation.

**Pastel Studio** is a new environment authored in Blender for this adaptation. Its editable sculptures, baked vertex shading, and web export are included in the repository. See the [studio source and authoring guide](docs/pastel-studio.md).

## Product and visual references

[Squishy Official](https://squishy-official.com/) provides the product references and visual inspiration for the brief. This project is not affiliated with the store. Product photos in `public/references/` serve as selection thumbnails and sculpting references. The product pages and photograph URLs are listed in [sources.json](public/references/sources.json). These images remain attributed to their respective rights holders and are not presented as original artwork by this adaptation.

The 3D sculptures interpret the available photographs. Sticky behavior is a property of the simulation, not a verified claim about each physical product. The store's primary color `#84D1FB` and its Fredoka / Lexend font families were recorded on September 6, 2026.

**Fredoka** and **Lexend** are distributed through Google Fonts under the **SIL Open Font License**. Their licenses are included in [fredoka-OFL.txt](public/fonts/fredoka-OFL.txt) and [lexend-OFL.txt](public/fonts/lexend-OFL.txt). Fonts are self-hosted in the game.

Additional sticky-toy and XPBD references appear in the [physics proposal](docs/squishy-physics.md). They informed the design; the adaptation's implementation is not attributed to those authors.

## License status

The original revision studied did not contain a `LICENSE` file, and GitHub did not detect an associated license. This document does not grant additional rights or declare a license on the original author's behalf.
