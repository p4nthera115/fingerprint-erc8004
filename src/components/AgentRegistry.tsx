/**
 * AgentRegistry — mock agent list with row and ID card components.
 */

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useFingerprint, useHashHex } from "../hooks/useFingerprint"
import { FingerprintSquares, FingerprintMini } from "./FingerprintSquares"
import type { MockAgent } from "../data/agents"
import { MOCK_AGENTS } from "../data/agents"

// ── Badge styles ──────────────────────────────────────────────────────────────

const PROTOCOL_STYLES: Record<MockAgent["protocol"], string> = {
  MCP: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25",
  A2A: "bg-violet-500/15 text-violet-300 border border-violet-500/25",
  "ERC-8004": "bg-amber-500/15 text-amber-300 border border-amber-500/25",
  DID: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25",
  Generic: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
}

const STATUS_CONFIG = {
  verified: {
    label: "Verified",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
  },
  unverified: {
    label: "Unverified",
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
  flagged: { label: "Flagged", dot: "bg-red-400", text: "text-red-400" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function reputationColor(score: number): string {
  if (score >= 70) return "bg-emerald-500"
  if (score >= 40) return "bg-amber-500"
  return "bg-red-500"
}

function reputationTextColor(score: number): string {
  if (score >= 70) return "text-emerald-400"
  if (score >= 40) return "text-amber-400"
  return "text-red-400"
}

// ── AgentRow ──────────────────────────────────────────────────────────────────

function AgentRow({
  agent,
  onClick,
}: {
  agent: MockAgent
  onClick: () => void
}) {
  const config = useFingerprint(agent.uri)
  const status = STATUS_CONFIG[agent.status]

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "rgba(39,39,42,0.5)" }}
      transition={{ duration: 0.15 }}
      className="cursor-pointer w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent hover:border-zinc-700/60 transition-[border-color] text-left group outline-1 outline-white/0 focus:outline-white/20"
    >
      {/* Mini fingerprint */}
      <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700/80 shrink-0 bg-zinc-900">
        {config ? (
          <FingerprintMini config={config} />
        ) : (
          <div className="w-full h-full bg-zinc-800 animate-pulse" />
        )}
      </div>

      {/* Name + URI */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 leading-tight">
          {agent.name}
        </p>
        <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
          {agent.uri}
        </p>
      </div>

      {/* Protocol badge */}
      <span
        className={`hidden sm:inline-flex text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shrink-0 ${
          PROTOCOL_STYLES[agent.protocol]
        }`}
      >
        {agent.protocol}
      </span>

      {/* Status */}
      <div
        className={`hidden md:flex items-center gap-1.5 shrink-0 ${status.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot} shrink-0`} />
        <span className="text-[11px] font-medium">{status.label}</span>
      </div>

      {/* Reputation */}
      {config && (
        <div
          className={`hidden lg:flex items-center gap-1.5 shrink-0 ${reputationTextColor(
            config.reputationScore
          )}`}
        >
          <span className="text-[11px] font-mono font-bold tabular-nums">
            {config.reputationScore}
          </span>
          <span className="text-[10px] text-zinc-600">REP</span>
        </div>
      )}

      {/* Chevron */}
      <svg
        className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  )
}

// ── AgentIDCard ───────────────────────────────────────────────────────────────

function AgentIDCard({
  agent,
  onClose,
}: {
  agent: MockAgent
  onClose: () => void
}) {
  const config = useFingerprint(agent.uri)
  const hashHex = useHashHex(agent.uri)
  const backdropRef = useRef<HTMLDivElement>(null)
  const status = STATUS_CONFIG[agent.status]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <motion.div
      ref={backdropRef}
      onClick={handleBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 flex flex-col gap-5">
          {/* Name + URI + Close button */}
          <div className="flex gap-4">
            <div className="w-12 h-12 inline rounded-lg overflow-hidden border border-zinc-700 shrink-0">
              {config && <FingerprintMini config={config} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 leading-tight">
                {agent.name}
              </h2>
              <p className="text-xs font-mono text-zinc-500 mt-1 break-all">
                {agent.uri}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex ml-auto cursor-pointer text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {/* Top: badges + fingerprint side by side */}
          <div className="flex items-start gap-5">
            {/* Left: badges + reputation */}
            <div className="flex-1 min-w-0 flex flex-col gap-5 pr-2">
              {/* Name + URI + badges */}
              <div className="pr-2">
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className={`inline-flex text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                      PROTOCOL_STYLES[agent.protocol]
                    }`}
                  >
                    {agent.protocol}
                  </span>
                  <div className={`flex items-center gap-1.5 ${status.text}`}>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                    />
                    <span className="text-xs font-medium">{status.label}</span>
                  </div>
                </div>
              </div>

              {/* Reputation */}
              {config && (
                <div>
                  <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wide mb-2">
                    Reputation Score
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${reputationColor(
                          config.reputationScore
                        )}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${config.reputationScore}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold font-mono tabular-nums ${reputationTextColor(
                        config.reputationScore
                      )}`}
                    >
                      {config.reputationScore} / 100
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Derived from hash bytes · will be replaced by ERC-8004
                    on-chain value
                  </p>
                </div>
              )}
              {/* Owner */}
              <div>
                <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wide mb-1">
                  Owner
                </p>
                <p className="text-xs font-mono text-zinc-400 break-all">
                  {agent.owner}
                </p>
              </div>
              {/* Validated by */}
              <div>
                <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wide mb-2">
                  Validated By
                </p>
                {agent.validatedBy.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agent.validatedBy.map((v) => (
                      <span
                        key={v}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                      >
                        ✓ {v}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 italic">
                    No validators · not yet reviewed
                  </p>
                )}
              </div>
            </div>

            {/* Right: fingerprint */}
            <div className="w-60 shrink-0 ml-20">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-zinc-700/60">
                {config ? (
                  <FingerprintSquares config={config} />
                ) : (
                  <div className="w-full h-full bg-zinc-800 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Remaining metadata */}
          <hr className="border-zinc-800" />
          <div className="flex flex-col gap-5">
            {/* Purpose */}
            <div>
              <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wide mb-1">
                Purpose
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {agent.purpose}
              </p>
            </div>

            {/* Tags */}
            <div>
              <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wide mb-2">
                Capabilities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <hr className="border-zinc-800" />
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-zinc-800">
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
                  First Seen
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {formatDate(agent.firstSeen)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
                  Interactions
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  {formatNumber(agent.interactions)}
                </p>
              </div>
              {config && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
                    Geometry
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono capitalize">
                    {config.geometryClass}
                  </p>
                </div>
              )}
            </div>

            {/* Hash */}
            {hashHex && (
              <div>
                <p className="text-[10px] font-bold font-mono text-zinc-600 uppercase tracking-wide mb-1">
                  Fingerprint Hash (SHA-256)
                </p>
                <p className="text-[11px] font-mono text-zinc-600 break-all leading-relaxed">
                  <span className="text-zinc-400">{hashHex.slice(0, 16)}</span>
                  {hashHex.slice(16)}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── AgentRegistry ─────────────────────────────────────────────────────────────

export function AgentRegistry({
  onSelectAgent,
  selectedAgent,
  onCloseAgent,
}: {
  onSelectAgent: (agent: MockAgent) => void
  selectedAgent: MockAgent | null
  onCloseAgent: () => void
}) {
  return (
    <>
      <section className="border-t border-zinc-800 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wide mb-1">
                Mock Registry
              </p>
              <h2 className="text-lg font-semibold text-zinc-100">
                Known Agents
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Mockup of a live ERC-8004 agent registry. Click any agent to
                view its ID card.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{" "}
                Verified
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{" "}
                Unverified
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Flagged
              </span>
            </div>
          </div>

          {/* Column headers (desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 mb-2">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
              Agent
            </p>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
              Protocol
            </p>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
              Status
            </p>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">
              Rep
            </p>
          </div>

          {/* Agent list */}
          <div className="flex flex-col divide-y divide-zinc-800/60">
            {MOCK_AGENTS.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="border-b border-zinc-800/60 py-2"
              >
                <AgentRow agent={agent} onClick={() => onSelectAgent(agent)} />
              </motion.div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-700 mt-4 font-mono">
            {MOCK_AGENTS.length} agents · Data is mocked · ERC-8004 on-chain
            reads coming soon
          </p>
        </div>
      </section>

      <AnimatePresence>
        {selectedAgent && (
          <AgentIDCard agent={selectedAgent} onClose={onCloseAgent} />
        )}
      </AnimatePresence>
    </>
  )
}
