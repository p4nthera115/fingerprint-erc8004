/**
 * Demo page — paste any string, see its fingerprint update live.
 * Also shows a grid of diverse example fingerprints.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { hashString } from "./lib/hash"
import { mapHashToConfig } from "./lib/parameterMapper"
import type { VisualConfig } from "./lib/types"
import {
  FingerprintSquares,
  FingerprintMini,
  type LogoPixel,
} from "./components/FingerprintSquares"

// ── Logo pixelation ────────────────────────────────────────────────────────────

/** Shared pixel-reading logic: draws `img` onto a 9×9 canvas, returns LogoPixels. */
function readPixelsFromImage(img: HTMLImageElement, invert: boolean): LogoPixel[] {
  const SIZE = 9
  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, SIZE, SIZE)
  const w = img.naturalWidth || SIZE
  const h = img.naturalHeight || SIZE
  ctx.drawImage(img, 0, 0, w, h, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE) // throws if canvas is tainted
  const pixels: LogoPixel[] = []
  for (let i = 0; i < SIZE * SIZE; i++) {
    let r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    if (invert) { r = 255 - r; g = 255 - g; b = 255 - b }
    const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    const opacity = 1 - luma * 0.12
    pixels.push({ color: `rgb(${r},${g},${b})`, opacity })
  }
  return pixels
}

/**
 * Rasterizes any image (including SVG) to a 9×9 boolean grid.
 * true = dark pixel (INK), false = light pixel (PAPER).
 * White background is composited first so transparent SVGs work correctly.
 */
async function pixelateLogo(file: File, invert: boolean): Promise<LogoPixel[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        resolve(readPixelsFromImage(img, invert))
      }
      img.onerror = reject
      img.src = src
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Tries to load a favicon from a CORS-enabled URL and pixelate it.
 * Returns null if CORS is blocked, the image fails, or the canvas is tainted.
 */
async function tryFaviconUrl(faviconUrl: string): Promise<LogoPixel[] | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    const timeout = setTimeout(() => resolve(null), 6000)
    img.onload = () => {
      clearTimeout(timeout)
      try {
        resolve(readPixelsFromImage(img, false))
      } catch {
        resolve(null) // canvas tainted — CORS blocked pixel reads
      }
    }
    img.onerror = () => { clearTimeout(timeout); resolve(null) }
    img.src = faviconUrl
  })
}

/**
 * Given any http(s) URL, attempts to fetch its favicon via CORS-friendly
 * public favicon APIs. Returns null if none succeed.
 */
