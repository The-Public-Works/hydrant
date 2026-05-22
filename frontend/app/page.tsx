/**
 * Landing — open-source marketing page for github.com/the-public-works/hydrant.
 *
 * Design intent: editorial, restrained, mostly white. One accent colour
 * (HYDRANT_RED) used in three places — the logo mark, the primary CTA
 * buttons, and the closing CTA block. Sections separate themselves via
 * vertical whitespace and a single hairline rule rather than coloured
 * blocks, which is the move that pulls the page out of "AI-startup
 * template" territory.
 *
 * Sister pages:
 *   /present  — slide deck used during the live pitch
 *   /graph    — local-dev knowledge-graph explorer (footer link)
 *
 * The recorded demo lives on Google Drive (DEMO_VIDEO_URL below). The
 * /demo and /graph routes still exist in the codebase for local dev but
 * aren't surfaced as primary CTAs — they require the FastAPI shim which
 * we haven't deployed alongside the static frontend.
 */
"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Cpu,
  Crosshair,
  ExternalLink,
  Flame,
  Github,
  GitBranch,
  Layers,
  Link2,
  Maximize2,
  MessageSquare,
  Minus,
  Network,
  PlayCircle,
  Plus,
  Rocket,
  ShieldCheck,
  Slack,
  SlidersHorizontal,
  Sparkles,
  Star,
  Terminal,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

const HYDRANT_RED = "#DC2626";
const GITHUB_URL = "https://github.com/the-public-works/hydrant";
const DEMO_VIDEO_URL =
  "https://drive.google.com/file/d/1eCpVutv7bMUDVW3kGfi9Fr63UXKNqg6Y/view";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />
      <Hero />
      <WorksWith />
      <WhatItDoes />
      <WhyHydrant />
      <KnowledgeGraph />
      <SeeItRun />
      <Quickstart />
      <Tools />
      <Architecture />
      <UseCases />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ─────────── Nav ─────────── */
function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: HYDRANT_RED }}
          >
            <Flame size={18} strokeWidth={2.4} />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Hydrant
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <a href="#what" className="hover:text-slate-900">What it does</a>
          <a href="#see-it-run" className="hover:text-slate-900">See it run</a>
          <a href="#quickstart" className="hover:text-slate-900">Install</a>
          <a href="#tools" className="hover:text-slate-900">Tools</a>
          <a href="#architecture" className="hover:text-slate-900">Architecture</a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
          >
            <Github size={14} /> GitHub
          </a>
          <a
            href={DEMO_VIDEO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            style={{ background: HYDRANT_RED }}
          >
            Watch demo <PlayCircle size={14} />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ─────────── Hero ─────────── */
function Hero() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
        {/* Top: pill + full-width headline on one line */}
        <div className="max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-slate-600">
            Open source · MIT licensed
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[72px]">
            Incident knowledge,<br />on demand.
          </h1>
        </div>

        {/* Bottom: details on the left (plain text, no card) + Slack mockup */}
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-lg leading-relaxed text-slate-600">
              Hydrant is an MCP server that indexes your team&apos;s Slack
              threads, Linear tickets, GitHub runbooks and Notion docs into one
              searchable knowledge graph — so any AI agent can answer incident
              questions with citations in seconds.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: HYDRANT_RED }}
              >
                <Star size={16} /> Star on GitHub
              </a>
              <a
                href={DEMO_VIDEO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                <PlayCircle size={16} /> Watch 2-minute demo
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Check size={13} className="text-slate-400" /> Self-hosted</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-slate-400" /> Postgres + pgvector</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-slate-400" /> Works with any MCP-compatible agent</span>
            </div>
          </div>

          <SlackMockup />
        </div>
      </div>
    </section>
  );
}

