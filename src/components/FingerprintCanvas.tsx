/**
 * FingerprintCanvas — wraps R3F Canvas with camera, lighting, and environment.
 * Renders a single Fingerprint component for a given VisualConfig.
 */

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import type { VisualConfig } from '../lib/types'
import { Fingerprint } from './Fingerprint'

interface Props {
  config: VisualConfig
  size?: number
  /** Canvas className for sizing — defaults to 100% of container */
  className?: string
  /** Whether to allow the user to orbit with mouse/touch */
  interactive?: boolean
}

export function FingerprintCanvas({
  config,
  size = 1,
  className = 'w-full h-full',
  interactive = true,
}: Props) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 3.5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#09090b']} />
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, -3, -5]} intensity={0.4} color="#8844ff" />
      <Suspense fallback={null}>
        <Environment preset="night" />
        <Fingerprint config={config} size={size} />
      </Suspense>
      {interactive && (
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          autoRotate={false}
        />
      )}
    </Canvas>
  )
}
