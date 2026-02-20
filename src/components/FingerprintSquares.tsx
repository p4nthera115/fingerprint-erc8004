/**
 * FingerprintSquares — SVG square-grid renderer.
 *
 * Renders a 9×9 grid of solid squares on a dark background.
 * The top-left 3×3 cells show the agent's ERC-8004 reputation score.
 * The remaining cells use concentric rings with continuous grayscale fill.
 * Rings carry a subtle radial depth gradient — valleys between rings darken
 * toward the center, giving a concave bowl feel. A handful of accent cells
 * carry the fingerprint's primary hue with a subtle CSS shimmer animation.
 */

import { type ReactElement } from "react"
import type { VisualConfig } from "../lib/types"

interface Props {
  config: VisualConfig
  /** Accepted for renderer-agnostic callers; unused in this renderer. */
  interactive?: boolean
  className?: string
}

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID = 9 // main grid cells per axis
const CORNER = 3 // detail corner: spans this many main cells
const CELL = 100 / GRID // main-cell size in SVG units (viewBox 100×100)

// ── Fixed colors ──────────────────────────────────────────────────────────────

const BG = "#0e0e0f"

// ── Pixel font (3×5 dot-matrix, row-major, 1 = lit) ──────────────────────────

const PIXEL_FONT: Record<string, number[]> = {
  "0": [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  "1": [0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
  "2": [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
  "3": [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  "4": [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  "5": [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  "6": [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  "7": [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  "8": [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  "9": [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  R: [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  E: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1],
  P: [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0],
}

/** Renders a string using the 3×5 pixel font as SVG rect elements. Stride = 4px (3 wide + 1 gap). */
function renderPixelString(
  str: string,
  x: number,
  y: number,
  ps: number,
  fill: string,
  opacity: number,
  keyPfx: string
): ReactElement[] {
  const rects: ReactElement[] = []
  for (let ci = 0; ci < str.length; ci++) {
    const bitmap = PIXEL_FONT[str[ci]]
    if (!bitmap) continue
    const cx = x + ci * 4 * ps
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (bitmap[row * 3 + col]) {
          rects.push(
            <rect
              key={`${keyPfx}-${ci}-${row}-${col}`}
              x={cx + col * ps}
              y={y + row * ps}
              width={ps}
              height={ps}
              fill={fill}
              opacity={opacity}
            />
          )
        }
      }
    }
  }
  return rects
}

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
function cellPattern(cx: number, cy: number, patternFrequency: number): number {
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

      {/* ── Reputation corner (top-left 3×3) ── */}
      {(() => {
        const cw = CORNER * CELL // ≈ 33.33 SVG units
        const score = config.reputationScore
        const scoreStr = String(score)

        // Scale pixel size down for wider numbers so they fit in the corner.
        const ps = scoreStr.length >= 3 ? 2.2 : 2.8
        const scoreW = (scoreStr.length * 4 - 1) * ps
        const scoreX = (cw - scoreW) / 2
        const scoreY = (cw - 5 * ps) / 2 // vertically centered

        // Match AgentRegistry reputationColor thresholds: emerald-500 / amber-500 / red-500
        const scoreColor =
          score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"

        return (
          <g>
            <rect width={cw} height={cw} fill={BG} />
            <g>
              {renderPixelString(
                scoreStr,
                scoreX,
                scoreY,
                ps,
                scoreColor,
                0.92,
                "sc"
              )}
            </g>
          </g>
        )
      })()}
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
        fill={`hsl(${hue},${(config.primarySaturation * 40 + 10).toFixed(
          1
        )}%,4%)`}
      />

      {Array.from({ length: MINI_SIZE }, (_, localCy) =>
        Array.from({ length: MINI_SIZE }, (_, localCx) => {
          const cx = MINI_CENTER + localCx
          const cy = MINI_CENTER + localCy

          // Center cell: always bright accent with shimmer.
          if (localCx === 1 && localCy === 1) {
            const delay = (
              cellHash(cx + 89.7, cy + 71.3, seed1, seed2) * 2
            ).toFixed(2)
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