function SlackMockup() {
  return (
    <div className="relative">
      <div className="moving-border shadow-card-deep overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Slack size={14} className="text-[#36C5F0]" />
            #incident-auth-401s
          </span>
          <span className="font-mono">just now</span>
        </div>
        <div className="flex gap-3 p-5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white"
            style={{ background: HYDRANT_RED }}
          >
            <Flame size={16} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-900">hydrant</span>
              <span className="rounded-sm bg-slate-100 px-1 py-0 font-mono text-[9px] font-semibold text-slate-500">
                APP
              </span>
            </div>
            <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Diagnosis</span>{" "}
                <code className="rounded bg-slate-100 px-1 text-[12px]">JWT_ACCESS_EXPIRATION_MINUTES = 0</code>{" "}
                in <code className="rounded bg-slate-100 px-1 text-[12px]">src/config/config.js</code>.
                Confidence:{" "}
                <span className="font-semibold text-slate-900">HIGH</span>.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Suspect</span> PR #2 by @henning
              </p>
              <p>
                <span className="font-semibold text-slate-900">Owner</span> @alice-platform per CODEOWNERS
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <CitationChip I={Slack} label="past Slack thread" />
                <CitationChip I={Layers} label="Linear CLI-5" />
                <CitationChip I={Github} label="auth-runbook.md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CitationChip({ I, label }: { I: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <I size={11} /> {label}
    </span>
  );
}

/* ─────────── Works with (logo strip) ─────────── */
function WorksWith() {
  // Thin editorial strip directly under the hero — establishes the supported
  // surfaces in one glance before the reader scrolls into the longer sections.
  // No background colour, just a generous-vertical-padding white band.
  const sources = [
    { I: Slack, label: "Slack" },
    { I: Layers, label: "Linear" },
    { I: Github, label: "GitHub" },
    { I: BookOpen, label: "Notion" },
  ];
  const agents = ["Claude Code", "Cursor", "Cline", "Codex CLI", "Continue"];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Indexes &amp; answers from
          </div>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            {sources.map(({ I, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <I size={18} className="text-slate-500" /> {label}
              </span>
            ))}
            <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
            <span className="text-sm text-slate-500">
              Works with{" "}
              <span className="font-medium text-slate-700">
                {agents.join(" · ")}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── What it does ─────────── */
function WhatItDoes() {
  const steps = [
    {
      n: "01",
      title: "Index",
      body: "Hydrant indexes Slack, Linear, GitHub and Notion into a unified Postgres + pgvector knowledge graph. Cron-driven, idempotent, self-hosted.",
    },
    {
      n: "02",
      title: "Search & synthesize",
      body: "17 MCP tools expose hybrid semantic search, graph traversal, and cross-source synthesis. The agent picks what it needs.",
    },
    {
      n: "03",
      title: "Answer with citations",
      body: "Any MCP-compatible agent calls Hydrant and posts a cited answer back to your incident channel — with deep links to every source.",
    },
  ];
  return (
    <section id="what" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          One knowledge layer.<br />Three honest steps.
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-3">
          {steps.map(({ n, title, body }) => (
            <div key={n} className="border-t border-slate-200 pt-6">
              <div className="font-mono text-xs text-slate-400">{n}</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{title}</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Why Hydrant ─────────── */
function WhyHydrant() {
  const points = [
    {
      I: Network,
      title: "Cross-source synthesis",
      desc: "Not just search across silos. Synthesis — one question, one cited answer drawing from every source at once.",
    },
    {
      I: Zap,
      title: "Sub-second retrieval",
      desc: "HNSW vector index on Postgres + pgvector. Graph traversal and kNN fused into a single SQL query path.",
    },
    {
      I: ShieldCheck,
      title: "Self-hosted, your data",
      desc: "Runs on your infrastructure. Your tokens, your Postgres, your embeddings. No third-party SaaS in the loop.",
    },
    {
      I: Cpu,
      title: "Standards-based",
      desc: "Speaks the Model Context Protocol. One server, many agents — Claude Code, Cursor, Cline, Codex, Continue, more.",
    },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>Why Hydrant</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Built for the on-call engineer at 2&nbsp;a.m.
        </h2>
        <p className="mt-4 max-w-xl text-base text-slate-600">
          The first ten minutes of an incident decide everything. Hydrant
          collapses context-gathering from hours into seconds.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
          {points.map(({ I, title, desc }) => (
            <div key={title} className="flex gap-5 border-t border-slate-200 pt-6">
              <I size={20} className="mt-1 shrink-0 text-slate-500" strokeWidth={1.75} />
              <div>
                <div className="text-lg font-semibold text-slate-900">{title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Knowledge graph (live force-directed visualization) ─────────── */

// Each source type forms a visually distinct cluster around the pinned
// "auth 401s in prod" incident at the centre. Rendered as colour-coded
// circles sized by edge degree — same visual language as the live /graph
// explorer, so anyone clicking through sees consistent chrome.
//
// Six clusters (slack, linear, github/PR, commit, file, owner, notion)
// are anchored on a ring via forceX/forceY; intra-cluster edges keep each
// lobe coherent while a thin layer of cross-cluster edges (Slack↔Linear,
// PR↔commit↔file↔owner, Notion↔Linear) wires the whole thing together.

type Cluster =
  | "slack"
  | "linear"
  | "github"
  | "commit"
  | "file"
  | "owner"
  | "notion";

type GraphNode = SimulationNodeDatum & {
  id: string;
  cluster: Cluster | null;
  fill: string;
  r: number;
  isHub: boolean;
  label?: string;
  fx?: number | null;
  fy?: number | null;
};

type GraphEdge = SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
};

// Wider viewBox + bigger ring radius push the labelled hubs apart so the
// centre doesn't crowd and the "+N type" chips have room to breathe between
// neighbouring lobes. Background starfield (below) covers the rest of the
// panel and conveys "we're zoomed in on a much larger graph."
const GRAPH_W = 1600;
const GRAPH_H = 900;
const C_X = GRAPH_W / 2;
const C_Y = GRAPH_H / 2;

const RING_R = 380;
function anchor(deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: C_X + RING_R * Math.cos(rad), y: C_Y + RING_R * Math.sin(rad) };
}
// Seven clusters evenly spaced (≈51.4°) around the ring, starting from the
// top so "linear" sits at 12 o'clock like the screenshot mock.
const CLUSTER: Record<
  Cluster,
  { x: number; y: number; color: string; icon: LucideIcon; kind: string }
> = {
  linear: { ...anchor(-90),    color: "#5E6AD2", icon: Layers,    kind: "Linear issue" },
  github: { ...anchor(-38.6),  color: "#c084fc", icon: Github,    kind: "pull request" },
  commit: { ...anchor(12.9),   color: "#fbbf24", icon: GitBranch, kind: "commit" },
  file:   { ...anchor(64.3),   color: "#38bdf8", icon: Code2,     kind: "file" },
  owner:  { ...anchor(115.7),  color: "#f472b6", icon: Users,     kind: "owner" },
  notion: { ...anchor(167.1),  color: "#94a3b8", icon: BookOpen,  kind: "Notion page" },
  slack:  { ...anchor(-141.4), color: "#36C5F0", icon: Slack,     kind: "Slack channel" },
};

// Tight initial jitter inside each cluster — keeps the first frame from
// flashing as a blob at the centre before the simulation pulls nodes apart.
function near(c: Cluster, i: number): { x: number; y: number } {
  const a = CLUSTER[c];
  const angle = (i * 137.5 * Math.PI) / 180;     // golden angle → no overlaps
  const radius = 25 + (i % 5) * 14;
  return { x: a.x + radius * Math.cos(angle), y: a.y + radius * Math.sin(angle) };
}

// ── nodes ───────────────────────────────────────────────────────────────
// Authored as tuples so the array stays readable at ~70 entries.
// One node per row: [id, cluster, label?]
type NodeSpec = [string, Cluster, string?];
const NODE_SPECS: NodeSpec[] = [
  // Slack (14) — hub label only on #oncall
  ["slack-oncall",        "slack", "#oncall"],
  ["slack-payments",      "slack"],
  ["slack-incident-fix",  "slack"],
  ["slack-sre-alerts",    "slack"],
  ["slack-eng-platform",  "slack"],
  ["slack-engineering",   "slack"],
  ["slack-handoff",       "slack"],
  ["slack-backend",       "slack"],
  ["slack-frontend",      "slack"],
  ["slack-security",      "slack"],
  ["slack-infra",         "slack"],
  ["slack-deploys",       "slack"],
  ["slack-customer-ops",  "slack"],
  ["slack-product",       "slack"],

  // Linear (12) — hub label on CLI-21
  ["linear-cli-5",        "linear"],
  ["linear-cli-7",        "linear"],
  ["linear-cli-12",       "linear"],
  ["linear-cli-21",       "linear", "CLI-21"],
  ["linear-cli-33",       "linear"],
  ["linear-cli-41",       "linear"],
  ["linear-cli-52",       "linear"],
  ["linear-cli-58",       "linear"],
  ["linear-cli-63",       "linear"],
  ["linear-cli-71",       "linear"],
  ["linear-cli-84",       "linear"],
  ["linear-cli-90",       "linear"],

  // GitHub PRs (10) — hub label on PR #2
  ["pr-2",                "github", "PR #2"],
  ["pr-5",                "github"],
  ["pr-8",                "github"],
  ["pr-11",               "github"],
  ["pr-14",               "github"],
  ["pr-18",               "github"],
  ["pr-22",               "github"],
  ["pr-27",               "github"],
  ["pr-31",               "github"],
  ["pr-36",               "github"],

  // Commits (12) — hub label on 38e7e9
  ["commit-38e7e9",       "commit", "38e7e9"],
  ["commit-a2c4f1",       "commit"],
  ["commit-b8d3e2",       "commit"],
  ["commit-f1a9b3",       "commit"],
  ["commit-4d8a01",       "commit"],
  ["commit-5e9c12",       "commit"],
  ["commit-7b0d23",       "commit"],
  ["commit-8c1e34",       "commit"],
  ["commit-9a2f45",       "commit"],
  ["commit-1b3056",       "commit"],
  ["commit-2c4167",       "commit"],
  ["commit-3d5278",       "commit"],

  // Files (8) — hub label on config.js
  ["file-config",         "file", "config.js"],
  ["file-jwt",            "file"],
  ["file-auth-middleware","file"],
  ["file-cors",           "file"],
  ["file-session",        "file"],
  ["file-routes",         "file"],
  ["file-token-store",    "file"],
  ["file-env",            "file"],

  // Owners (5) — hub label on @alice
  ["owner-alice",         "owner", "@alice"],
  ["owner-bob",           "owner"],
  ["owner-carol",         "owner"],
  ["owner-dan",           "owner"],
  ["owner-eve",           "owner"],

  // Notion (8) — hub label on runbook
  ["notion-runbook",      "notion", "runbook"],
  ["notion-jwt-ref",      "notion"],
  ["notion-postmortem",   "notion"],
  ["notion-oncall",       "notion"],
  ["notion-arch",         "notion"],
  ["notion-deploy",       "notion"],
  ["notion-rfc-auth",     "notion"],
  ["notion-faq",          "notion"],
];

// ── edges ───────────────────────────────────────────────────────────────
// Authored as (src, dst) tuples for compactness. Spokes from the incident
// pick one hub per cluster; the rest fill in intra-cluster chains plus a
// dozen cross-cluster references so the lobes aren't isolated.
const EDGE_SPECS: Array<[string, string]> = [
  // Incident → cluster hubs (radial spokes)
  ["incident", "slack-oncall"],
  ["incident", "slack-payments"],
  ["incident", "slack-incident-fix"],
  ["incident", "linear-cli-21"],
  ["incident", "linear-cli-5"],
  ["incident", "pr-2"],
  ["incident", "notion-runbook"],
  ["incident", "file-config"],

  // Slack intra-cluster
  ["slack-oncall",       "slack-payments"],
  ["slack-oncall",       "slack-handoff"],
  ["slack-oncall",       "slack-sre-alerts"],
  ["slack-oncall",       "slack-incident-fix"],
  ["slack-incident-fix", "slack-eng-platform"],
  ["slack-handoff",      "slack-engineering"],
  ["slack-sre-alerts",   "slack-infra"],
  ["slack-payments",     "slack-backend"],
  ["slack-backend",      "slack-frontend"],
  ["slack-engineering",  "slack-deploys"],
  ["slack-eng-platform", "slack-security"],
  ["slack-customer-ops", "slack-product"],
  ["slack-product",      "slack-frontend"],

  // Linear intra-cluster (blocks / tracks)
  ["linear-cli-21", "linear-cli-5"],
  ["linear-cli-21", "linear-cli-12"],
  ["linear-cli-5",  "linear-cli-7"],
  ["linear-cli-12", "linear-cli-33"],
  ["linear-cli-33", "linear-cli-41"],
  ["linear-cli-41", "linear-cli-52"],
  ["linear-cli-7",  "linear-cli-58"],
  ["linear-cli-58", "linear-cli-63"],
  ["linear-cli-63", "linear-cli-71"],
  ["linear-cli-71", "linear-cli-84"],
  ["linear-cli-84", "linear-cli-90"],

  // GitHub PR chain (intra-cluster)
  ["pr-2",  "pr-5"],
  ["pr-2",  "pr-8"],
  ["pr-5",  "pr-11"],
  ["pr-8",  "pr-14"],
  ["pr-11", "pr-18"],
  ["pr-14", "pr-22"],
  ["pr-22", "pr-27"],
  ["pr-27", "pr-31"],
  ["pr-31", "pr-36"],

  // Commit chain
  ["commit-38e7e9", "commit-a2c4f1"],
  ["commit-38e7e9", "commit-b8d3e2"],
  ["commit-a2c4f1", "commit-f1a9b3"],
  ["commit-b8d3e2", "commit-4d8a01"],
  ["commit-4d8a01", "commit-5e9c12"],
  ["commit-5e9c12", "commit-7b0d23"],
  ["commit-7b0d23", "commit-8c1e34"],
  ["commit-8c1e34", "commit-9a2f45"],
  ["commit-9a2f45", "commit-1b3056"],
  ["commit-1b3056", "commit-2c4167"],
  ["commit-2c4167", "commit-3d5278"],

  // PR → commit (cross-cluster, github → commit)
  ["pr-2",  "commit-38e7e9"],
  ["pr-2",  "commit-a2c4f1"],
  ["pr-5",  "commit-b8d3e2"],
  ["pr-8",  "commit-f1a9b3"],
  ["pr-11", "commit-4d8a01"],
  ["pr-14", "commit-7b0d23"],

  // commit → file (cross-cluster, commit → file)
  ["commit-38e7e9", "file-config"],
  ["commit-a2c4f1", "file-config"],
  ["commit-b8d3e2", "file-jwt"],
  ["commit-f1a9b3", "file-auth-middleware"],
  ["commit-4d8a01", "file-cors"],
  ["commit-5e9c12", "file-session"],
  ["commit-7b0d23", "file-routes"],
  ["commit-8c1e34", "file-token-store"],
  ["commit-9a2f45", "file-env"],

  // file → file (intra-cluster imports)
  ["file-config", "file-jwt"],
  ["file-jwt",    "file-auth-middleware"],
  ["file-auth-middleware", "file-session"],
  ["file-routes", "file-auth-middleware"],
  ["file-token-store", "file-jwt"],
  ["file-env",    "file-config"],

  // file → owner (CODEOWNERS, cross-cluster)
  ["file-config",          "owner-alice"],
  ["file-jwt",             "owner-bob"],
  ["file-auth-middleware", "owner-bob"],
  ["file-cors",            "owner-carol"],
  ["file-session",         "owner-alice"],
  ["file-routes",          "owner-dan"],
  ["file-token-store",     "owner-bob"],
  ["file-env",             "owner-eve"],

  // Slack ↔ Linear (mentions / closes)
  ["slack-oncall",       "linear-cli-5"],
  ["slack-incident-fix", "linear-cli-12"],
  ["slack-sre-alerts",   "linear-cli-7"],
  ["slack-engineering",  "linear-cli-33"],
  ["slack-backend",      "linear-cli-41"],

  // Linear ↔ GitHub (PR closes ticket)
  ["linear-cli-21", "pr-2"],
  ["linear-cli-5",  "pr-5"],
  ["linear-cli-12", "pr-8"],
  ["linear-cli-7",  "pr-11"],

  // Notion intra-cluster
  ["notion-runbook",    "notion-jwt-ref"],
  ["notion-runbook",    "notion-postmortem"],
  ["notion-runbook",    "notion-oncall"],
  ["notion-jwt-ref",    "notion-arch"],
  ["notion-arch",       "notion-deploy"],
  ["notion-rfc-auth",   "notion-jwt-ref"],
  ["notion-faq",        "notion-oncall"],

  // Notion ↔ Linear / Slack (references)
  ["notion-runbook",  "linear-cli-21"],
  ["notion-jwt-ref",  "linear-cli-5"],
  ["notion-postmortem", "slack-incident-fix"],
  ["notion-rfc-auth", "pr-2"],
];

// Pre-compute degree per node from edges so radius reflects connectivity.
const DEGREE: Record<string, number> = (() => {
  const d: Record<string, number> = { incident: 0 };
  for (const [id] of NODE_SPECS) d[id] = 0;
  for (const [s, t] of EDGE_SPECS) {
    d[s] = (d[s] ?? 0) + 1;
    d[t] = (d[t] ?? 0) + 1;
  }
  return d;
})();

// Hub nodes — one per cluster, the labelled ones — render large with the
// cluster's type icon inside. Leaves stay as small dots.
const HUB_IDS = new Set(
  NODE_SPECS.filter(([, , label]) => label !== undefined).map(([id]) => id),
);

function radiusFor(id: string): number {
  if (id === "incident") return 22;
  if (HUB_IDS.has(id)) return 28;
  const deg = DEGREE[id] ?? 0;
  return 5 + Math.min(6, Math.sqrt(deg) * 0.8);
}

// Adjacency map for hover/select highlighting. Built once at module scope.
const NEIGHBORS: Record<string, Set<string>> = (() => {
  const m: Record<string, Set<string>> = {};
  const add = (a: string, b: string) => {
    (m[a] ??= new Set()).add(b);
  };
  for (const [s, t] of EDGE_SPECS) {
    add(s, t);
    add(t, s);
  }
  return m;
})();

// Spokes radiating from the incident hit one hub per cluster. We render
// these with the destination cluster's colour so the eye traces "incident →
// which kind of source is involved" without reading labels.
function isSpokeEdge(srcId: string, dstId: string): boolean {
  return srcId === "incident" || dstId === "incident";
}

const INITIAL_NODES: GraphNode[] = [
  {
    id: "incident",
    cluster: null,
    fill: "#DC2626",
    r: radiusFor("incident"),
    isHub: false,
    label: "auth 401s in prod",
    x: C_X,
    y: C_Y,
    fx: C_X,
    fy: C_Y,
  },
  ...NODE_SPECS.map(([id, cluster, label], i) => {
    const seed = near(cluster, i);
    const hub = HUB_IDS.has(id);
    // Pin hubs at their cluster's ring anchor so cross-cluster edges (e.g.
    // file → owner via CODEOWNERS) can't drag the lobes into each other.
    // Leaves still float freely around their hub.
    return {
      id,
      cluster,
      fill: CLUSTER[cluster].color,
      r: radiusFor(id),
      isHub: hub,
      label,
      x: hub ? CLUSTER[cluster].x : seed.x,
      y: hub ? CLUSTER[cluster].y : seed.y,
      fx: hub ? CLUSTER[cluster].x : undefined,
      fy: hub ? CLUSTER[cluster].y : undefined,
    } as GraphNode;
  }),
];

const INITIAL_EDGES: GraphEdge[] = EDGE_SPECS.map(([source, target]) => ({
  source,
  target,
}));

// ── per-node detail synthesis ───────────────────────────────────────────
// Click on any node and the panel shows a Slack/Linear/GitHub/Notion-shaped
// record that reads plausibly. Hub nodes get hand-authored entries; leaves
// derive their stats deterministically from the id so every click yields a
// fresh-looking record without us shipping 70 rows of fixtures.

type RichRow = { key: string; value: string };
type RichPerson = { handle: string; initials: string; bg: string };

type NodeRich = {
  kindLabel: string;
  kindColor: string;
  title: string;
  subtitle?: string;
  description: string;
  rows: RichRow[];
  people?: { label: string; entries: RichPerson[]; overflow?: number };
  tags?: string[];
  action: string;            // button label, e.g. "View on GitHub"
};

// Pool of plausible engineers — referenced across PRs, commits, Linear, etc.
const PEOPLE: Record<string, RichPerson> = {
  henning: { handle: "@henning",     initials: "HK", bg: "#fb7185" },
  alice:   { handle: "@alice",       initials: "AC", bg: "#f472b6" },
  bob:     { handle: "@bob",         initials: "BR", bg: "#38bdf8" },
  carol:   { handle: "@carol",       initials: "CI", bg: "#fbbf24" },
  dan:     { handle: "@dan",         initials: "DB", bg: "#a3e635" },
  eve:     { handle: "@eve",         initials: "ED", bg: "#c084fc" },
  sara:    { handle: "@sara",        initials: "SM", bg: "#34d399" },
  mike:    { handle: "@mike",        initials: "MK", bg: "#5E6AD2" },
};
const PERSON_KEYS = Object.keys(PEOPLE);

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
function pickPerson(seed: string, offset = 0): RichPerson {
  return PEOPLE[PERSON_KEYS[(hashStr(seed) + offset) % PERSON_KEYS.length]];
}
function rangeFor(seed: string, min: number, max: number, offset = 0): number {
  return min + ((hashStr(seed) + offset) % (max - min + 1));
}

const FILE_PATHS: Record<string, string> = {
  config:            "src/config/config.js",
  jwt:               "src/auth/jwt.ts",
  "auth-middleware": "src/auth/middleware.ts",
  cors:              "src/middleware/cors.ts",
  session:           "src/auth/session.ts",
  routes:            "src/server/routes.ts",
  "token-store":     "src/auth/token-store.ts",
  env:               "src/lib/env.ts",
};

const NOTION_TITLES: Record<string, string> = {
  runbook:    "Auth incident runbook",
  "jwt-ref":  "JWT config reference",
  postmortem: "Auth 401 post-mortem (draft)",
  oncall:     "On-call playbook",
  arch:       "Auth architecture overview",
  deploy:     "Deploy & rollback guide",
  "rfc-auth": "RFC: rotating JWT tokens",
  faq:        "Engineering FAQ",
};

const SLACK_DESCS: Record<string, string> = {
  oncall:        "JWT regression flagged · 3d ago",
  payments:      "401s spiking on /charge · 6h ago",
  "incident-fix":"Post-mortem draft thread · 2w ago",
  "sre-alerts":  "Token expiry alert · 1d ago",
  "eng-platform":"Escalation handoff · 1w ago",
  engineering:  "Code review chatter · 5d ago",
  handoff:       "Auth degradation handoff · 12h ago",
  backend:       "Backend service chatter",
  frontend:      "Frontend planning",
  security:      "Security review thread",
  infra:         "Infra coordination",
  deploys:       "Deploy notifications",
  "customer-ops":"Customer-reported 401s",
  product:       "Product review",
};

const LINEAR_DESCS: Record<string, string> = {
  "cli-5":  "JWT auth expiry bug · in progress",
  "cli-7":  "Audit auth flows · backlog",
  "cli-12": "Add JWT refresh logic · in review",
  "cli-21": "Tracking: auth 401s in prod · open",
  "cli-33": "Rotate session secrets · backlog",
  "cli-41": "Investigate CORS regressions · todo",
  "cli-52": "Document auth runbook · todo",
  "cli-58": "Add login attempt rate limit · in progress",
  "cli-63": "Migrate to refresh tokens · todo",
  "cli-71": "Bot accounts auth · backlog",
  "cli-84": "MFA rollout plan · backlog",
  "cli-90": "Deprecate legacy auth · backlog",
};

const PR_TITLES: Record<string, string> = {
  "2":  "auth config defaults",
  "5":  "refresh token rotation",
  "8":  "JWT validation patch",
  "11": "expire idle sessions",
  "14": "add rate limit to auth middleware",
  "18": "CORS allowlist cleanup",
  "22": "rotate session secret",
  "27": "bump auth-lib → v3",
  "31": "audit oauth callbacks",
  "36": "remove deprecated /login",
};

const COMMIT_MSGS: Record<string, string> = {
  "38e7e9": "set JWT default expiry to 0",
  "a2c4f1": "add JWT expiry env var",
  "b8d3e2": "update CORS config",
  "f1a9b3": "bump auth-lib → v3",
  "4d8a01": "fix CORS preflight regression",
  "5e9c12": "tighten session cookie scope",
  "7b0d23": "wire token-store retries",
  "8c1e34": "log auth failures in JSON",
  "9a2f45": "remove legacy /login",
  "1b3056": "harden refresh-token path",
  "2c4167": "expose env in dev only",
  "3d5278": "split routes module",
};

const OWNER_NAMES: Record<string, string> = {
  alice: "@alice-platform",
  bob:   "@bob-security",
  carol: "@carol-infra",
  dan:   "@dan-backend",
  eve:   "@eve-data",
};

function richDetailFor(n: GraphNode): NodeRich {
  if (n.id === "incident") {
    return {
      kindLabel: "INCIDENT · SEV-1",
      kindColor: "#DC2626",
      title: "auth 401s in prod",
      subtitle: "incident",
      description: "JWT regression locking out paying users",
      rows: [],
      action: "Open incident",
    };
  }
  switch (n.cluster) {
    case "slack": {
      const name = n.id.replace(/^slack-/, "");
      const lead = pickPerson(n.id);
      const second = pickPerson(n.id, 3);
      const third = pickPerson(n.id, 7);
      return {
        kindLabel: "Slack channel",
        kindColor: "#36C5F0",
        title: `#${name}`,
        subtitle: `slack.com/${name}`,
        description:
          SLACK_DESCS[name] ?? "Slack thread referenced from this incident.",
        rows: [
          { key: "Members", value: `${rangeFor(n.id, 8, 84)}` },
          { key: "Threads", value: `${rangeFor(n.id, 3, 27, 11)}` },
          { key: "Messages", value: `${rangeFor(n.id, 40, 920, 22)}` },
          { key: "Last msg", value: `${rangeFor(n.id, 1, 59, 5)}m ago` },
        ],
        people: {
          label: "Top contributors",
          entries: [lead, second, third],
          overflow: rangeFor(n.id, 2, 14, 31),
        },
        action: "Open in Slack",
      };
    }
    case "linear": {
      const key = n.id.replace(/^linear-/, "");
      const id = key.replace(/^cli-/, "CLI-");
      const assignee = pickPerson(n.id);
      const priority = ["Urgent", "High", "Medium", "Low"][hashStr(n.id) % 4];
      const status = ["In progress", "In review", "Todo", "Backlog"][
        hashStr(n.id + "s") % 4
      ];
      const labels = (
        [
          ["auth", "incident"],
          ["auth", "tech-debt"],
          ["security", "p1"],
          ["auth", "refactor"],
          ["bug", "auth"],
        ] as string[][]
      )[hashStr(n.id) % 5];
      return {
        kindLabel: "Linear issue",
        kindColor: "#5E6AD2",
        title: id,
        subtitle: "linear.app · cli",
        description: LINEAR_DESCS[key] ?? "Linear ticket linked to this incident.",
        rows: [
          { key: "Status", value: status },
          { key: "Priority", value: priority },
          { key: "Assignee", value: assignee.handle },
          { key: "Cycle", value: `Sprint ${rangeFor(n.id, 18, 27, 3)}` },
          { key: "Updated", value: `${rangeFor(n.id, 1, 9)}d ago` },
        ],
        tags: labels,
        action: "Open in Linear",
      };
    }
    case "github": {
      const num = n.id.replace(/^pr-/, "");
      const author = pickPerson(n.id);
      const rev1 = pickPerson(n.id, 2);
      const rev2 = pickPerson(n.id, 4);
      const branch = ["henning/auth-defaults", "alice/refresh-tokens", "bob/cors-fix", "carol/jwt-rotation", "mike/route-cleanup"][hashStr(n.id) % 5];
      return {
        kindLabel: "PR merged",
        kindColor: "#c084fc",
        title: `#${num}`,
        subtitle: `auth-lib · main ← ${branch}`,
        description: PR_TITLES[num] ?? "auth-related pull request",
        rows: [
          {
            key: "Diff",
            value: `+${rangeFor(n.id, 20, 480)} −${rangeFor(n.id, 3, 92, 7)} · ${rangeFor(n.id, 1, 12, 13)} files`,
          },
          { key: "Author", value: author.handle },
          { key: "Closes", value: `CLI-${rangeFor(n.id, 5, 99, 17)}` },
          { key: "Commits", value: `${rangeFor(n.id, 1, 14, 23)}` },
          { key: "Merged", value: `${rangeFor(n.id, 1, 9)}d ago` },
        ],
        people: { label: "Reviewers", entries: [rev1, rev2] },
        tags: ["merged", "auth"],
        action: "Open on GitHub",
      };
    }
    case "commit": {
      const sha = n.id.replace(/^commit-/, "");
      const author = pickPerson(n.id);
      const message = COMMIT_MSGS[sha] ?? "auth-related commit";
      const parent = ["38e7e9", "a2c4f1", "b8d3e2", "4d8a01"][hashStr(n.id) % 4];
      return {
        kindLabel: "COMMIT",
        kindColor: "#fbbf24",
        title: sha,
        subtitle: "auth-lib · main",
        description: message,
        rows: [
          { key: "Author", value: author.handle },
          { key: "Date", value: `${rangeFor(n.id, 1, 21)}d ago` },
          { key: "Files", value: `${rangeFor(n.id, 1, 7)} changed` },
          {
            key: "Lines",
            value: `+${rangeFor(n.id, 4, 220, 3)} −${rangeFor(n.id, 1, 64, 11)}`,
          },
          { key: "Parent", value: parent },
          { key: "Branch", value: "main" },
          {
            key: "PR",
            value: `#${rangeFor(n.id, 2, 36, 5)}`,
          },
        ],
        tags: ["auth", "main"],
        action: "View on GitHub",
      };
    }
    case "file": {
      const key = n.id.replace(/^file-/, "");
      const path = FILE_PATHS[key] ?? `src/${key}.ts`;
      const owner = pickPerson(n.id);
      const reviewer = pickPerson(n.id, 2);
      const lang = path.endsWith(".js")
        ? "JavaScript"
        : path.endsWith(".ts") || path.endsWith(".tsx")
          ? "TypeScript"
          : "Source";
      return {
        kindLabel: "FILE",
        kindColor: "#38bdf8",
        title: path,
        subtitle: `${lang} · auth-lib`,
        description: `Touched by ${rangeFor(n.id, 3, 14)} commits in the last 30d.`,
        rows: [
          { key: "Lines", value: `${rangeFor(n.id, 64, 740, 5)}` },
          { key: "Language", value: lang },
          { key: "Last edit", value: `${rangeFor(n.id, 1, 18)}d ago` },
          { key: "Imports", value: `${rangeFor(n.id, 2, 18, 7)} files` },
          { key: "Tests", value: `${rangeFor(n.id, 0, 24, 11)} covering` },
        ],
        people: { label: "Owners", entries: [owner, reviewer] },
        action: "Open on GitHub",
      };
    }
    case "owner": {
      const key = n.id.replace(/^owner-/, "");
      const display = OWNER_NAMES[key] ?? `@${key}`;
      const onCall = (hashStr(n.id) % 3) === 0;
      const person = PEOPLE[key] ?? PEOPLE.alice;
      return {
        kindLabel: "OWNER",
        kindColor: "#f472b6",
        title: display,
        subtitle: `${key}@hydrant.io`,
        description: "CODEOWNERS rule across auth/ and middleware/.",
        rows: [
          { key: "Team", value: ["Platform", "Security", "Backend", "Infra", "Data"][hashStr(n.id) % 5] },
          { key: "Files owned", value: `${rangeFor(n.id, 12, 184)}` },
          { key: "PRs merged", value: `${rangeFor(n.id, 8, 142, 5)} (30d)` },
          { key: "Reviews", value: `${rangeFor(n.id, 12, 312, 11)} (30d)` },
          { key: "On-call", value: onCall ? "Yes (this week)" : "—" },
        ],
        people: { label: "", entries: [person] },
        action: "View profile",
      };
    }
    case "notion": {
      const key = n.id.replace(/^notion-/, "");
      const title = NOTION_TITLES[key] ?? key;
      const author = pickPerson(n.id);
      return {
        kindLabel: "NOTION PAGE",
        kindColor: "#94a3b8",
        title,
        subtitle: `engineering / runbooks`,
        description: "Internal docs linked from this incident.",
        rows: [
          { key: "Last edit", value: `${author.handle} · ${rangeFor(n.id, 1, 14)}d ago` },
          { key: "Word count", value: `${rangeFor(n.id, 280, 4200, 3)}` },
          { key: "Backlinks", value: `${rangeFor(n.id, 4, 38)}` },
          { key: "Mentioned in", value: `${rangeFor(n.id, 2, 11, 5)} threads · ${rangeFor(n.id, 1, 6, 7)} issues` },
          { key: "Subscribers", value: `${rangeFor(n.id, 6, 84, 11)}` },
        ],
        action: "Open in Notion",
      };
    }
  }
  return {
    kindLabel: "node",
    kindColor: "#94a3b8",
    title: n.id,
    description: "",
    rows: [],
    action: "View",
  };
}

// Thin wrapper for the in-SVG label rendering (only needs the chip + title).
function detailFor(n: GraphNode): { kindLabel: string; title: string } {
  const r = richDetailFor(n);
  return { kindLabel: r.kindLabel, title: r.title };
}

// Inflated counts shown as "+N kind" chips next to each cluster hub — tells
// the eye "this hub stands in for many more records like it" without us
// actually rendering thousands of dots.
const CLUSTER_OVERFLOW: Record<Cluster, string> = {
  slack:  "+38 channels",
  linear: "+184 issues",
  github: "+312 PRs",
  commit: "+1,247 commits",
  file:   "+643 files",
  owner:  "+27 owners",
  notion: "+96 pages",
};

// ── background starfield ────────────────────────────────────────────────
// Deterministic field of ~240 tiny dots scattered across the canvas, biased
// away from the foreground cluster centres so they don't compete visually
// with the labelled hubs. The "graph extends past the panel" effect that
// production tools (Linear's graph view, GitHub's dependency graph) lean on.
type StarPoint = { x: number; y: number; r: number; color: string; alpha: number };
type StarEdge = { ax: number; ay: number; bx: number; by: number; alpha: number };

const STAR_FIELD: { points: StarPoint[]; edges: StarEdge[] } = (() => {
  let s = 0x9e3779b9;
  const rng = () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  const colors = [
    "#36C5F0", "#5E6AD2", "#c084fc", "#fbbf24",
    "#38bdf8", "#f472b6", "#94a3b8", "#34d399", "#a3e635",
  ];
  const points: StarPoint[] = [];

  // Outer pass — the bulk of the field, biased outside the ring where the
  // labelled foreground lives. Brighter and slightly larger.
  for (let i = 0; i < 320; i++) {
    let x = 0;
    let y = 0;
    let dist = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      x = rng() * GRAPH_W;
      y = rng() * GRAPH_H;
      dist = Math.hypot(x - C_X, y - C_Y);
      if (dist > RING_R + 80 || attempt === 9) break;
    }
    points.push({
      x,
      y,
      r: 1.4 + rng() * 1.8,
      color: colors[Math.floor(rng() * colors.length)],
      alpha: 0.35 + rng() * 0.4,
    });
  }

  // Inner pass — same brightness/size as the outer field so the mesh reads
  // as continuous from edge to centre. Guards keep dots from landing on top
  // of the incident or directly underneath a hub icon, but they're tight so
  // the field still packs densely between the hubs.
  const FOREGROUND_GUARD: Array<{ x: number; y: number; r: number }> = [
    { x: C_X, y: C_Y, r: 50 }, // incident exclusion
    ...(Object.values(CLUSTER).map((c) => ({ x: c.x, y: c.y, r: 46 }))),
  ];
  const innerPointStart = points.length;
  let placed = 0;
  let safety = 0;
  while (placed < 180 && safety < 3500) {
    safety++;
    const x = rng() * GRAPH_W;
    const y = rng() * GRAPH_H;
    const dist = Math.hypot(x - C_X, y - C_Y);
    if (dist > RING_R + 20) continue;
    let tooClose = false;
    for (const g of FOREGROUND_GUARD) {
      if (Math.hypot(x - g.x, y - g.y) < g.r) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    points.push({
      x,
      y,
      r: 1.4 + rng() * 1.6,
      color: colors[Math.floor(rng() * colors.length)],
      alpha: 0.35 + rng() * 0.4,
    });
    placed++;
  }

  // Inner dots closest to the centre — used below to render faint tether
  // edges to the incident so the background mesh visibly anchors onto the
  // foreground (matches the reference mock).
  const innerTetherPoints = points
    .slice(innerPointStart)
    .map((p) => ({ p, d: Math.hypot(p.x - C_X, p.y - C_Y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 16)
    .map(({ p }) => p);
  // Two passes of edges so the background reads as a connected mesh rather
  // than scattered dust. Short edges (<90) at higher opacity glue local
  // clusters together; long edges (<180) at lower opacity bridge across the
  // canvas so even the corners feel tied into the same graph.
  const edges: StarEdge[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const d = Math.hypot(dx, dy);
      if (d < 90 && rng() < 0.55) {
        edges.push({
          ax: points[i].x,
          ay: points[i].y,
          bx: points[j].x,
          by: points[j].y,
          alpha: 0.12 + rng() * 0.1,
        });
      } else if (d < 180 && rng() < 0.05) {
        edges.push({
          ax: points[i].x,
          ay: points[i].y,
          bx: points[j].x,
          by: points[j].y,
          alpha: 0.06 + rng() * 0.06,
        });
      }
    }
  }
  // Tether the inner dots closest to the centre to the incident itself.
  // Same alpha range as the regular mesh edges so the connection reads as
  // "background graph touches the incident," not as a special spoke.
  for (const p of innerTetherPoints) {
    edges.push({
      ax: p.x,
      ay: p.y,
      bx: C_X,
      by: C_Y,
      alpha: 0.08 + rng() * 0.08,
    });
  }
  return { points, edges };
})();

// Quadratic bezier path between two nodes, used to give the incident spokes
// a subtle arc so they don't all collide at the centre. Curvature amount is
// the perpendicular offset of the control point as a fraction of the line.
function curvePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  curvature = 0.18,
): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * len * curvature;
  const cy = my + (dx / len) * len * curvature;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

function KnowledgeGraph() {
  // `nodes` is the rendered state — re-rendered on every simulation tick.
  const [nodes, setNodes] = useState<GraphNode[]>(() =>
    INITIAL_NODES.map((n) => ({ ...n })),
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Toolbar state
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState(true);
  const [relFilter, setRelFilter] = useState<
    "all" | "direct" | "code" | "discussion"
  >("all");
  const [relMenuOpen, setRelMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Listen for native fullscreen changes (Esc key, etc.).
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(z * 1.25, 4));
  const zoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.5));
  const resetZoom = () => setZoom(1);
  const toggleFullscreen = () => {
    if (!panelRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      panelRef.current.requestFullscreen?.().catch(() => {});
    }
  };

  // viewBox is a centred window into the (GRAPH_W, GRAPH_H) coordinate space.
  // Zooming in shrinks the window; the centre stays put so the incident
  // remains the visual anchor.
  const vbW = GRAPH_W / zoom;
  const vbH = GRAPH_H / zoom;
  const vbX = (GRAPH_W - vbW) / 2;
  const vbY = (GRAPH_H - vbH) / 2;

  // Edge filter — translates the "All relationships" dropdown into a
  // predicate on (sourceCluster, targetCluster) pairs.
  const codeClusters = new Set<Cluster | null>(["github", "commit", "file", "owner"]);
  const discussionClusters = new Set<Cluster | null>(["slack", "linear", "notion"]);
  const idCluster = (id: string): Cluster | null =>
    INITIAL_NODES.find((n) => n.id === id)?.cluster ?? null;
  const isHubId = (id: string): boolean =>
    INITIAL_NODES.find((n) => n.id === id)?.isHub ?? false;
  const edgeMatchesFilter = (sId: string, tId: string): boolean => {
    if (relFilter === "all") return true;
    if (relFilter === "direct") {
      return (
        sId === "incident" ||
        tId === "incident" ||
        isHubId(sId) ||
        isHubId(tId)
      );
    }
    const sc = idCluster(sId);
    const tc = idCluster(tId);
    if (relFilter === "code") return codeClusters.has(sc) && codeClusters.has(tc);
    if (relFilter === "discussion")
      return discussionClusters.has(sc) && discussionClusters.has(tc);
    return true;
  };

  const relLabel = {
    all: "All relationships",
    direct: "Direct only",
    code: "Code chain",
    discussion: "Discussion",
  }[relFilter];

  useEffect(() => {
    const simNodes: GraphNode[] = INITIAL_NODES.map((n) => ({ ...n }));
    const simLinks: GraphEdge[] = INITIAL_EDGES.map((e) => ({ ...e }));

    // Per-cluster anchor pulls — replaces forceCenter. Each node drifts
    // toward its cluster's slot on the ring; the incident is pinned at
    // (C_X, C_Y) via fx/fy and ignored by these forces.
    const anchorX = (n: GraphNode) => (n.cluster ? CLUSTER[n.cluster].x : C_X);
    const anchorY = (n: GraphNode) => (n.cluster ? CLUSTER[n.cluster].y : C_Y);

    const sim = forceSimulation<GraphNode>(simNodes)
      // Stronger repulsion now that there's more room — keeps leaves from
      // crowding the centre under their hub.
      .force("charge", forceManyBody<GraphNode>().strength(-160))
      .force(
        "link",
        forceLink<GraphNode, GraphEdge>(simLinks)
          .id((d) => d.id)
          // Longer spoke from incident → hub, shorter between leaves. Match
          // the ring radius so the link force and cluster anchors agree on
          // where each hub belongs.
          .distance((d) =>
            (typeof d.source === "object" && d.source.id === "incident") ||
            (typeof d.target === "object" && d.target.id === "incident")
              ? RING_R - 30
              : 55,
          )
          .strength(0.55),
      )
      .force("x", forceX<GraphNode>(anchorX).strength(0.11))
      .force("y", forceY<GraphNode>(anchorY).strength(0.11))
      .force("collide", forceCollide<GraphNode>((d) => d.r + 5))
      // Calmer than before: lower alphaTarget keeps a faint heartbeat of
      // drift without dragging hover targets out from under the cursor.
      .alphaTarget(0.01)
      .alphaDecay(0.02);

    // Keep every circle (plus a label-height margin for labelled hubs)
    // inside the viewBox so drift doesn't push them past the panel edge.
    // Hub clamp pad now accounts for title + subtitle + "+N" chip stacked
    // below the icon.
    const clampToBounds = (n: GraphNode) => {
      const pad = (n.isHub ? 72 : 6) + n.r;
      if (n.x != null) n.x = Math.max(pad, Math.min(GRAPH_W - pad, n.x));
      if (n.y != null) n.y = Math.max(pad, Math.min(GRAPH_H - pad, n.y));
    };

    sim.on("tick", () => {
      simNodes.forEach(clampToBounds);
      setNodes(simNodes.map((n) => ({ ...n })));
    });

    return () => {
      sim.stop();
    };
  }, []);

  const nodeById = (id: string) => nodes.find((n) => n.id === id);

  // Focus = whatever the user is paying attention to. Hover wins over click
  // so moving the cursor naturally previews adjacency without losing the
  // pinned detail panel for the clicked node.
  const focusId = hoveredId ?? selectedId;
  const focusNeighbors = focusId ? NEIGHBORS[focusId] ?? new Set<string>() : null;
  const inFocus = (id: string) =>
    !focusId || id === focusId || (focusNeighbors?.has(id) ?? false);
  const selectedNode = selectedId ? nodeById(selectedId) : null;

  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>The knowledge graph</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          A live look at how the<br />nodes connect.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Hydrant stores every Slack thread, Linear ticket, GitHub artefact and
          Notion page as a typed node. Their relationships — references, blame,
          ownership, semantic similarity — are first-class edges. Hover a node
          to trace its blast radius; click one to inspect the underlying record.
        </p>

        <div
          ref={panelRef}
          className={`shadow-card-deep mt-14 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 ${isFullscreen ? "h-full flex flex-col" : ""}`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
            <span className="font-mono text-[11px] text-slate-400">
              graph · incident blast radius{" "}
              <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] text-emerald-400" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)" }}>
                live
              </span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              1,284 nodes · 3,912 edges ·{" "}
              <span className="text-emerald-400">live●</span>
            </span>
          </div>

          <div className="relative bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:22px_22px]">
            <svg
              viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
              role="img"
              aria-label="Live knowledge graph — auth 401s incident connected to Slack, Linear, GitHub and Notion sources"
              className="h-auto w-full"
              style={{ transition: "viewBox 200ms" }}
              onClick={() => {
                setSelectedId(null);
                setRelMenuOpen(false);
              }}
            >
              <defs>
                <filter id="edge-bloom" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="1.6" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="node-bloom" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="incident-glow">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0.55" />
                  <stop offset="60%" stopColor="#DC2626" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* ── background starfield ──────────────────────────────── */}
              <g pointerEvents="none" opacity={focusMode && focusId ? 0.4 : 1}>
                {STAR_FIELD.edges.map((e, i) => (
                  <line
                    key={`se-${i}`}
                    x1={e.ax}
                    y1={e.ay}
                    x2={e.bx}
                    y2={e.by}
                    stroke="rgba(255,255,255,1)"
                    strokeOpacity={e.alpha}
                    strokeWidth={0.5}
                  />
                ))}
                {STAR_FIELD.points.map((p, i) => (
                  <circle
                    key={`sp-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={p.color}
                    fillOpacity={p.alpha}
                  />
                ))}
              </g>

              {/* ── edges ─────────────────────────────────────────────── */}
              {INITIAL_EDGES.map((e, i) => {
                const sId = typeof e.source === "string" ? e.source : e.source.id;
                const tId = typeof e.target === "string" ? e.target : e.target.id;
                if (!edgeMatchesFilter(sId, tId)) return null;
                const a = nodeById(sId);
                const b = nodeById(tId);
                if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) {
                  return null;
                }
                const spoke = isSpokeEdge(sId, tId);
                const hubId = sId === "incident" ? tId : sId;
                const hub = nodeById(hubId);
                const spokeColor = hub?.cluster ? CLUSTER[hub.cluster].color : "#fff";

                const focal = focusId && (sId === focusId || tId === focusId);
                const dim = focusId && focusMode && !focal;

                let stroke: string;
                let width: number;
                let opacity: number;
                let useFilter = false;
                if (focal) {
                  stroke = spoke ? spokeColor : "#fff";
                  width = 2;
                  opacity = 0.95;
                  useFilter = true;
                } else if (spoke) {
                  stroke = spokeColor;
                  width = 1.6;
                  opacity = dim ? 0.18 : 0.7;
                  useFilter = !dim;
                } else {
                  stroke = "rgba(255,255,255,0.95)";
                  width = 0.8;
                  opacity = dim ? 0.06 : 0.18;
                }

                // Curve the incident→hub spokes; straight lines for the rest.
                if (spoke) {
                  return (
                    <path
                      key={i}
                      d={curvePath(a.x, a.y, b.x, b.y, 0.16)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={width}
                      strokeOpacity={opacity}
                      strokeLinecap="round"
                      filter={useFilter ? "url(#edge-bloom)" : undefined}
                    />
                  );
                }
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={stroke}
                    strokeWidth={width}
                    strokeOpacity={opacity}
                    strokeLinecap="round"
                    filter={useFilter ? "url(#edge-bloom)" : undefined}
                  />
                );
              })}

              {/* ── nodes ─────────────────────────────────────────────── */}
              {nodes.map((n) => {
                if (n.x == null || n.y == null) return null;
                const isSeed = n.id === "incident";
                const focal = focusId === n.id;
                const adjacent = focusId !== null && focusNeighbors?.has(n.id);
                const visible = inFocus(n.id);
                const nodeOpacity = focusMode && focusId && !visible ? 0.18 : 1;
                const showLabel = isSeed || n.isHub || focal || adjacent;
                const detail = isSeed || n.isHub || focal || adjacent ? detailFor(n) : null;

                return (
                  <g
                    key={n.id}
                    opacity={nodeOpacity}
                    style={{ cursor: "pointer", transition: "opacity 180ms" }}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() =>
                      setHoveredId((id) => (id === n.id ? null : id))
                    }
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelectedId((curr) => (curr === n.id ? null : n.id));
                    }}
                  >
                    {/* invisible hit target so tiny leaves stay easy to click */}
                    <circle cx={n.x} cy={n.y} r={Math.max(n.r + 8, 12)} fill="transparent" />

                    {isSeed && (
                      <>
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={n.r + 28}
                          fill="url(#incident-glow)"
                          className="animate-pulse"
                          style={{ animationDuration: "2.4s" }}
                        />
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={n.r + 10}
                          fill={n.fill}
                          opacity={0.28}
                        />
                      </>
                    )}

                    {n.isHub && (
                      <>
                        {/* soft outer halo so the hub reads as a "container" */}
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={n.r + 6}
                          fill={n.fill}
                          opacity={focal || selectedId === n.id ? 0.25 : 0.12}
                        />
                        {/* dark fill + coloured stroke — matches the mock's
                            "icon inside a ring" look */}
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={n.r}
                          fill="#0b0d10"
                          stroke={n.fill}
                          strokeWidth={2}
                          filter={focal ? "url(#node-bloom)" : undefined}
                        />
                        {/* lucide icon centred via a translate group */}
                        <g
                          transform={`translate(${n.x - 12}, ${n.y - 12})`}
                          pointerEvents="none"
                        >
                          {(() => {
                            const Icon = CLUSTER[n.cluster!].icon;
                            return <Icon size={24} color={n.fill} strokeWidth={1.8} />;
                          })()}
                        </g>
                      </>
                    )}

                    {!isSeed && !n.isHub && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        fill={n.fill}
                        stroke={focal || adjacent ? n.fill : "rgba(255,255,255,0.18)"}
                        strokeWidth={focal ? 2 : 0.6}
                        filter={focal ? "url(#node-bloom)" : undefined}
                      />
                    )}

                    {isSeed && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        fill={n.fill}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    )}

                    {showLabel && (
                      <g pointerEvents="none">
                        <text
                          x={n.x}
                          y={n.y + n.r + (isSeed ? 26 : n.isHub ? 22 : 13)}
                          textAnchor="middle"
                          fill={
                            isSeed
                              ? "#fff"
                              : focal || adjacent
                                ? "rgba(255,255,255,0.95)"
                                : "rgba(255,255,255,0.7)"
                          }
                          fontSize={isSeed ? 19 : n.isHub ? 13 : 10.5}
                          fontWeight={isSeed ? 600 : n.isHub ? 600 : 500}
                          fontFamily="ui-sans-serif, system-ui"
                        >
                          {detail?.title ?? n.label}
                        </text>
                        {(isSeed || n.isHub || focal || adjacent) && detail && (
                          <text
                            x={n.x}
                            y={
                              n.y +
                              n.r +
                              (isSeed ? 46 : n.isHub ? 38 : 26)
                            }
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.45)"
                            fontSize={isSeed ? 11 : 9.5}
                            fontFamily="ui-sans-serif, system-ui"
                          >
                            {detail.kindLabel}
                          </text>
                        )}
                      </g>
                    )}

                    {/* "+N kind" overflow chip — centred below the subtitle
                        so it stacks vertically with the label and never
                        bleeds horizontally into a neighbouring hub. */}
                    {n.isHub && n.cluster && (
                      (() => {
                        const text = CLUSTER_OVERFLOW[n.cluster];
                        const chipW = text.length * 6 + 14;
                        const chipY = n.y + n.r + 50;
                        return (
                          <g pointerEvents="none">
                            <rect
                              x={n.x - chipW / 2}
                              y={chipY}
                              rx={4}
                              ry={4}
                              width={chipW}
                              height={16}
                              fill={n.fill}
                              fillOpacity={0.12}
                              stroke={n.fill}
                              strokeOpacity={0.45}
                              strokeWidth={0.6}
                            />
                            <text
                              x={n.x}
                              y={chipY + 11}
                              textAnchor="middle"
                              fontSize={10}
                              fontFamily="ui-sans-serif, system-ui"
                              fill={n.fill}
                              fillOpacity={0.95}
                            >
                              {text}
                            </text>
                          </g>
                        );
                      })()
                    )}
                  </g>
                );
              })}

              {/* hover tooltip — small dark card with the node's data,
                  rendered last so it sits on top of every other element */}
            </svg>

            {/* toolbar chrome — top-left: focus + zoom controls */}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setFocusMode((m) => !m);
                }}
                className={`pointer-events-auto flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] backdrop-blur transition-colors ${
                  focusMode
                    ? "border-slate-700/70 bg-slate-900/85 text-slate-300"
                    : "border-slate-700/40 bg-slate-900/60 text-slate-500"
                }`}
                title="Toggle focus dimming on hover/select"
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${focusMode ? "bg-emerald-400" : "bg-slate-600"}`}
                />
                Focus mode
              </button>
              <div className="pointer-events-auto flex flex-col overflow-hidden rounded-md border border-slate-700/70 bg-slate-900/85 backdrop-blur">
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); zoomIn(); }}
                  className="px-2 py-1 text-slate-300 hover:bg-slate-800/60 border-b border-slate-700/60 disabled:text-slate-600"
                  aria-label="Zoom in"
                  disabled={zoom >= 4}
                >
                  <Plus size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); zoomOut(); }}
                  className="px-2 py-1 text-slate-300 hover:bg-slate-800/60 border-b border-slate-700/60 disabled:text-slate-600"
                  aria-label="Zoom out"
                  disabled={zoom <= 0.5}
                >
                  <Minus size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); resetZoom(); }}
                  className="px-2 py-1 text-slate-300 hover:bg-slate-800/60 border-b border-slate-700/60"
                  aria-label="Fit to view"
                  title="Reset zoom"
                >
                  <Crosshair size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); toggleFullscreen(); }}
                  className="px-2 py-1 text-slate-300 hover:bg-slate-800/60"
                  aria-label="Fullscreen"
                >
                  <Maximize2 size={14} strokeWidth={1.8} />
                </button>
              </div>
              {zoom !== 1 && (
                <div className="pointer-events-none rounded-md border border-slate-700/40 bg-slate-900/70 px-1.5 py-0.5 text-center text-[10px] font-mono text-slate-400">
                  {Math.round(zoom * 100)}%
                </div>
              )}
            </div>

            {/* filter chrome — top-right */}
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setRelMenuOpen((o) => !o);
                  }}
                  className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/85 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur hover:bg-slate-800/60"
                >
                  {relLabel}
                  <ChevronDown size={12} strokeWidth={1.8} />
                </button>
                {relMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-44 overflow-hidden rounded-md border border-slate-700/70 bg-slate-900/95 text-[11.5px] shadow-2xl backdrop-blur"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(
                      [
                        ["all", "All relationships", "every edge"],
                        ["direct", "Direct only", "incident → hubs"],
                        ["code", "Code chain", "PR · commit · file · owner"],
                        ["discussion", "Discussion", "Slack · Linear · Notion"],
                      ] as Array<[
                        "all" | "direct" | "code" | "discussion",
                        string,
                        string,
                      ]>
                    ).map(([val, label, hint]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setRelFilter(val);
                          setRelMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 border-b border-slate-700/40 px-3 py-1.5 text-left hover:bg-slate-800/60 ${
                          relFilter === val ? "text-emerald-300" : "text-slate-200"
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-[10px] text-slate-500">{hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setRelFilter("all");
                }}
                className="rounded-md border border-slate-700/70 bg-slate-900/85 p-1 text-slate-300 backdrop-blur hover:bg-slate-800/60"
                aria-label="Reset filters"
                title="Reset filters"
              >
                <SlidersHorizontal size={13} strokeWidth={1.8} />
              </button>
            </div>

            {/* detail card — floats over the dark panel when a node is clicked */}
            {selectedNode && (
              <DetailCard
                node={selectedNode}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>

          {/* legend strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400">
            <GraphLegendDot color="#DC2626" label="incident" />
            <GraphLegendDot color="#36C5F0" label="Slack" />
            <GraphLegendDot color="#5E6AD2" label="Linear" />
            <GraphLegendDot color="#c084fc" label="PR" />
            <GraphLegendDot color="#fbbf24" label="commit" />
            <GraphLegendDot color="#38bdf8" label="file" />
            <GraphLegendDot color="#f472b6" label="owner" />
            <GraphLegendDot color="#94a3b8" label="Notion" />
            <span className="ml-auto italic text-slate-500">
              pgvector kNN + graph traversal in one query
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailCard({
  node,
  onClose,
}: {
  node: GraphNode;
  onClose: () => void;
}) {
  if (node.id === "incident") return <IncidentDetailCard onClose={onClose} />;

  const r = richDetailFor(node);
  return (
    <div
      className="absolute right-4 top-16 max-h-[calc(100%-100px)] w-[300px] overflow-y-auto rounded-lg border border-slate-700/70 bg-slate-900/95 p-4 shadow-2xl backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: `${r.kindColor}22`,
            color: r.kindColor,
            border: `1px solid ${r.kindColor}55`,
          }}
        >
          {r.kindLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-lg leading-none"
          aria-label="Close detail card"
        >
          ×
        </button>
      </div>

      <div className="mt-3 text-[15px] font-semibold text-white break-all leading-tight">
        {r.title}
      </div>
      {r.subtitle && (
        <div className="mt-0.5 text-[10.5px] font-mono text-slate-500 break-all">
          {r.subtitle}
        </div>
      )}
      <div className="mt-2 text-[12.5px] text-slate-300">{r.description}</div>

      {r.rows.length > 0 && (
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11.5px]">
          {r.rows.map((row) => (
            <Fragment key={row.key}>
              <span className="text-slate-500">{row.key}</span>
              <span className="text-slate-200 font-mono break-all">{row.value}</span>
            </Fragment>
          ))}
        </div>
      )}

      {r.tags && r.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-700/60"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {r.people && r.people.entries.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          {r.people.label && <span>{r.people.label}</span>}
          <span className="flex items-center -space-x-1.5">
            {r.people.entries.map((p) => (
              <span
                key={p.handle}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 text-[9px] font-semibold text-slate-900"
                style={{ background: p.bg }}
                title={p.handle}
              >
                {p.initials}
              </span>
            ))}
          </span>
          {r.people.overflow !== undefined && (
            <span className="text-slate-500">+{r.people.overflow}</span>
          )}
        </div>
      )}

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-slate-700/80"
      >
        {r.action}
        <ExternalLink size={12} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function IncidentDetailCard({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute right-4 top-16 w-[300px] rounded-lg border border-slate-700/70 bg-slate-900/95 p-4 shadow-2xl backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#DC2626]" />
          <div>
            <div className="text-[14px] font-semibold text-white leading-tight">
              auth 401s in prod
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">incident</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-lg leading-none"
          aria-label="Close detail card"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[12px]">
        <span className="text-slate-500">Status</span>
        <span>
          <span className="rounded px-1.5 py-0.5 text-[10.5px] font-medium" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.35)" }}>
            Active
          </span>
        </span>
        <span className="text-slate-500">Severity</span>
        <span>
          <span className="rounded px-1.5 py-0.5 text-[10.5px] font-medium" style={{ background: "rgba(220,38,38,0.18)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.45)" }}>
            SEV-1
          </span>
        </span>
        <span className="text-slate-500">Started</span>
        <span className="text-slate-200 font-mono">May 21, 10:42 AM</span>
        <span className="text-slate-500">Duration</span>
        <span className="text-slate-200 font-mono">2h 17m</span>
        <span className="text-slate-500">Services</span>
        <span className="text-slate-200">3</span>
        <span className="text-slate-500">Impacted users</span>
        <span className="text-slate-200">12.4%</span>
        <span className="text-slate-500">Related alerts</span>
        <span className="text-slate-200">28</span>
        <span className="text-slate-500">Responders</span>
        <span className="flex items-center -space-x-2">
          {[
            { initials: "AC", bg: "#f472b6" },
            { initials: "BR", bg: "#38bdf8" },
            { initials: "DA", bg: "#fbbf24" },
          ].map((p) => (
            <span
              key={p.initials}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 text-[9px] font-semibold text-slate-900"
              style={{ background: p.bg }}
            >
              {p.initials}
            </span>
          ))}
          <span className="ml-3 text-slate-400 text-[11px]">+7</span>
        </span>
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-slate-700/80"
      >
        Open incident
        <ExternalLink size={12} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function GraphLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

/* ─────────── See it run (static snapshot) ─────────── */

type StreamEvent = { at: number; kind: "call" | "result" | "system"; text: string };

// Frozen snapshot of a real MCP-agent run — same data as the live presentation
// slide. Rendered all-at-once now (no auto-replay loop) because the animation
// itself read as "AI-startup demo loop" and undercut the rest of the page's
// editorial tone.
const LANDING_STREAM: StreamEvent[] = [
  { at: 0,   kind: "system", text: "Incident detected — #incident-auth-401s" },
  { at: 2,   kind: "system", text: "Your agent received the prompt — reading runbook" },
  { at: 6,   kind: "call",   text: 'mcp.get_runbook("incident flow", k=5)' },
  { at: 8,   kind: "result", text: "5 chunks · docs/runbooks/incident-flow.md  (842 ms)" },
  { at: 10,  kind: "call",   text: "mcp.get_node(282)" },
  { at: 12,  kind: "result", text: "Full incident-flow.md loaded  (210 ms)" },
  { at: 15,  kind: "call",   text: 'mcp.diagnose_incident("Auth 401s after deploy")' },
  { at: 24,  kind: "result", text: "6 similar incidents · 2 runbook hits · owner @chetan  (8.4 s)" },
  { at: 27,  kind: "call",   text: "mcp.trace_issue(#3)" },
  { at: 36,  kind: "result", text: "Issue context · 8 suspect files · top: src/config/config.js  (7.1 s)" },
  { at: 40,  kind: "call",   text: "mcp.get_pr_diff(#2)" },
  { at: 47,  kind: "result", text: "src/config/config.js — default(30) → default(0)  (4.2 s)" },
  { at: 51,  kind: "call",   text: "mcp.git_blame(src/config/config.js, L30-35)" },
  { at: 55,  kind: "result", text: "commit 38e7e901… by Henning  (310 ms)" },
  { at: 58,  kind: "call",   text: "mcp.who_owns(src/config/config.js)" },
  { at: 60,  kind: "result", text: "@alice-platform · CODEOWNERS rule *  (47 ms)" },
  { at: 63,  kind: "system", text: "Synthesizing diagnosis with citations…" },
  { at: 88,  kind: "call",   text: 'mcp.create_linear_issue("Auth 401s — JWT expiry regression")' },
  { at: 96,  kind: "result", text: "CLI-36 opened ↗" },
  { at: 101, kind: "call",   text: 'mcp.create_slack_channel("incident-…-auth-401s")' },
  { at: 113, kind: "result", text: "Channel created · 2 users invited · synthesis posted ↗" },
  { at: 118, kind: "system", text: "✓ Done — whole on-call team has context." },
];

function SeeItRun() {
  return (
    <section id="see-it-run" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>See it run</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          One prompt. About two minutes.<br />Full incident context.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          What happens after a developer types{" "}
          <span className="font-mono text-[15px]">&quot;auth is broken — diagnose&quot;</span>{" "}
          into their MCP-enabled agent. Real tool calls. Real timings from a
          recorded run.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-stretch">
          {/* Terminal-style tool stream — all events visible at once */}
          <div className="moving-border shadow-card-deep overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-[11px] text-slate-400">
                  hydrant · tool stream
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {LANDING_STREAM.length}/{LANDING_STREAM.length} events
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto px-5 py-4 font-mono text-[12px] leading-relaxed">
              {LANDING_STREAM.map((e, i) => (
                <div key={i} className="flex gap-2 py-0.5">
                  <span className="shrink-0 text-slate-500">
                    [{String(Math.floor(e.at)).padStart(3, " ")}s]
                  </span>
                  <span
                    className={
                      e.kind === "call"
                        ? "text-emerald-400"
                        : e.kind === "result"
                        ? "pl-3 text-slate-300"
                        : "italic text-amber-200"
                    }
                  >
                    {e.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stopwatch (frozen) + video CTA */}
          <div className="flex flex-col gap-4">
            <div className="shadow-card-soft rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <Clock size={14} />
                  Elapsed
                </div>
                <div className="font-mono text-[10px] text-slate-400">done</div>
              </div>
              <div className="mt-3 flex items-baseline justify-center gap-1 font-mono tabular-nums leading-none">
                <span className="text-6xl font-bold text-slate-900">02:00</span>
                <span className="text-2xl font-bold text-slate-400">.0</span>
              </div>
              <div className="mt-3 text-center text-xs text-slate-500">
                ✓ whole team has context · synthesis cited
              </div>
            </div>

            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="group shadow-card-soft flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-card-deep"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ background: HYDRANT_RED }}
              >
                <PlayCircle size={22} />
              </div>
              <div className="text-base font-semibold text-slate-900">
                Watch the recorded demo
              </div>
              <div className="text-sm text-slate-600">
                ~2-minute walkthrough — incident channel opens, your agent calls
                Hydrant, team gets a cited answer.
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                Open on Google Drive <ArrowUpRight size={12} />
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Quickstart ─────────── */
function Quickstart() {
  return (
    <section id="quickstart" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>Install</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Up and running in five minutes.
        </h2>
        <p className="mt-4 max-w-xl text-base text-slate-600">
          Clone, drop in your tokens, point your AI agent at the MCP server.
          That&apos;s it.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          {/* Terminal */}
          <div className="shadow-card-deep overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-[11px] text-slate-400">terminal</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-slate-200">
{`# 1. Clone & install
git clone https://github.com/the-public-works/hydrant
cd hydrant && make setup

# 2. Add your tokens
cp .env.example .env
$EDITOR .env   # GITHUB_TOKEN, OPENAI_API_KEY (· SLACK · LINEAR · NOTION)

# 3. Index your sources
make index-github REPO=owner/repo
make index-slack
make index-linear

# 4. Run the MCP server
make demo`}
            </pre>
          </div>

          {/* Wire-in list */}
          <div className="shadow-card-soft rounded-xl border border-slate-200 bg-white p-7">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              <Terminal size={14} /> Wire it into your agent
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Hydrant speaks the standard Model Context Protocol — drop the
              server into any MCP client.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <ClientRow name="Claude Code">
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">claude mcp add hydrant</code>
              </ClientRow>
              <ClientRow name="Cline">
                Add <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">hydrant</code> to <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">.cline/mcp.json</code>
              </ClientRow>
              <ClientRow name="Claude Desktop">
                Add to <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">claude_desktop_config.json</code>
              </ClientRow>
              <ClientRow name="Cursor / Continue / Codex">
                Standard MCP stdio transport
              </ClientRow>
            </ul>
            <a
              href={`${GITHUB_URL}#quickstart`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              Full setup guide <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClientRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 min-w-[5.5rem] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700">
        {name}
      </span>
      <span className="text-slate-600">{children}</span>
    </li>
  );
}

/* ─────────── Tools (editorial list) ─────────── */
function Tools() {
  // Replaces the previous 4-coloured-card grid. The same 17 tools, grouped
  // by family, but rendered as a clean editorial table — left column is the
  // family heading, right column is a mono-font list of tool names with a
  // one-line description each.
  const families: {
    title: string;
    sub: string;
    tools: { name: string; desc: string }[];
  }[] = [
    {
      title: "Cross-source synthesis",
      sub: "Fan out across every source, return one cited answer.",
      tools: [
        { name: "search_context",          desc: "kNN search scoped to a single repo or workspace" },
        { name: "search_all",              desc: "Cross-source kNN — Slack · Linear · GitHub · Notion" },
        { name: "diagnose_incident",       desc: "Composite — similar incidents + runbook + owner" },
        { name: "find_similar_incidents",  desc: "Past incidents ranked by semantic similarity" },
        { name: "trace_issue",             desc: "Issue → suspect code → recent PRs touching it" },
      ],
    },
    {
      title: "GitHub-flavored",
      sub: "Code, runbooks, PRs, blame, ownership.",
      tools: [
        { name: "get_pr_diff",    desc: "PR metadata + per-file diff" },
        { name: "git_blame",      desc: "Blame with enriched commit/PR nodes" },
        { name: "get_runbook",    desc: "Matching runbook sections from indexed docs" },
        { name: "who_owns",       desc: "CODEOWNERS lookup, last-rule-wins semantics" },
        { name: "list_repos",     desc: "What's indexed and how much" },
      ],
    },
    {
      title: "Slack",
      sub: "Spin up incident channels, post synthesis back.",
      tools: [
        { name: "create_slack_channel", desc: "Create #incident-… on demand, optionally pre-post the synthesis" },
        { name: "post_to_slack",        desc: "Post into an indexed channel by name or ID" },
      ],
    },
    {
      title: "Linear",
      sub: "Open tickets, comment, update status — keep the trail tight.",
      tools: [
        { name: "create_linear_issue",  desc: "Open a tracking ticket with markdown body" },
        { name: "add_linear_comment",   desc: "Comment on an existing ticket" },
        { name: "update_linear_issue",  desc: "Move state, change priority" },
      ],
    },
  ];

  return (
    <section id="tools" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>MCP tools</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Seventeen tools. Four families.
        </h2>
        <p className="mt-4 max-w-xl text-base text-slate-600">
          Every tool is typed, documented, and callable from any MCP client.
        </p>

        <div className="mt-14 divide-y divide-slate-200 border-y border-slate-200">
          {families.map((f) => (
            <div
              key={f.title}
              className="grid grid-cols-1 gap-6 py-10 md:grid-cols-[1fr_2fr] md:gap-12"
            >
              <div>
                <div className="text-lg font-semibold text-slate-900">{f.title}</div>
                <p className="mt-1 text-sm text-slate-500">{f.sub}</p>
              </div>
              <ul className="space-y-2.5">
                {f.tools.map((t) => (
                  <li key={t.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-slate-800">
                      {t.name}
                    </code>
                    <span className="text-sm text-slate-600">{t.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Architecture ─────────── */
function Architecture() {
  return (
    <section id="architecture" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>Architecture</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Sources&nbsp;→&nbsp;Hydrant&nbsp;→&nbsp;Your&nbsp;agent.
        </h2>
        <p className="mt-4 max-w-xl text-base text-slate-600">
          Three layers. No magic — every box is open code.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1.1fr_auto_1fr] lg:items-stretch">
          <ArchColumn title="Sources" sub="Indexers run on cron">
            <ArchRow I={Slack} label="Slack" detail="Threads · messages" />
            <ArchRow I={Layers} label="Linear" detail="Issues · comments" />
            <ArchRow I={Github} label="GitHub" detail="PRs · runbooks · code" />
            <ArchRow I={BookOpen} label="Notion" detail="Docs · runbooks" />
            <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              Coming soon
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <ArchRowSoon I={AlertTriangle} label="Sentry" detail="Alerts · errors" />
            <ArchRowSoon I={Briefcase} label="Jira" detail="Tickets · epics" />
            <p className="mt-1 px-1 text-[11px] italic leading-snug text-slate-500">
              Connector API is open — fork &amp; drop in whatever your team uses.
            </p>
          </ArchColumn>

          <ArchArrow />

          {/* Brain */}
          <div className="moving-border shadow-card-soft rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ background: HYDRANT_RED }}
              >
                <Flame size={20} strokeWidth={2.4} />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Hydrant</div>
                <div className="text-xs uppercase tracking-widest text-slate-500">MCP server</div>
              </div>
            </div>
            <div className="mt-5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              What it does
            </div>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <ArchBullet>Cross-source synthesis with cited deep-links</ArchBullet>
              <ArchBullet>17 MCP tools — search, traverse, write back</ArchBullet>
              <ArchBullet>Slack &amp; Linear write tools (post the answer back)</ArchBullet>
              <ArchBullet>Sub-second retrieval at repo-scale</ArchBullet>
            </ul>
            <div className="mt-5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Under the hood
            </div>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <ArchBullet>Postgres + pgvector knowledge graph</ArchBullet>
              <ArchBullet>HNSW vector search + edge traversal</ArchBullet>
              <ArchBullet>OpenAI embeddings (text-embedding-3-small, 1536-dim)</ArchBullet>
              <ArchBullet>FastMCP stdio transport · self-hosted</ArchBullet>
            </ul>
          </div>

          <ArchArrow />

          <ArchColumn title="Your agent" sub="Any MCP client">
            <ArchRow I={Bot} label="Cline" detail="VSCode agent" />
            <ArchRow I={Terminal} label="Claude Code" detail="Anthropic CLI" />
            <ArchRow I={MessageSquare} label="Claude Desktop" detail="App" />
            <ArchRow I={Cpu} label="Codex CLI" detail="OpenAI agent" />
            <ArchRow I={Code2} label="Cursor" detail="AI-first IDE" />
            <ArchRow I={Sparkles} label="Continue" detail="VSCode / JetBrains" />
            <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              MCP standard
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
              <Link2 size={16} className="text-slate-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-700">
                  …any MCP client
                </div>
                <div className="text-[11px] text-slate-500">
                  stdio transport · plug &amp; play
                </div>
              </div>
            </div>
          </ArchColumn>
        </div>
      </div>
    </section>
  );
}

function ArchColumn({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </div>
      <div className="text-xs text-slate-400">{sub}</div>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ArchRow({
  I,
  label,
  detail,
}: {
  I: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <I size={16} className="text-slate-600" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ArchRowSoon({
  I,
  label,
  detail,
}: {
  I: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3">
      <I size={16} className="text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-500">{label}</div>
        <div className="text-[11px] text-slate-400">{detail}</div>
      </div>
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        soon
      </span>
    </div>
  );
}

function ArchArrow() {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <ArrowRight size={20} className="text-slate-400" />
    </div>
  );
}

function ArchBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
      <span>{children}</span>
    </li>
  );
}

/* ─────────── Use cases ─────────── */
function UseCases() {
  const prompts = [
    {
      I: Flame,
      title: "Diagnose a live incident",
      prompt: "Auth is throwing 401s in prod. Diagnose, open a Linear ticket, and post to #incident-channel.",
    },
    {
      I: Users,
      title: "Onboard a new engineer",
      prompt: "What is the payment service? Who owns it, how do we deploy, and where do past incidents live?",
    },
    {
      I: GitBranch,
      title: "Review a risky PR",
      prompt: "Why is this PR changing auth config? Find prior incidents involving the same file.",
    },
    {
      I: Rocket,
      title: "Capture tribal knowledge",
      prompt: "Summarize how we handled the last 5 sev-1s. What's the common pattern?",
    },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel>Use cases</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Try these in your agent.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
          {prompts.map((p) => (
            <div key={p.title} className="border-t border-slate-200 pt-6">
              <div className="flex items-center gap-3">
                <p.I size={18} className="text-slate-500" strokeWidth={1.75} />
                <div className="text-base font-semibold text-slate-900">{p.title}</div>
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[12.5px] leading-relaxed text-slate-700">
                <span className="select-none text-slate-400">&gt; </span>
                {p.prompt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── CTA (flat red, no gradient overlay) ─────────── */
function CTASection() {
  return (
    <section
      className="text-white"
      style={{ background: HYDRANT_RED }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-24 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:py-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
            <Github size={12} /> github.com/the-public-works/hydrant
          </div>
          <h2 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Self-host Hydrant.<br />Ship faster incident response.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85">
            Free, MIT-licensed, yours to fork. Drop in your tokens, wire it
            into your agent, and have a working knowledge layer by lunch.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold transition hover:bg-slate-100"
              style={{ color: HYDRANT_RED }}
            >
              <Star size={16} /> Star the repo
            </a>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <PlayCircle size={16} /> Watch the demo
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 p-7">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
            What you get
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <SpecRow>17 MCP tools, fully documented</SpecRow>
            <SpecRow>Slack · Linear · GitHub · Notion indexers</SpecRow>
            <SpecRow>Postgres + pgvector schema &amp; migrations</SpecRow>
            <SpecRow>Docker Compose for local dev</SpecRow>
            <SpecRow>Next.js demo UI (chat + graph)</SpecRow>
            <SpecRow>MIT license — fork freely</SpecRow>
          </ul>
        </div>
      </div>
    </section>
  );
}

function SpecRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check size={16} className="mt-0.5 shrink-0 text-white" />
      <span className="text-white/95">{children}</span>
    </li>
  );
}

/* ─────────── Footer ─────────── */
function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-white"
            style={{ background: HYDRANT_RED }}
          >
            <Flame size={15} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700">Hydrant</div>
            <div className="text-[10.5px]">
              Built by{" "}
              <span className="font-semibold text-slate-600">The Public Works</span>
              {" · "}MIT licensed
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-slate-800">
            GitHub
          </a>
          <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer" className="hover:text-slate-800">
            Demo
          </a>
          <Link href="/present" className="hover:text-slate-800">
            Deck
          </Link>
          <a href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer" className="hover:text-slate-800">
            Contribute
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────── Tiny helpers ─────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      {children}
    </div>
  );
}
