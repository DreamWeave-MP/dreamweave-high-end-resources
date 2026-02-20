# Dreamweave Resources

This repository contains a selection of shader mods which typically cannot be preinstalled due to requiring edits to OpenMW's core resources. Dreamweave modlists accomplish this by utilizing advanced features of OpenMW.cfg.

The following are bundled in DW-Resources:

- Components of OpenMW, specifically the `resources` directory shipped in Linux builds (they are not platform-specific)
- [Wareya's PBR shader](https://github.com/wareya/OpenMW-PBR/tree/main)
- [Wareya's OpenMW Shaders](https://github.com/wareya/OpenMW-Shaders/tree/main)
- [Kartoffels' OpenMW Shaders Collection](https://github.com/kartoffels123/kart-openmw-shaders-collection/tree/master)

Licenses for bundled content allow for redistribution. Wareya's shader packages are unmodified save for the renaming of readme and license files for uniqueness.

The only functional modification to any of the contents of this archive, is the automation of changes to `water.frag` as suggested by `Wareya's OpenMW Shaders`, for the purposes of using their screenspace water reflections. Variants with and without this change are made available.

While this resource pack was originally intended exclusively for high end machines running wareya's PBR shaders, it is now intended to provide clean resource directories with optional improved shaders for everyone's ease of use. However, PBR archives are available if you've got the GPU headroom.

Speaking of GPU headroom, the [Morrowind Watercolor HD Upscale](https://www.nexusmods.com/morrowind/mods/56990) and [Tamriel Data and OAAB Watercolor Upscale](https://www.nexusmods.com/morrowind/mods/57094) are both highly recommended for use with PBR variants of this module for consistency, beauty, and further ease of use.

## Installation

There are various release options available according to your preference.

Pick the following:
1. Whether you use a `stable` or `dev` build of OpenMW
2. Whether to use Wareya's water shader (recommended!!)
3. Whether to use Kartoffel's soft shadows shader (recommended!!)
4. Whether to use Wareya's PBR, Kartoffels' toon shader, or neither
5. Download the appropriate release.
6. **RENAME YOUR SETTINGS.CFG TO _SETTINGS.CFG!**
7. Extract it anywhere, preferably next to your default [user openmw.cfg](https://openmw.readthedocs.io/en/stable/reference/modding/paths.html#configuration-files-and-log-files). On Windows, this is in `Documents/My Games/OpenMW`.
8. Assuming you extracted the resources directory next to openmw.cfg, open openmw.cfg in a text editor and add this line: `resources=resources`
9. Most releases have a `settings.cfg` including the necessary changes to make the shaders work. If one was included, reapply the changes from your _settings.cfg to it. If not, rename `_settings.cfg`, back to `settings.cfg`.
10. Done!
