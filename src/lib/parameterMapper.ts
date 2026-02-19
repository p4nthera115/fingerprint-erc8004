/**
 * Maps a 32-byte SHA-256 hash to a VisualConfig.
 *
 * Byte layout (from CLAUDE.md, extended):
 *  0-2   Primary hue / color palette
 *  3-5   Secondary color
 *  6-7   Geometry class
 *  8-9   Internal pattern type
 *  10-11 Pattern frequency / density
 *  12-13 Border / outline style
 *  14-15 Rotation speed + direction
 *  16-17 Particle density
 *  18-19 Waveform / displacement amplitude
 *  20-23 Animation behavior modifiers
 *  24-31 Reserved (future visual axes)
 */

import { byteToFloat, byteToIndex } from './hash'
import type {
  VisualConfig,
  GeometryClass,
  PatternType,
  BorderStyle,
} from './types'

const GEOMETRY_CLASSES: GeometryClass[] = [
  'sphere',
  'torus',
  'icosahedron',
  'octahedron',
  'torusKnot',
  'dodecahedron',
  'tetrahedron',
  'cone',
]

const PATTERN_TYPES: PatternType[] = [
  'voronoi',
  'noise',
  'rings',
  'grid',
  'hexagonal',
  'spiral',
  'stripes',
  'dots',
]

const BORDER_STYLES: BorderStyle[] = ['none', 'thin', 'thick', 'glow']

export function mapHashToConfig(bytes: Uint8Array): VisualConfig {
  // --- Primary color (bytes 0-2) ---
  const primaryHue = byteToFloat(bytes[0], 0, 360)
  const primarySaturation = byteToFloat(bytes[1], 0.5, 1.0)
  const primaryLightness = byteToFloat(bytes[2], 0.35, 0.65)

  // --- Secondary color (bytes 3-5) ---
  // Offset from primary to ensure perceptual distance
  const secondaryHue = (primaryHue + byteToFloat(bytes[3], 60, 300)) % 360
  const secondaryLightness = byteToFloat(bytes[4], 0.3, 0.7)
  // byte 5 reserved for future secondary axis

  // --- Geometry (bytes 6-7) ---
  const geometryClass = GEOMETRY_CLASSES[byteToIndex(bytes[6], GEOMETRY_CLASSES.length)]
  // byte 7 reserved for subdivision / detail level

  // --- Pattern (bytes 8-11) ---
  const patternType = PATTERN_TYPES[byteToIndex(bytes[8], PATTERN_TYPES.length)]
  // byte 9 reserved for pattern variant
  const patternFrequency = Math.round(byteToFloat(bytes[10], 1, 16))
  const patternDensity = byteToFloat(bytes[11], 0.1, 1.0)

  // --- Border (bytes 12-13) ---
  const borderStyle = BORDER_STYLES[byteToIndex(bytes[12], BORDER_STYLES.length)]
  const borderWidth = byteToFloat(bytes[13], 0.01, 0.08)

  // --- Rotation (bytes 14-15) ---
  // byte 14: speed magnitude; byte 15: encodes direction + axis bias
  const rotationMagnitude = byteToFloat(bytes[14], 0.1, 0.8)
  const rotationSign = bytes[15] < 128 ? 1 : -1
  const rotationSpeed = rotationSign * rotationMagnitude
  const axisAngle = byteToFloat(bytes[15], 0, Math.PI * 2)
  const rotationAxis: [number, number, number] = [
    Math.sin(axisAngle),
    Math.cos(axisAngle),
    Math.sin(axisAngle * 0.5),
  ]

  // --- Particles (bytes 16-17) ---
  const particleDensity = byteToFloat(bytes[16], 0, 1)
  // byte 17 reserved

  // --- Displacement / waveform (bytes 18-19) ---
  const displacementAmplitude = byteToFloat(bytes[18], 0, 0.4)
  const displacementFrequency = Math.round(byteToFloat(bytes[19], 1, 8))

  // --- Animation modifiers (bytes 20-23) ---
  const pulseRate = byteToFloat(bytes[20], 0.2, 2.0)
  const shimmerIntensity = byteToFloat(bytes[21], 0, 0.6)
  const colorShift = byteToFloat(bytes[22], 0, 0.3)
  const breatheScale = byteToFloat(bytes[23], 0, 0.15)

  return {
    primaryHue,
    primarySaturation,
    primaryLightness,
    secondaryHue,
    secondaryLightness,
    geometryClass,
    patternType,
    patternFrequency,
    patternDensity,
    borderStyle,
    borderWidth,
    rotationSpeed,
    rotationAxis,
    particleDensity,
    displacementAmplitude,
    displacementFrequency,
    pulseRate,
    shimmerIntensity,
    colorShift,
    breatheScale,
  }
}
