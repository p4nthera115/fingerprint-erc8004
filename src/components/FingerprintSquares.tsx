/**
 * FingerprintSquares — SVG square-grid renderer.
 *
 * Renders a 9×9 grid of solid squares on a dark background.
 * The top-left 3×3 cells are replaced by a 9×9 binary sub-grid,
 * unique per fingerprint. The remaining cells use concentric rings
 * with continuous grayscale fill. Rings carry a subtle radial depth
 * gradient — valleys between rings darken toward the center, giving
 * a concave bowl feel. A handful of accent cells carry the
 * fingerprint's primary hue with a subtle CSS shimmer animation.
 */

import type { VisualConfig } from "../lib/types"

/** One pixel of a pixelated logo: its color and how opaque it should be. */
export interface LogoPixel {
  color: string  // CSS color, e.g. "rgb(r,g,b)"
  opacity: number // 0 (transparent → pattern shows) … 1 (fully opaque)
}

interface Props {
  config: VisualConfig
  /** Accepted for renderer-agnostic callers; unused in this renderer. */
  interactive?: boolean
  className?: string
  /**
   * Optional 81-element array (9×9, row-major). The hash-derived binary pattern
   * is always rendered as the base layer; these pixels are composited on top so
   * the pattern shows through wherever the logo is light/transparent.
   */
  logoCorner?: LogoPixel[]
}

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID = 9 // main grid cells per axis
const CORNER = 3 // detail corner: spans this many main cells
const SUB_F = 3 // sub-cells per main cell inside corner
const CELL = 100 / GRID // main-cell size in SVG units (viewBox 100×100)
const SUB_TOTAL = CORNER * SUB_F // = 9 sub-cells per axis
const SUB_CELL = (CORNER * CELL) / SUB_TOTAL // ≈ 3.333 SVG units

// ── Fixed colors ──────────────────────────────────────────────────────────────

const BG = "#0e0e0f"
const INK = "rgb(15,15,17)"
const PAPER = "rgb(238,238,235)"

// ── Mini constants ────────────────────────────────────────────────────────────

/** The central 3×3 cells of the 9×9 grid (cx/cy indices 3–5). */
const MINI_CENTER = 3
const MINI_SIZE = 3
const MINI_CELL = 100 / MINI_SIZE // each mini cell = 33.33 SVG units

// ── Pattern remap ─────────────────────────────────────────────────────────────


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
  const r = Math.round(238 + (15 - 238) * t)
  const g = Math.round(238 + (15 - 238) * t)
  const b = Math.round(235 + (17 - 235) * t)
  return `rgb(${r},${g},${b})`
}

function hslCss(hNorm: number, s: number, l: number): string {
  return `hsl(${(hNorm * 360).toFixed(1)},${(s * 100).toFixed(1)}%,${(
    l * 100
  ).toFixed(1)}%)`
}

// ── Pattern value (0 = paper, 1 = ink) ───────────────────────────────────────

