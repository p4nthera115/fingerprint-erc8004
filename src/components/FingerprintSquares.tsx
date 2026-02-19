/**
 * FingerprintSquares — SVG square-grid renderer.
 *
 * Renders a 10×10 grid of solid squares on a dark background.
 * The top-left 3×3 cells are replaced by a 9×9 binary sub-grid,
 * unique per fingerprint. The remaining cells use one of three
 * pattern types (spiral / rings / checkerboard) with continuous
 * grayscale fill. A handful of accent cells carry the fingerprint's
 * primary hue with a subtle CSS shimmer animation.
 */

import type { VisualConfig, PatternType } from '../lib/types'

interface Props {
  config: VisualConfig
  /** Accepted for renderer-agnostic callers; unused in this renderer. */
  interactive?: boolean
  className?: string
}

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID       = 9            // main grid cells per axis
const CORNER     = 3            // detail corner: spans this many main cells
const SUB_F      = 3            // sub-cells per main cell inside corner
const CELL       = 100 / GRID   // main-cell size in SVG units (viewBox 100×100)
const SUB_TOTAL  = CORNER * SUB_F                  // = 9 sub-cells per axis
const SUB_CELL   = (CORNER * CELL) / SUB_TOTAL     // ≈ 3.333 SVG units

// ── Fixed colors ──────────────────────────────────────────────────────────────

const BG    = '#0e0e0f'
const INK   = 'rgb(15,15,17)'
const PAPER = 'rgb(238,238,235)'

// ── Pattern remap ─────────────────────────────────────────────────────────────

const PATTERN_REMAP: Record<PatternType, number> = {
  voronoi:   0,   // spiral
  noise:     0,
  hexagonal: 0,
  spiral:    0,
  dots:      1,   // rings
  rings:     1,
  grid:      2,   // checkerboard
  stripes:   2,
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function fract(x: number): number {
  return x - Math.floor(x)
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Port of GLSL cellHash — deterministic float in [0, 1).
function cellHash(cx: number, cy: number, seed: number, seed2: number): number {
  const qx = cx + seed * 0.31 + 7.3
  const qy = cy + seed2 * 0.47 + 11.9
  return fract(Math.sin(qx * 211.7 + qy * 391.1) * 98765.4321)
}

// ── Color helpers ─────────────────────────────────────────────────────────────

// Lerp between paper (t=0) and ink (t=1).
function grayFill(t: number): string {
  const r = Math.round(238 + (15  - 238) * t)
  const g = Math.round(238 + (15  - 238) * t)
  const b = Math.round(235 + (17  - 235) * t)
  return `rgb(${r},${g},${b})`
}

function hslCss(hNorm: number, s: number, l: number): string {
  return `hsl(${(hNorm * 360).toFixed(1)},${(s * 100).toFixed(1)}%,${(l * 100).toFixed(1)}%)`
}

// ── Pattern value (0 = paper, 1 = ink) ───────────────────────────────────────

function cellPattern(
  cx: number, cy: number,
  patternType: number,
  patternFrequency: number,
  patternDensity: number,
  numArms: number,
): number {
  const nx = (cx + 0.5) / GRID * 2 - 1
  const ny = (cy + 0.5) / GRID * 2 - 1
  const r  = Math.sqrt(nx * nx + ny * ny)

  if (patternType === 0) {                // Spiral
    const theta = Math.atan2(ny, nx)
    const arms  = Math.round(numArms)
    const raw   = theta / (2 * Math.PI) * arms + r * (1.4 + patternFrequency * 0.12)
    const t     = ((raw % 1) + 1) % 1    // GLSL mod, handles negatives
    const armW  = 0.28 + patternDensity * 0.22
    const inArm = 1 - smoothstep(armW - 0.08, armW + 0.08, t)
    const hub   = 1 - smoothstep(0.18, 0.28, r)
    return Math.max(inArm, hub)
  }

  if (patternType === 1) {                // Concentric rings
    const wave  = Math.sin(r * Math.PI * (2 + patternFrequency * 0.30))
    const rings = (wave + 1) * 0.5
    const hub   = 1 - smoothstep(0.12, 0.22, r)
    return Math.max(rings, hub)
  }

  return (cx + cy) % 2 === 0 ? 1 : 0     // Checkerboard
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FingerprintSquares({ config, className = 'w-full h-full' }: Props) {
  const patternType = PATTERN_REMAP[config.patternType] ?? 0
  const numArms     = Math.ceil(config.displacementFrequency / 2)
  const seed1       = config.patternDensity   * 100 + config.shimmerIntensity * 10
  const seed2       = config.breatheScale     * 100 + config.colorShift       * 100
  const accentColor = hslCss(config.primaryHue / 360, config.primarySaturation, 0.56)
  // pulseRate 0.2–2.0 → shimmer duration 5s–0.5s
  const shimmerDur  = `${(1 / config.pulseRate).toFixed(2)}s`

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* Shimmer uses brightness so it doesn't fight the per-cell opacity attribute */}
      <style>{`@keyframes fp-shimmer{0%,100%{filter:brightness(.82)}50%{filter:brightness(1)}}`}</style>

      {/* Background */}
      <rect width="100" height="100" fill={BG} />

      {/* ── Main grid (corner area excluded) ── */}
      {Array.from({ length: GRID }, (_, cy) =>
        Array.from({ length: GRID }, (_, cx) => {
          if (cx < CORNER && cy < CORNER) return null

          const hash   = cellHash(cx, cy, seed1, seed2)
          const accent = hash > 0.95

          if (accent) {
            // Second hash drives opacity (0.35–1.0); third drives animation phase offset.
            const opacity   = 0.35 + cellHash(cx + 43.1, cy + 67.9, seed1, seed2) * 0.65
            const delay     = (cellHash(cx + 89.7, cy + 71.3, seed1, seed2) * 2).toFixed(2)
            return (
              <rect
                key={`m-${cx}-${cy}`}
                x={cx * CELL} y={cy * CELL}
                width={CELL} height={CELL}
                fill={accentColor}
                opacity={opacity}
                style={{ animation: `fp-shimmer ${shimmerDur} ${delay}s ease-in-out infinite` }}
              />
            )
          }

          // Pattern sets the tone (dominant); grain adds per-cell variation within that tone.
          // Non-arm cells land in [0, 0.45], arm cells in [0.65, 1.0] — distinct zones, each varied.
          const pattern  = cellPattern(cx, cy, patternType, config.patternFrequency, config.patternDensity, numArms)
          const grain    = cellHash(cx + 17.3, cy + 23.1, seed1, seed2)
          const fillVal  = Math.min(1, pattern * 0.65 + grain * 0.45)
          return (
            <rect
              key={`m-${cx}-${cy}`}
              x={cx * CELL} y={cy * CELL}
              width={CELL} height={CELL}
              fill={grayFill(fillVal)}
            />
          )
        })
      )}

      {/* ── Detail corner — 9×9 binary sub-grid (top-left) ── */}
      {Array.from({ length: SUB_TOTAL }, (_, sy) =>
        Array.from({ length: SUB_TOTAL }, (_, sx) => (
          <rect
            key={`s-${sx}-${sy}`}
            x={sx * SUB_CELL} y={sy * SUB_CELL}
            width={SUB_CELL} height={SUB_CELL}
            fill={cellHash(sx + 97.3, sy + 113.7, seed1, seed2) > 0.5 ? INK : PAPER}
          />
        ))
      )}
    </svg>
  )
}
