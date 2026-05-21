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
import { useEffect, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
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
  Clock,
  Code2,
  Cpu,
  Flame,
  Github,
  GitBranch,
  Layers,
  Link2,
  MessageSquare,
  Network,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Slack,
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

// Flourish-style: each node is a small data card with the actual content
// inside (the PR number, the commit hash, the file path, the owner handle)
// instead of just a colour-coded dot with a label below. Rendered via SVG
// <foreignObject> so the HTML cards scale proportionally with the viewBox
// — looks crisp at every viewport width.
//
// Colours match /demo's GraphPanel palette so jurors who click through to
// the live graph see the same chrome.
type GraphNode = SimulationNodeDatum & {
  id: string;
  fill: string;
  icon: LucideIcon;
  kind: string;     // small uppercase label, e.g. "PULL REQUEST"
  title: string;    // main line, e.g. "PR #2"
  detail: string;   // meta line, e.g. "by @henning · 2d ago"
  w: number;        // card width (in viewBox units)
  h: number;        // card height (in viewBox units)
  fx?: number | null;
  fy?: number | null;
};

type GraphEdge = SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
};

const GRAPH_W = 1600;
const GRAPH_H = 940;

// 24-node graph centred on a single incident. Mix of seven Slack threads,
// four Linear tickets, three PRs, four commits, two files, two owners,
// two Notion docs — feels populated enough to read as "we have a real
// knowledge graph here" rather than "we drew four boxes for the demo".
//
// Initial coordinates roughly cluster each source type so the simulation
// converges quickly; the seed (incident) is pinned to the canvas centre
// via fx/fy so the rest orbit it.
const C_X = GRAPH_W / 2;
const C_Y = GRAPH_H / 2;
const REG_W = 168;
const REG_H = 62;