// Concentric rings with radial depth gradient.
// Valleys (dark inter-ring areas) darken progressively toward the center,
// creating a subtle concave bowl / tunnel feel.
function cellPattern(
  cx: number,
  cy: number,
  patternFrequency: number
): number {
  const nx = ((cx + 0.5) / GRID) * 2 - 1
  const ny = ((cy + 0.5) / GRID) * 2 - 1
  const r = Math.sqrt(nx * nx + ny * ny)
  const wave = Math.sin(r * Math.PI * (2 + patternFrequency * 0.3))
  const rings = (wave + 1) * 0.5
  const valley = 1 - rings // 1 at trough, 0 at ring peak
  const radialBias = 1 - smoothstep(0.1, 0.85, r) // 1 at center, 0 at edge
  const depth = valley * radialBias * 0.3 // max +0.30 extra darkness at center trough
  const hub = 1 - smoothstep(0.12, 0.22, r)
  return Math.max(Math.min(1, rings + depth), hub)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FingerprintSquares({
  config,
  className = "w-full h-full",
  logoCorner,
}: Props) {
  const seed1 = config.patternDensity * 100 + config.shimmerIntensity * 10
  const seed2 = config.breatheScale * 100 + config.colorShift * 100
  const hue = config.primaryHue
  const sat = (config.primarySaturation * 60 + 30).toFixed(1)
  const accentColor = hslCss(
    config.primaryHue / 360,
    config.primarySaturation,
    0.56
  )
  // pulseRate 0.2–2.0 → shimmer duration 5s–0.5s
  const shimmerDur = `${(1 / config.pulseRate).toFixed(2)}s`

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      {/* Shimmer uses brightness so it doesn't fight the per-cell opacity attribute */}
      <style>{`@keyframes fp-shimmer{0%,100%{filter:brightness(.82)}50%{filter:brightness(1)}}`}</style>

      {/* Background */}
      <rect width="100" height="100" fill={BG} />

      {/* ── Main grid (corner area excluded) ── */}
      {Array.from({ length: GRID }, (_, cy) =>
        Array.from({ length: GRID }, (_, cx) => {
          if (cx < CORNER && cy < CORNER) return null

          // The very center cell is always a bright accent with shimmer.
          const isCenter = cx === MINI_CENTER + 1 && cy === MINI_CENTER + 1
          if (isCenter) {
            const delay = (cellHash(cx + 89.7, cy + 71.3, seed1, seed2) * 2).toFixed(2)
            return (
              <rect
                key={`m-${cx}-${cy}`}
                x={cx * CELL}
                y={cy * CELL}
                width={CELL}
                height={CELL}
                fill={accentColor}
                opacity={0.93}
                style={{
                  animation: `fp-shimmer ${shimmerDur} ${delay}s ease-in-out infinite`,
                }}
              />
            )
          }

          const hash = cellHash(cx, cy, seed1, seed2)
          const accent = hash > 0.95

          if (accent) {
            // Second hash drives opacity (0.35–1.0); third drives animation phase offset.
            const opacity =
              0.35 + cellHash(cx + 43.1, cy + 67.9, seed1, seed2) * 0.65
            const delay = (
              cellHash(cx + 89.7, cy + 71.3, seed1, seed2) * 2
            ).toFixed(2)
            return (
              <rect
                key={`m-${cx}-${cy}`}
                x={cx * CELL}
                y={cy * CELL}
                width={CELL}
                height={CELL}
                fill={accentColor}
                opacity={opacity}
                style={{
                  animation: `fp-shimmer ${shimmerDur} ${delay}s ease-in-out infinite`,
                }}
              />
            )
          }

          // Pattern sets the tone (dominant); grain adds per-cell variation within that tone.
          // Non-arm cells land in [0, 0.45], arm cells in [0.65, 1.0] — distinct zones, each varied.
          const pattern = cellPattern(cx, cy, config.patternFrequency)
          const grain = cellHash(cx + 17.3, cy + 23.1, seed1, seed2)
          const fillVal = Math.min(1, pattern * 0.65 + grain * 0.45)

          // Central 3×3 cells use the dark hue palette (mini region).
          const isMini =
            cx >= MINI_CENTER &&
            cx < MINI_CENTER + MINI_SIZE &&
            cy >= MINI_CENTER &&
            cy < MINI_CENTER + MINI_SIZE
          const fill = isMini
            ? `hsl(${hue},${sat}%,${(7 + (1 - fillVal) * 21).toFixed(1)}%)`
            : grayFill(fillVal)

          return (
            <rect
              key={`m-${cx}-${cy}`}
              x={cx * CELL}
              y={cy * CELL}
              width={CELL}
              height={CELL}
              fill={fill}
            />
          )
        })
      )}

      {/* ── Detail corner — 9×9 binary sub-grid (top-left) ── */}
      {/* Base layer: always the hash-derived binary pattern; dimmed when logo overlays it */}
      <g opacity={logoCorner ? 0.1 : 1}>
        {Array.from({ length: SUB_TOTAL }, (_, sy) =>
          Array.from({ length: SUB_TOTAL }, (_, sx) => (
            <rect
              key={`s-${sx}-${sy}`}
              x={sx * SUB_CELL}
              y={sy * SUB_CELL}
              width={SUB_CELL}
              height={SUB_CELL}
              fill={cellHash(sx + 97.3, sy + 113.7, seed1, seed2) > 0.5 ? INK : PAPER}
            />
          ))
        )}
      </g>
      {/* Logo overlay: composited on top; opacity reveals the pattern behind */}
      {logoCorner &&
        Array.from({ length: SUB_TOTAL }, (_, sy) =>
          Array.from({ length: SUB_TOTAL }, (_, sx) => {
            const p = logoCorner[sy * SUB_TOTAL + sx]
            if (p.opacity < 0.04) return null
            return (
              <rect
                key={`l-${sx}-${sy}`}
                x={sx * SUB_CELL}
                y={sy * SUB_CELL}
                width={SUB_CELL}
                height={SUB_CELL}
                fill={p.color}
                opacity={p.opacity}
              />
            )
          })
        )}
    </svg>
  )
}

