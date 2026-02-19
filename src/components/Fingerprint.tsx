/**
 * Fingerprint — the core 3D mesh component.
 * Receives a VisualConfig and renders a shader-driven geometry.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Mesh, ShaderMaterial, Color } from 'three'
import type { VisualConfig, GeometryClass } from '../lib/types'

import vertexShader from './shaders/fingerprint.vert'
import fragmentShader from './shaders/fingerprint.frag'

interface Props {
  config: VisualConfig
  size?: number
}

// Map geometry class name → R3F geometry JSX args
function useGeometryArgs(gc: GeometryClass, size: number) {
  return useMemo(() => {
    switch (gc) {
      case 'sphere':        return { type: 'sphere',        args: [size, 64, 64] as const }
      case 'torus':         return { type: 'torus',         args: [size * 0.7, size * 0.3, 32, 128] as const }
      case 'icosahedron':   return { type: 'icosahedron',   args: [size, 4] as const }
      case 'octahedron':    return { type: 'octahedron',    args: [size, 4] as const }
      case 'torusKnot':     return { type: 'torusKnot',     args: [size * 0.5, size * 0.2, 128, 32, 2, 3] as const }
      case 'dodecahedron':  return { type: 'dodecahedron',  args: [size, 2] as const }
      case 'tetrahedron':   return { type: 'tetrahedron',   args: [size, 4] as const }
      case 'cone':          return { type: 'cone',          args: [size * 0.7, size * 1.4, 32, 16] as const }
    }
  }, [gc, size])
}

// Convert HSL values (0-360, 0-1, 0-1) to a Three.js Color (RGB)
function hslToThreeColor(h: number, s: number, l: number): Color {
  const color = new Color()
  color.setHSL(h / 360, s, l)
  return color
}

export function Fingerprint({ config, size = 1 }: Props) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  const geoArgs = useGeometryArgs(config.geometryClass, size)

  const uniforms = useMemo(() => {
    const primary = hslToThreeColor(
      config.primaryHue,
      config.primarySaturation,
      config.primaryLightness,
    )
    const secondary = hslToThreeColor(
      config.secondaryHue,
      0.7,
      config.secondaryLightness,
    )

    // Map BorderStyle → int
    const borderStyleMap: Record<string, number> = {
      none: 0, thin: 1, thick: 2, glow: 3,
    }
    // Map PatternType → int
    const patternTypeMap: Record<string, number> = {
      voronoi: 0, noise: 1, rings: 2, grid: 3,
      hexagonal: 4, spiral: 5, stripes: 6, dots: 7,
    }

    return {
      uTime:                  { value: 0 },
      uPrimaryColor:          { value: primary },
      uSecondaryColor:        { value: secondary },
      uPatternType:           { value: patternTypeMap[config.patternType] ?? 0 },
      uPatternFrequency:      { value: config.patternFrequency },
      uPatternDensity:        { value: config.patternDensity },
      uBorderStyle:           { value: borderStyleMap[config.borderStyle] ?? 0 },
      uBorderWidth:           { value: config.borderWidth },
      uShimmerIntensity:      { value: config.shimmerIntensity },
      uColorShift:            { value: config.colorShift },
      uPulseRate:             { value: config.pulseRate },
      uDisplacementAmplitude: { value: config.displacementAmplitude },
      uDisplacementFrequency: { value: config.displacementFrequency },
      uBreatheScale:          { value: config.breatheScale },
    }
  }, [config])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
    if (meshRef.current) {
      const speed = config.rotationSpeed * 0.005
      const [ax, ay, az] = config.rotationAxis
      meshRef.current.rotation.x += ax * speed
      meshRef.current.rotation.y += ay * speed
      meshRef.current.rotation.z += az * speed * 0.3
    }
  })

  // Render the correct geometry based on geometryClass
  const geo = geoArgs
  return (
    <mesh ref={meshRef}>
      {geo.type === 'sphere'       && <sphereGeometry args={geo.args as [number, number, number]} />}
      {geo.type === 'torus'        && <torusGeometry args={geo.args as [number, number, number, number]} />}
      {geo.type === 'icosahedron'  && <icosahedronGeometry args={geo.args as [number, number]} />}
      {geo.type === 'octahedron'   && <octahedronGeometry args={geo.args as [number, number]} />}
      {geo.type === 'torusKnot'    && <torusKnotGeometry args={geo.args as [number, number, number, number, number, number]} />}
      {geo.type === 'dodecahedron' && <dodecahedronGeometry args={geo.args as [number, number]} />}
      {geo.type === 'tetrahedron'  && <tetrahedronGeometry args={geo.args as [number, number]} />}
      {geo.type === 'cone'         && <coneGeometry args={geo.args as [number, number, number, number]} />}
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
