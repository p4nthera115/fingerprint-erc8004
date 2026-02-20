export interface MockAgent {
  id: string
  name: string
  uri: string
  protocol: "MCP" | "A2A" | "ERC-8004" | "DID" | "Generic"
  owner: string
  purpose: string
  status: "verified" | "unverified" | "flagged"
  validatedBy: string[]
  firstSeen: string
  interactions: number
  tags: string[]
}

export const EXAMPLE_INPUTS = [
  "https://mcp.example.com/agents/gpt-4o",
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "did:web:agent.example.org",
  "a2a://agent.example.com/.well-known/agent.json",
  "erc8004://1/0xabcdef1234567890",
  "agent:researcher:v2.1",
  "hello world",
  "claude-3-opus-20240229",
]

export const MOCK_AGENTS: MockAgent[] = [
  {
    id: "agent-1",
    name: "Nexus Researcher",
    uri: "https://mcp.nexus.ai/agents/researcher-v3",
    protocol: "MCP",
    owner: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    purpose:
      "Autonomous research assistant specializing in scientific literature synthesis, citation analysis, and hypothesis generation across interdisciplinary domains.",
    status: "verified",
    validatedBy: ["ERC-8004 Registry v1", "AgentHub DAO", "NexusLabs Security"],
    firstSeen: "2024-09-14",
    interactions: 148720,
    tags: ["research", "synthesis", "academic", "reasoning"],
  },
  {
    id: "agent-2",
    name: "CodeForge Agent",
    uri: "a2a://codeforge.dev/.well-known/agent.json",
    protocol: "A2A",
    owner: "did:web:codeforge.dev",
    purpose:
      "Full-stack software engineer agent capable of designing, writing, and reviewing code across 40+ languages and frameworks. Specializes in architecture review and security audits.",
    status: "verified",
    validatedBy: ["ERC-8004 Registry v1"],
    firstSeen: "2024-10-22",
    interactions: 87543,
    tags: ["coding", "review", "full-stack", "security"],
  },
  {
    id: "agent-3",
    name: "Oracle Trader",
    uri: "erc8004://1/0xabcdef1234567890abcdef1234567890abcdef12",
    protocol: "ERC-8004",
    owner: "0xabcdef1234567890abcdef1234567890abcdef12",
    purpose:
      "On-chain DeFi trading agent with multi-sig authorization requirements. Operates within predefined risk parameters set by the owner DAO. Currently under review for anomalous activity.",
    status: "flagged",
    validatedBy: [],
    firstSeen: "2025-01-05",
    interactions: 3201,
    tags: ["defi", "trading", "on-chain", "autonomous"],
  },
  {
    id: "agent-4",
    name: "TrustWeave Identity",
    uri: "did:web:identity.trustweave.io",
    protocol: "DID",
    owner: "did:web:trustweave.io",
    purpose:
      "Identity verification and attestation agent for cross-chain agent authentication, trust delegation, and verifiable credential issuance conforming to W3C VC Data Model 2.0.",
    status: "verified",
    validatedBy: [
      "DIF Working Group",
      "ERC-8004 Registry v1",
      "W3C Agent Registry",
    ],
    firstSeen: "2024-08-01",
    interactions: 320419,
    tags: ["identity", "attestation", "cross-chain", "trust", "w3c"],
  },
  {
    id: "agent-5",
    name: "HarbingerBot",
    uri: "https://api.harbinger.network/v2/agent",
    protocol: "Generic",
    owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    purpose:
      "Predictive analytics and early-warning agent for supply chain disruptions and market anomalies. Uses ensemble models with live data feeds.",
    status: "unverified",
    validatedBy: [],
    firstSeen: "2025-01-28",
    interactions: 891,
    tags: ["analytics", "prediction", "supply-chain", "markets"],
  },
  {
    id: "agent-6",
    name: "Meridian Moderator",
    uri: "a2a://meridian.social/.well-known/agent.json",
    protocol: "A2A",
    owner: "did:web:meridian.social",
    purpose:
      "Content moderation agent implementing multi-model consensus for borderline content decisions across federated social networks. Produces auditable reasoning traces for every decision.",
    status: "verified",
    validatedBy: ["ERC-8004 Registry v1", "Meridian Foundation"],
    firstSeen: "2024-11-15",
    interactions: 2104887,
    tags: ["moderation", "social", "consensus", "federated", "auditable"],
  },
]
