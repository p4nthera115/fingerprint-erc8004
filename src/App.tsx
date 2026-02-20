/**
 * Demo page — paste any string, see its fingerprint update live.
 * Also shows a grid of diverse example fingerprints and a mock agent registry.
 */

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useFingerprint } from "./hooks/useFingerprint"
import { EXAMPLE_INPUTS } from "./data/agents"
import type { MockAgent } from "./data/agents"
import {
  FingerprintSquares,
  FingerprintMini,
} from "./components/FingerprintSquares"
import { AgentRegistry } from "./components/AgentRegistry"

// ── GridItem ──────────────────────────────────────────────────────────────────

function GridItem({ input }: { input: string }) {
  const config = useFingerprint(input)
  if (!config) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-1"
    >
      <div
        className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
        style={{ aspectRatio: "1" }}
      >
        <FingerprintSquares config={config} interactive={false} />
      </div>
      <p className="text-[10px] text-zinc-500 truncate px-1">{input}</p>
    </motion.div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [inputValue, setInputValue] = useState(
    "https://mcp.example.com/agents/gpt-4o"
  )
  const [debouncedInput, setDebouncedInput] = useState(inputValue)
  const mainConfig = useFingerprint(debouncedInput)
  const [selectedAgent, setSelectedAgent] = useState<MockAgent | null>(null)

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
            <label className="block text-xs font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wide">
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

          {/* Main fingerprint preview */}
          <p className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wide">
            Fingerprint Preview
          </p>
          <AnimatePresence mode="wait">
            {mainConfig && (
              <motion.div
                key={debouncedInput}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
              >
                <FingerprintSquares config={mainConfig} interactive />
              </motion.div>
            )}
          </AnimatePresence>
          {mainConfig && (
            <p className="text-xs text-zinc-500 -mt-4">
              Top-left corner shows a 0–100 reputation score derived from the
              hash. Will be replaced by live ERC-8004 on-chain data.
            </p>
          )}

          {/* Mini preview */}
          {mainConfig && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                <FingerprintMini config={mainConfig} />
              </div>
              <div>
                <p className="text-xs font-bold font-mono text-zinc-300">
                  Mini (3×3)
                </p>
                <p className="text-[11px] text-zinc-500">
                  Central cells · icon scale
                </p>
              </div>
            </div>
          )}

          {/* Config readout */}
          {mainConfig && (
            <details className="group">
              <summary className="text-xs font-bold font-mono text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none">
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
          <p className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wide mb-4">
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

      <AgentRegistry
        onSelectAgent={setSelectedAgent}
        selectedAgent={selectedAgent}
        onCloseAgent={() => setSelectedAgent(null)}
      />
    </div>
  )
}