// ── Mini component ────────────────────────────────────────────────────────────

/**
 * FingerprintMini — compact 3×3 icon extracted from the central cells of the
 * full 9×9 grid. Uses a dark, hue-saturated palette instead of grayscale,
 * making it distinctive at small sizes (avatar / favicon scale).
 */
export function FingerprintMini({
  config,
  className = "w-full h-full",
}: {
  config: VisualConfig
  className?: string
}) {
  const seed1 = config.patternDensity * 100 + config.shimmerIntensity * 10
  const seed2 = config.breatheScale * 100 + config.colorShift * 100
  const hue = config.primaryHue
  // Boost saturation so the hue reads clearly even on dark cells.
  const sat = (config.primarySaturation * 60 + 30).toFixed(1)
  const shimmerDur = `${(1 / config.pulseRate).toFixed(2)}s`

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <style>{`@keyframes fp-shimmer{0%,100%{filter:brightness(.82)}50%{filter:brightness(1)}}`}</style>

      {/* Very dark hue-tinted background */}
      <rect
        width="100"
        height="100"
        fill={`hsl(${hue},${(config.primarySaturation * 40 + 10).toFixed(1)}%,4%)`}
      />

      {Array.from({ length: MINI_SIZE }, (_, localCy) =>
        Array.from({ length: MINI_SIZE }, (_, localCx) => {
          const cx = MINI_CENTER + localCx
          const cy = MINI_CENTER + localCy

          // Center cell: always bright accent with shimmer.
          if (localCx === 1 && localCy === 1) {
            const delay = (cellHash(cx + 89.7, cy + 71.3, seed1, seed2) * 2).toFixed(2)
            return (
              <rect
                key={`mini-${localCx}-${localCy}`}
                x={localCx * MINI_CELL}
                y={localCy * MINI_CELL}
                width={MINI_CELL}
                height={MINI_CELL}
                fill={`hsl(${hue},${sat}%,55%)`}
                opacity={0.93}
                style={{
                  animation: `fp-shimmer ${shimmerDur} ${delay}s ease-in-out infinite`,
                }}
              />
            )
          }

          // Accent cells: pop with a bright hue highlight.
          const hash = cellHash(cx, cy, seed1, seed2)
          if (hash > 0.95) {
            const opacity =
              0.5 + cellHash(cx + 43.1, cy + 67.9, seed1, seed2) * 0.4
            return (
              <rect
                key={`mini-${localCx}-${localCy}`}
                x={localCx * MINI_CELL}
                y={localCy * MINI_CELL}
                width={MINI_CELL}
                height={MINI_CELL}
                fill={`hsl(${hue},${sat}%,55%)`}
                opacity={opacity}
              />
            )
          }

          // Pattern + grain → darkness, mapped to a dark hue range.
          const pattern = cellPattern(cx, cy, config.patternFrequency)
          const grain = cellHash(cx + 17.3, cy + 23.1, seed1, seed2)
          const fillVal = Math.min(1, pattern * 0.65 + grain * 0.45)
          // fillVal 0 (light) → lightness 28%, fillVal 1 (dark) → lightness 7%
          const lightness = (7 + (1 - fillVal) * 21).toFixed(1)

          return (
            <rect
              key={`mini-${localCx}-${localCy}`}
              x={localCx * MINI_CELL}
              y={localCy * MINI_CELL}
              width={MINI_CELL}
              height={MINI_CELL}
              fill={`hsl(${hue},${sat}%,${lightness}%)`}
            />
          )
        })
      )}
    </svg>
  )
}