async function fetchFaviconPixels(urlString: string): Promise<LogoPixel[] | null> {
  let hostname: string
  try {
    hostname = new URL(urlString).hostname
    if (!hostname) return null
  } catch {
    return null
  }

  // Services ordered by CORS reliability. DuckDuckGo and icon.horse both
  // serve favicons with Access-Control-Allow-Origin: * headers.
  const services = [
    `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    `https://icon.horse/icon/${hostname}`,
    `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
  ]

  for (const url of services) {
    const result = await tryFaviconUrl(url)
    if (result) return result
  }
  return null
}

// ── Logo upload component ──────────────────────────────────────────────────────

function LogoUpload({
  pixels,
  onPixels,
  source,
  rawAutoPixels,
  loading,
}: {
  pixels: LogoPixel[] | null
  onPixels: (p: LogoPixel[] | null) => void
  source?: "auto" | "manual" | null
  /** Non-inverted auto-favicon pixels — used to re-apply invert toggle. */
  rawAutoPixels?: LogoPixel[] | null
  loading?: boolean
}) {
  const [inverted, setInverted] = useState(false)
  const fileRef = useRef<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    fileRef.current = file
    const result = await pixelateLogo(file, inverted)
    onPixels(result)
  }

  async function toggleInvert() {
    const next = !inverted
    setInverted(next)
    if (fileRef.current) {
      const result = await pixelateLogo(fileRef.current, next)
      onPixels(result)
    } else if (rawAutoPixels) {
      // Apply inversion in-memory for auto-fetched favicon pixels
      onPixels(rawAutoPixels.map(({ color, opacity }) => {
        const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/)
        if (!m) return { color, opacity }
        const r = next ? 255 - +m[1] : +m[1]
        const g = next ? 255 - +m[2] : +m[2]
        const b = next ? 255 - +m[3] : +m[3]
        const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255
        return { color: `rgb(${r},${g},${b})`, opacity: 1 - luma * 0.12 }
      }))
    }
  }

  function clear() {
    fileRef.current = null
    setInverted(false)
    onPixels(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
        Logo Corner
      </p>
      {loading && !pixels ? (
        <div className="border border-dashed border-zinc-700 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" />
          </svg>
          Detecting favicon…
        </div>
      ) : pixels ? (
        <div className="flex items-center gap-3">
          {/* 9×9 pixel preview — checkerboard base shows transparency */}
          <div className="relative shrink-0">
            <svg
              viewBox="0 0 9 9"
              className="w-12 h-12 rounded border border-zinc-700"
              style={{ imageRendering: "pixelated" }}
            >
              {Array.from({ length: 81 }, (_, i) => (
                <rect
                  key={`bg-${i}`}
                  x={i % 9}
                  y={Math.floor(i / 9)}
                  width={1}
                  height={1}
                  fill={((i % 9) + Math.floor(i / 9)) % 2 === 0 ? "rgb(15,15,17)" : "rgb(238,238,235)"}
                />
              ))}
              {pixels.map((p, i) => (
                <rect
                  key={i}
                  x={i % 9}
                  y={Math.floor(i / 9)}
                  width={1}
                  height={1}
                  fill={p.color}
                  opacity={p.opacity}
                />
              ))}
            </svg>
            {source === "auto" && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold bg-indigo-600 text-white px-1 rounded leading-4">
                favicon
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={toggleInvert}
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              {inverted ? "Invert: on" : "Invert"}
            </button>
            <button
              onClick={clear}
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <div className="border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M8 1v10M4 5l4-4 4 4M2 13h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Upload logo — SVG, PNG, JPG
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.svg"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </label>
      )}
    </div>
  )
}

// ── Example inputs ─────────────────────────────────────────────────────────────

const EXAMPLE_INPUTS = [
  "https://mcp.example.com/agents/gpt-4o",
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "did:web:agent.example.org",
  "a2a://agent.example.com/.well-known/agent.json",
  "erc8004://1/0xabcdef1234567890",
  "agent:researcher:v2.1",
  "hello world",
  "claude-3-opus-20240229",
]

function useFingerprint(input: string) {
  const [config, setConfig] = useState<VisualConfig | null>(null)

  useEffect(() => {
    if (!input.trim()) {
      setConfig(null)
      return
    }
    let cancelled = false
    hashString(input).then((bytes) => {
      if (!cancelled) setConfig(mapHashToConfig(bytes))
    })
    return () => {
      cancelled = true
    }
  }, [input])

  return config
}

function GridItem({ input }: { input: string }) {
  const config = useFingerprint(input)
  if (!config) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
      style={{ aspectRatio: "1" }}
    >
      <FingerprintSquares config={config} interactive={false} />
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[10px] text-zinc-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
        {input}
      </div>
    </motion.div>
  )
}

export default function App() {
  const [inputValue, setInputValue] = useState(
    "https://mcp.example.com/agents/gpt-4o"
  )
  const [debouncedInput, setDebouncedInput] = useState(inputValue)
  const [logoPixels, setLogoPixels] = useState<LogoPixel[] | null>(null)
  /** "auto" = favicon fetched automatically; "manual" = user uploaded or cleared */
  const [logoSource, setLogoSource] = useState<"auto" | "manual" | null>(null)
  /** Original non-inverted auto-favicon pixels, kept so the invert toggle can re-apply */
  const [rawAutoPixels, setRawAutoPixels] = useState<LogoPixel[] | null>(null)
  const [faviconLoading, setFaviconLoading] = useState(false)
  const mainConfig = useFingerprint(debouncedInput)

  // Debounce input so hashing only runs on pause
  useEffect(() => {
    const id = setTimeout(() => setDebouncedInput(inputValue), 200)
    return () => clearTimeout(id)
  }, [inputValue])

  // Auto-fetch favicon when the identifier looks like an http(s) URL
  useEffect(() => {
    if (logoSource === "manual") return // user has taken manual control
    const url = debouncedInput.trim()
    const isUrl = url.startsWith("http://") || url.startsWith("https://")
    if (!isUrl) {
      if (logoSource === "auto") {
        setLogoPixels(null)
        setRawAutoPixels(null)
        setLogoSource(null)
      }
      return
    }
    let cancelled = false
    setFaviconLoading(true)
    fetchFaviconPixels(url).then((pixels) => {
      if (cancelled) return
      setFaviconLoading(false)
      if (pixels) {
        setRawAutoPixels(pixels)
        setLogoPixels(pixels)
        setLogoSource("auto")
      } else if (logoSource === "auto") {
        setLogoPixels(null)
        setRawAutoPixels(null)
        setLogoSource(null)
      }
    })
    return () => { cancelled = true; setFaviconLoading(false) }
  }, [debouncedInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExample = useCallback((ex: string) => {
    setInputValue(ex)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
          {mainConfig ? (
            <FingerprintMini config={mainConfig} />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
              FP
            </div>
          )}
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-none">
            Agent Fingerprint
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            ERC-8004 · Visual Identity for AI Agents
          </p>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row flex-1 gap-0">
        {/* Left panel — input + main fingerprint */}
        <section className="flex flex-col gap-6 p-6 lg:w-[420px] lg:border-r border-zinc-800">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
              Agent Identifier
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste any string, URL, address…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors font-mono"
            />
            <p className="text-xs text-zinc-500 mt-2">
              SHA-256 hashed deterministically. Same input → same fingerprint.
            </p>
          </div>

          {/* Logo corner upload */}
          <LogoUpload
            pixels={logoPixels}
            source={logoSource}
            rawAutoPixels={rawAutoPixels}
            loading={faviconLoading}
            onPixels={(p) => {
              setLogoPixels(p)
              // Any user-driven action (upload or clear) hands control to "manual"
              // so the auto-fetch effect won't override their choice.
              setLogoSource(p ? "manual" : null)
              if (!p) setRawAutoPixels(null)
            }}
          />

          {/* Main fingerprint preview */}
          <AnimatePresence mode="wait">
            {mainConfig && (
              <motion.div
                key={debouncedInput}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
                style={{ height: 300 }}
              >
                <FingerprintSquares
                  config={mainConfig}
                  interactive
                  logoCorner={logoPixels ?? undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mini preview */}
          {mainConfig && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                <FingerprintMini config={mainConfig} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Mini (3×3)</p>
                <p className="text-[11px] text-zinc-500">
                  Central cells · icon scale
                </p>
              </div>
            </div>
          )}

          {/* Config readout */}
          {mainConfig && (
            <details className="group">
              <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none">
                Visual config →
              </summary>
              <pre className="mt-2 text-[10px] text-zinc-500 bg-zinc-900 rounded-lg p-3 overflow-auto max-h-48 leading-relaxed">
                {JSON.stringify(mainConfig, null, 2)}
              </pre>
            </details>
          )}
        </section>

        {/* Right panel — diversity grid */}
        <section className="flex-1 p-6">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Diversity Grid — {EXAMPLE_INPUTS.length} fingerprints
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {EXAMPLE_INPUTS.map((ex) => (
              <button
                key={ex}
                onClick={() => handleExample(ex)}
                className="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
              >
                <GridItem input={ex} />
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            Click any fingerprint to load it in the editor.
          </p>
        </section>
      </main>
    </div>
  )
}
