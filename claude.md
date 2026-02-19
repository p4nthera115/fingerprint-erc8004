# Agent Fingerprint

## What This Is

A deterministic visual identity system for AI agents. Takes any agent identifier (MCP server URL, A2A agent card endpoint, ERC-8004 token URI, wallet address, or any arbitrary string) and produces a unique, consistent 3D visual fingerprint. Same input → same output, every time.

Think: GitHub identicons but beautiful, 3D, and shader-rendered.

## Tech Stack

- **Framework:** Vite + React
- **3D Rendering:** React Three Fiber (@react-three/fiber, @react-three/drei) — starting point, not a hard constraint
- **Shaders:** Custom GLSL (vertex + fragment shaders), or Canvas 2D, SVG, etc. — explore what looks best
- **Hashing:** Web Crypto API (SHA-256) — no external crypto libraries needed
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion (UI), R3F useFrame (3D)
- **Language:** TypeScript

## Rendering Approach

The visual system is **not locked to 3D**. R3F + GLSL shaders are the starting point because they're a core strength and enable effects that are hard to achieve otherwise, but the fingerprint might end up as:

- A 3D shader-rendered object (R3F + custom GLSL)
- A 2D canvas/WebGL shader (raw canvas or a simple WebGL quad)
- A procedural SVG pattern
- A hybrid (2D base with shader post-processing)
- Something else entirely

Explore multiple approaches. The hash → config pipeline is rendering-agnostic by design — the same visual config object should be able to drive any renderer. Let the visuals dictate the approach, not the other way around.

## Architecture

### Core Pipeline

```
Input String → SHA-256 Hash → Byte Mapping → Visual Config → R3F Renderer
```

1. **Hash Function:** Take any string input, produce a deterministic SHA-256 hash (hex string / byte array)
2. **Parameter Mapper:** Map specific byte ranges to independent visual axes:
   - Bytes 0-2: Primary hue / color palette
   - Bytes 3-5: Secondary color
   - Bytes 6-7: Geometry class (sphere, torus, icosahedron, octahedron, etc.)
   - Bytes 8-9: Internal pattern type (voronoi, noise, rings, grid, etc.)
   - Bytes 10-11: Pattern frequency / density
   - Bytes 12-13: Border / outline style
   - Bytes 14-15: Rotation speed + direction
   - Bytes 16-17: Particle density
   - Bytes 18-19: Waveform / displacement amplitude
   - Bytes 20-23: Animation behavior modifiers
   - Bytes 24-31: Reserved for future visual axes
     (These ranges are a starting point — adjust as the visual design evolves)
3. **Visual Config Object:** Pure typed object that fully describes the visual. No rendering logic.
4. **Renderer:** Takes the config, renders the fingerprint. Starting with R3F + custom GLSL shaders, but the config object should be renderer-agnostic.

### Key Files (expected structure)

```
src/
  lib/
    hash.ts              — SHA-256 hashing utilities
    parameterMapper.ts   — Hash bytes → visual config object
    types.ts             — TypeScript types for visual config
  components/
    Fingerprint.tsx      — Main fingerprint component (rendering approach may vary)
    FingerprintCanvas.tsx — R3F Canvas wrapper (if using 3D approach)
    shaders/
      fingerprint.vert   — Vertex shader (if using GLSL approach)
      fingerprint.frag   — Fragment shader (if using GLSL approach)
  App.tsx                — Demo page with input field + live preview
```

## Design Constraints

- **Perceptual distance is critical:** Similar inputs must NOT produce similar-looking visuals. Map hash segments to independent visual axes so small input changes cascade into large visual differences.
- **Multi-scale readability:** Must look visually distinct at 48x48px (list view) AND stunning at full size. Test both.
- **Large combinatorial space:** Each visual axis should be independent. With 8+ axes and 256 values each, the space should be enormous.
- **Deterministic:** Pure function. No randomness. Same input = same visual, always, on every device.
- **Protocol-agnostic:** The system doesn't care what the input string represents. It just hashes it.
- **Performance:** Should render smoothly. Shaders should be optimized — this could end up rendering many fingerprints in a grid/list view.

## GLSL Shader Guidelines (When Using Shader Approach)

- Use uniforms for all hash-derived parameters (colors, frequencies, amplitudes, pattern selection)
- Prefer procedural patterns (noise, voronoi, fbm) over textures for smaller bundle size
- Vertex displacement for organic, unique shapes — not just flat color mapping
- Time uniform for subtle animation (slow rotation, breathing, shimmer) — not frantic movement
- Keep shader code modular: pattern functions, color functions, displacement functions as reusable blocks

## What This Is NOT

- Not a blockchain project (no Web3 libraries, no wallet connection, no on-chain reads — yet)
- Not a trust scoring system (the fingerprint is visual identity, not reputation)
- Not an API (yet) — start as a visual component + demo site

## Development Notes

- Start with the hash → config pipeline as a pure function, testable without any 3D code
- Build a single fingerprint component, get it looking great for one input
- Then verify visual diversity across many different inputs
- The demo page should have a text input where you paste any string and see the fingerprint update live
- Consider a grid view showing many fingerprints side-by-side to verify visual diversity
- Dark background for the renderer — these should glow and feel alive

## Strategic Context

This is the first visible artifact in a larger agent identity/trust project. The fingerprint is meant to be:

1. A shareable, visually striking demo that puts the author in the agent identity conversation
2. A portfolio piece showing R3F + shader expertise applied to a real problem space
3. A foot in the door — the response to shipping this publicly will reveal what to build next

The broader thesis: AI agents need visual identity and trust infrastructure. The fingerprint is step one.

## Code Style

- Functional components, hooks-based
- Prefer composition over complexity
- Type everything — no `any`
- Keep shader uniforms well-documented
- Name things clearly — this is meant to eventually be open-sourced