const INITIAL_NODES: GraphNode[] = [
  // ─── seed ────────────────────────────────────────────────────────
  { id: "incident",  fill: "#DC2626", icon: Flame,     kind: "INCIDENT · SEV-1", title: "auth 401s in prod",      detail: "paged 12 min ago · #incident-auth-401s", w: 240, h: 84, x: C_X, y: C_Y, fx: C_X, fy: C_Y },

  // ─── Slack threads (7) ───────────────────────────────────────────
  { id: "slack-1",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#oncall",                detail: "JWT regression · 3d ago",                  w: REG_W, h: REG_H, x: 420, y: 150 },
  { id: "slack-2",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#payments",              detail: "401s spiking · 6h ago",                    w: REG_W, h: REG_H, x: 600, y: 100 },
  { id: "slack-3",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#incident-auth-fix",     detail: "post-mortem draft · 2w ago",               w: REG_W, h: REG_H, x: 260, y: 230 },
  { id: "slack-4",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#sre-alerts",            detail: "token expiry · 1d ago",                    w: REG_W, h: REG_H, x: 780, y: 130 },
  { id: "slack-5",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#eng-platform",          detail: "escalation thread · 1w ago",               w: REG_W, h: REG_H, x: 140, y: 380 },
  { id: "slack-6",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#engineering",           detail: "code review · 5d ago",                     w: REG_W, h: REG_H, x: 920, y: 260 },
  { id: "slack-7",   fill: "#36C5F0", icon: Slack,     kind: "SLACK",            title: "#oncall-handoff",        detail: "auth degradation · 12h ago",               w: REG_W, h: REG_H, x: 580, y: 50  },

  // ─── Linear tickets (4) ──────────────────────────────────────────
  { id: "linear-1",  fill: "#5E6AD2", icon: Layers,    kind: "LINEAR",           title: "CLI-5",                  detail: "JWT auth expiry bug",                      w: REG_W, h: REG_H, x: 1100, y: 220 },
  { id: "linear-2",  fill: "#5E6AD2", icon: Layers,    kind: "LINEAR",           title: "CLI-12",                 detail: "Add JWT refresh logic",                    w: REG_W, h: REG_H, x: 1240, y: 320 },
  { id: "linear-3",  fill: "#5E6AD2", icon: Layers,    kind: "LINEAR · OPEN",    title: "CLI-21",                 detail: "tracking: auth 401s",                      w: REG_W, h: REG_H, x: 1080, y: 380 },
  { id: "linear-4",  fill: "#5E6AD2", icon: Layers,    kind: "LINEAR",           title: "CLI-7",                  detail: "audit auth flows · backlog",               w: REG_W, h: REG_H, x: 1280, y: 180 },

  // ─── GitHub PRs (3) ──────────────────────────────────────────────
  { id: "pr-1",      fill: "#c084fc", icon: Github,    kind: "PULL REQUEST",     title: "PR #2",                  detail: "auth config defaults · @henning",          w: REG_W, h: REG_H, x: 1180, y: 540 },
  { id: "pr-2",      fill: "#c084fc", icon: Github,    kind: "PULL REQUEST",     title: "PR #5",                  detail: "refresh token rotation · @sara",           w: REG_W, h: REG_H, x: 1300, y: 660 },
  { id: "pr-3",      fill: "#c084fc", icon: Github,    kind: "PULL REQUEST",     title: "PR #8",                  detail: "JWT validation patch · @mike",             w: REG_W, h: REG_H, x: 1080, y: 700 },

  // ─── Commits (4) ─────────────────────────────────────────────────
  { id: "commit-1",  fill: "#fbbf24", icon: GitBranch, kind: "COMMIT",           title: "38e7e9",                 detail: "set JWT default to 0",                     w: REG_W, h: REG_H, x: 940, y: 660 },
  { id: "commit-2",  fill: "#fbbf24", icon: GitBranch, kind: "COMMIT",           title: "a2c4f1",                 detail: "add JWT expiry env var",                   w: REG_W, h: REG_H, x: 1060, y: 750 },
  { id: "commit-3",  fill: "#fbbf24", icon: GitBranch, kind: "COMMIT",           title: "b8d3e2",                 detail: "update CORS config",                       w: REG_W, h: REG_H, x: 800, y: 740 },
  { id: "commit-4",  fill: "#fbbf24", icon: GitBranch, kind: "COMMIT",           title: "f1a9b3",                 detail: "bump auth-lib → v3",                       w: REG_W, h: REG_H, x: 1200, y: 760 },

  // ─── Files (2) ───────────────────────────────────────────────────
  { id: "file-1",    fill: "#38bdf8", icon: Code2,     kind: "FILE",             title: "src/config/config.js",   detail: "L30–35 · default(30) → 0",                 w: 200,   h: REG_H, x: 660, y: 680 },
  { id: "file-2",    fill: "#38bdf8", icon: Code2,     kind: "FILE",             title: "src/auth/jwt.ts",        detail: "L88–112 · expiry check",                   w: 200,   h: REG_H, x: 540, y: 760 },

  // ─── Owners (2) ──────────────────────────────────────────────────
  { id: "owner-1",   fill: "#f472b6", icon: Users,     kind: "OWNER",            title: "@alice-platform",        detail: "CODEOWNERS rule *",                        w: REG_W, h: REG_H, x: 340, y: 720 },
  { id: "owner-2",   fill: "#f472b6", icon: Users,     kind: "OWNER",            title: "@bob-security",          detail: "CODEOWNERS auth/",                         w: REG_W, h: REG_H, x: 200, y: 600 },

  // ─── Notion docs (2) ─────────────────────────────────────────────
  { id: "notion-1",  fill: "#94a3b8", icon: BookOpen,  kind: "NOTION",           title: "Auth incident flow",     detail: "runbook · edited 5d ago",                  w: 200,   h: REG_H, x: 140, y: 470 },
  { id: "notion-2",  fill: "#94a3b8", icon: BookOpen,  kind: "NOTION",           title: "JWT config reference",   detail: "engineering docs",                         w: 200,   h: REG_H, x: 240, y: 530 },
];

const INITIAL_EDGES: GraphEdge[] = [
  // ─── radial — incident → top-level matches in each source ────────
  { source: "incident",  target: "slack-1" },
  { source: "incident",  target: "slack-2" },
  { source: "incident",  target: "linear-3" },
  { source: "incident",  target: "pr-1" },
  { source: "incident",  target: "notion-1" },

  // ─── GitHub chain — PR → commit → file → owner ────────────────────
  { source: "pr-1",      target: "commit-1" },
  { source: "pr-1",      target: "commit-2" },
  { source: "pr-2",      target: "commit-3" },
  { source: "pr-3",      target: "commit-4" },
  { source: "commit-1",  target: "file-1" },
  { source: "commit-2",  target: "file-1" },
  { source: "commit-3",  target: "file-2" },
  { source: "commit-4",  target: "file-2" },
  { source: "file-1",    target: "owner-1" },
  { source: "file-2",    target: "owner-2" },

  // ─── Slack ↔ Linear cross-referencing ─────────────────────────────
  { source: "slack-1",   target: "linear-1" },
  { source: "slack-3",   target: "linear-2" },
  { source: "slack-4",   target: "linear-4" },
  { source: "slack-6",   target: "pr-3" },

  // ─── intra-Slack — handoff / quoted thread chains ────────────────
  { source: "slack-1",   target: "slack-3" },
  { source: "slack-7",   target: "slack-5" },
  { source: "slack-2",   target: "slack-7" },

  // ─── Linear internal — blocks / tracks / refs ─────────────────────
  { source: "linear-1",  target: "linear-2" },
  { source: "linear-3",  target: "pr-1" },
  { source: "linear-1",  target: "notion-2" },

  // ─── Notion cross-link ───────────────────────────────────────────
  { source: "notion-1",  target: "notion-2" },
];

function KnowledgeGraph() {
  // `nodes` is the rendered state — re-rendered on every simulation tick
  // so the SVG reflects current positions. The simulation itself lives
  // inside the effect and is never re-created.
  const [nodes, setNodes] = useState<GraphNode[]>(() =>
    INITIAL_NODES.map((n) => ({ ...n })),
  );

  useEffect(() => {
    // Fresh copies so d3-force can mutate without touching module scope.
    const simNodes: GraphNode[] = INITIAL_NODES.map((n) => ({ ...n }));
    const simLinks: GraphEdge[] = INITIAL_EDGES.map((e) => ({ ...e }));

    const sim = forceSimulation<GraphNode>(simNodes)
      // Repulsion between every pair of nodes — tuned softer than the
      // 8-node version because 24 bodies × strong charge sends them
      // flying off to the corners.
      .force("charge", forceManyBody<GraphNode>().strength(-700))
      // Springs along each edge
      .force(
        "link",
        forceLink<GraphNode, GraphEdge>(simLinks)
          .id((d) => d.id)
          .distance(180)
          .strength(0.5),
      )
      // Soft gravity toward the canvas centre
      .force("center", forceCenter<GraphNode>(GRAPH_W / 2, GRAPH_H / 2))
      // Collision radius scaled to each card's bounding box so cards
      // don't overlap. Slightly tighter padding (×0.55 + 6) than the
      // 8-node version to let the denser graph pack closer.
      .force(
        "collide",
        forceCollide<GraphNode>((d) => Math.max(d.w, d.h) * 0.55 + 6),
      )
      // alphaTarget > 0 keeps the simulation warm forever — gentle drift
      // rather than a one-shot settle. This is the Neo4j-browser feel.
      .alphaTarget(0.035)
      .alphaDecay(0.012);

    // Hard-clamp each node so its full card stays inside the viewBox.
    // Without this, the simulation's drift sometimes pushes cards past
    // the dark panel's edge and they get clipped — invisible to the
    // user even though the simulation is technically still tracking them.
    const margin = 8;
    const clampToBounds = (n: GraphNode) => {
      const halfW = n.w / 2;
      const halfH = n.h / 2;
      if (n.x != null) {
        n.x = Math.max(halfW + margin, Math.min(GRAPH_W - halfW - margin, n.x));
      }
      if (n.y != null) {
        n.y = Math.max(halfH + margin, Math.min(GRAPH_H - halfH - margin, n.y));
      }
    };

    sim.on("tick", () => {
      simNodes.forEach(clampToBounds);
      // Spread into a new array so React sees a new reference each tick.
      setNodes(simNodes.map((n) => ({ ...n })));
    });

    return () => {
      sim.stop();
    };
  }, []);

  // Edges look up node refs by id from the current `nodes` state so we
  // always render with the latest positions.
  const nodeById = (id: string) => nodes.find((n) => n.id === id);

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
          ownership, semantic similarity — are first-class edges. Below: one
          real incident, drawn from the same data the agent traverses.
        </p>

        <div className="shadow-card-deep mt-14 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
            <span className="font-mono text-[11px] text-slate-400">
              graph · auth-401s incident
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {INITIAL_NODES.length} nodes · {INITIAL_EDGES.length} edges · live
            </span>
          </div>

          <div className="bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:22px_22px]">
            <svg
              viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
              role="img"
              aria-label="Live knowledge graph — auth 401s incident connected to Slack, Linear, GitHub and Notion sources"
              className="h-auto w-full"
            >
              {/* edges drawn first so they sit under the nodes */}
              {INITIAL_EDGES.map((e, i) => {
                const a = nodeById(
                  typeof e.source === "string" ? e.source : e.source.id,
                );
                const b = nodeById(
                  typeof e.target === "string" ? e.target : e.target.id,
                );
                if (
                  !a || !b ||
                  a.x == null || a.y == null ||
                  b.x == null || b.y == null
                ) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* node cards — HTML inside <foreignObject> scales with the
                  viewBox so the cards look right at any width */}
              {nodes.map((n) => {
                if (n.x == null || n.y == null) return null;
                const Icon = n.icon;
                const isSeed = n.id === "incident";
                return (
                  <foreignObject
                    key={n.id}
                    x={n.x - n.w / 2}
                    y={n.y - n.h / 2}
                    width={n.w}
                    height={n.h}
                  >
                    <div
                      className="flex h-full w-full overflow-hidden rounded-lg border bg-slate-900/90 backdrop-blur"
                      style={{
                        borderColor: isSeed
                          ? n.fill
                          : "rgba(255,255,255,0.08)",
                        boxShadow: isSeed
                          ? `0 0 0 1px ${n.fill}, 0 8px 28px -8px ${n.fill}`
                          : "0 4px 12px -4px rgba(0,0,0,0.5)",
                      }}
                    >
                      {/* left colour rail */}
                      <div
                        className="w-1 shrink-0"
                        style={{ background: n.fill }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
                        <div
                          className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-widest"
                          style={{ color: n.fill }}
                        >
                          <Icon size={11} strokeWidth={2} />
                          <span className="truncate">{n.kind}</span>
                        </div>
                        <div
                          className={`truncate font-semibold ${
                            isSeed ? "text-[16px]" : "text-[13px]"
                          } text-white`}
                        >
                          {n.title}
                        </div>
                        <div className="truncate text-[10.5px] text-slate-400">
                          {n.detail}
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                );
              })}
            </svg>
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
