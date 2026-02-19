/**
 * Demo page — paste any string, see its fingerprint update live.
 * Also shows a grid of diverse example fingerprints.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hashString } from './lib/hash'
import { mapHashToConfig } from './lib/parameterMapper'
import type { VisualConfig } from './lib/types'
import { FingerprintCanvas } from './components/FingerprintCanvas'

const EXAMPLE_INPUTS = [
  'https://mcp.example.com/agents/gpt-4o',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  'did:web:agent.example.org',
  'a2a://agent.example.com/.well-known/agent.json',
  'erc8004://1/0xabcdef1234567890',
  'agent:researcher:v2.1',
  'hello world',
  'claude-3-opus-20240229',
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
    return () => { cancelled = true }
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
      style={{ aspectRatio: '1' }}
    >
      <FingerprintCanvas config={config} interactive={false} />
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[10px] text-zinc-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
        {input}
      </div>
    </motion.div>
  )
}

export default function App() {
  const [inputValue, setInputValue] = useState('https://mcp.example.com/agents/gpt-4o')
  const [debouncedInput, setDebouncedInput] = useState(inputValue)
  const mainConfig = useFingerprint(debouncedInput)

  // Debounce input so hashing only runs on pause
  useEffect(() => {
    const id = setTimeout(() => setDebouncedInput(inputValue), 200)
    return () => clearTimeout(id)
  }, [inputValue])

  const handleExample = useCallback((ex: string) => {
    setInputValue(ex)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">
          FP
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-none">Agent Fingerprint</h1>
          <p className="text-xs text-zinc-400 mt-0.5">ERC-8004 · Visual Identity for AI Agents</p>
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

          {/* Examples */}
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Examples</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_INPUTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExample(ex)}
                  className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-mono truncate max-w-[200px]"
                  title={ex}
                >
                  {ex.length > 28 ? ex.slice(0, 26) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

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
                style={{ height: 320 }}
              >
                <FingerprintCanvas config={mainConfig} interactive />
              </motion.div>
            )}
          </AnimatePresence>

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
              <button key={ex} onClick={() => handleExample(ex)} className="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl">
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
