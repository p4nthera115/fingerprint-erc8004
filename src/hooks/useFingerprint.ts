import { useState, useEffect } from "react"
import { hashString } from "../lib/hash"
import { mapHashToConfig } from "../lib/parameterMapper"
import type { VisualConfig } from "../lib/types"

export function useFingerprint(input: string): VisualConfig | null {
  const [config, setConfig] = useState<VisualConfig | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve(input.trim() ? hashString(input) : null).then((bytes) => {
      if (!cancelled) setConfig(bytes ? mapHashToConfig(bytes) : null)
    })
    return () => {
      cancelled = true
    }
  }, [input])

  return config
}

export function useHashHex(input: string): string {
  const [hex, setHex] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    if (!input.trim()) return
    hashString(input).then((bytes) => {
      if (!cancelled)
        setHex(
          Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        )
    })
    return () => {
      cancelled = true
    }
  }, [input])

  return hex
}
