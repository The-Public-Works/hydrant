/**
 * Landing — open-source marketing page for github.com/the-public-works/hydrant.
 *
 * Design intent: light theme, no "AI website" gloss. Each section is its own
 * coloured block (amber / blue / emerald / red) so the page reads as a series
 * of bite-size answers rather than one long scroll.
 *
 * Sister pages:
 *   /present  — slide deck used during the live pitch
 *   /demo     — the actual product (Hydrant chat + graph)
 */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  Cpu,
  Database,
  Flame,
  Github,
  GitBranch,
  Layers,
  MessageSquare,
  Network,
  PlayCircle,
  Rocket,
  Search,
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />
      <Hero />
      <WhatItDoes />
      <WhyHydrant />
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: HYDRANT_RED }}
          >
            <Flame size={18} strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-slate-900">
              Hydrant
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Open-source AI knowledge layer
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          <a href="#what" className="hover:text-slate-900">What it does</a>
          <a href="#quickstart" className="hover:text-slate-900">Quickstart</a>
          <a href="#tools" className="hover:text-slate-900">Tools</a>
          <a href="#architecture" className="hover:text-slate-900">Architecture</a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:inline-flex"
          >
            <Github size={14} /> GitHub
          </a>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: HYDRANT_RED }}
          >
            Live demo <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────── Hero ─────────── */
function Hero() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
            style={{
              borderColor: "rgba(220, 38, 38, 0.25)",
              background: "rgba(220, 38, 38, 0.06)",
              color: HYDRANT_RED,
            }}
          >
            <Sparkles size={12} />
            Open source · MIT
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
            One AI knowledge layer for{" "}
            <span style={{ color: HYDRANT_RED }}>Slack, Linear &amp; GitHub.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Hydrant is an MCP server that indexes your team&apos;s incident knowledge —
            past Slack threads, Linear tickets, GitHub runbooks &amp; PRs — and lets any
            AI agent answer with citations in seconds.
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
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              <PlayCircle size={16} /> See it in action
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Python · FastMCP</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Postgres + pgvector</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Works with Cline · Claude Code · Claude Desktop</span>
          </div>
        </div>

        {/* Slack message mockup */}
        <SlackMockup />
      </div>
    </section>
  );
}

function SlackMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-2 -z-10 rounded-2xl bg-gradient-to-br from-red-100 via-amber-100 to-blue-100 opacity-70 blur-2xl" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Slack size={14} className="text-[#36C5F0]" />
            #incident-auth-401s
          </span>
          <span>just now</span>
        </div>
        <div className="mt-4 flex gap-3">
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
                <span className="font-semibold text-emerald-600">HIGH</span>.
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
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <I size={11} /> {label}
    </span>
  );
}

/* ─────────── What it does (amber block) ─────────── */
function WhatItDoes() {
  const steps = [
    {
      I: Database,
      title: "1 · Index",
      desc: "Hydrant indexes your Slack, Linear, and GitHub into a unified knowledge graph with vector embeddings.",
    },
    {
      I: Search,
      title: "2 · Search & synthesize",
      desc: "17 MCP tools expose semantic search, graph traversal, and cross-source synthesis.",
    },
    {
      I: Bot,
      title: "3 · Answer with citations",
      desc: "Any MCP-compatible agent (Cline, Claude Code, Claude Desktop) calls Hydrant and posts a cited answer back to your team.",
    },
  ];
  return (
    <section id="what" className="bg-amber-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel color="amber">How it works</SectionLabel>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          One knowledge layer. <span className="text-amber-700">Three steps.</span>
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map(({ I, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-amber-200 bg-white p-7 transition hover:border-amber-400"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <I size={22} />
              </div>
              <div className="mt-5 text-base font-bold text-slate-900">{title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Why Hydrant (white block) ─────────── */
function WhyHydrant() {
  const points = [
    {
      I: Network,
      title: "Cross-source synthesis",
      desc: "Not just search across silos — synthesis. One question, one cited answer drawing from all your tools.",
    },
    {
      I: Zap,
      title: "Sub-second retrieval",
      desc: "HNSW vector search on Postgres + pgvector. Hybrid graph traversal + kNN in a single SQL query.",
    },
    {
      I: ShieldCheck,
      title: "Self-hosted, your data",
      desc: "Runs on your infra. Your Slack tokens, your Postgres, your embeddings. No third-party SaaS in the loop.",
    },
    {
      I: Cpu,
      title: "Any MCP client",
      desc: "Wire it into Cline, Claude Code, Claude Desktop, Cursor, or any agent that speaks MCP. One server, many clients.",
    },
  ];
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel color="red">Why Hydrant</SectionLabel>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Built for the on-call engineer at 2am.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          The first 10 minutes of an incident decide everything. Hydrant collapses
          context-gathering from hours to seconds.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {points.map(({ I, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: HYDRANT_RED }}
              >
                <I size={20} />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">{title}</div>
                <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Quickstart (blue block) ─────────── */
function Quickstart() {
  return (
    <section id="quickstart" className="bg-blue-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel color="blue">Quickstart</SectionLabel>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Up and running in <span className="text-blue-700">5 minutes.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Clone, drop in your tokens, and point your AI agent at the MCP server.
          That&apos;s it.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          {/* Terminal block */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-blue-200/50">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 font-mono text-[11px] text-slate-400">terminal</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-slate-200">
{`# 1. Clone & install
git clone https://github.com/the-public-works/hydrant
cd hydrant && make setup

# 2. Add your tokens
cp .env.example .env
$EDITOR .env   # SLACK_BOT_TOKEN, LINEAR_API_KEY, GITHUB_TOKEN

# 3. Index your sources
make index-github
make index-slack
make index-linear

# 4. Run the MCP server
make demo`}
            </pre>
          </div>

          {/* Wire-in list */}
          <div className="rounded-2xl border border-blue-200 bg-white p-7">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-blue-700">
              <Terminal size={14} /> Wire it into your agent
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Hydrant speaks the standard Model Context Protocol — works with any MCP client.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <ClientRow name="Cline">
                Add <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">hydrant</code> to <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">.cline/mcp.json</code>
              </ClientRow>
              <ClientRow name="Claude Code">
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">claude mcp add hydrant</code>
              </ClientRow>
              <ClientRow name="Claude Desktop">
                Add to <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">claude_desktop_config.json</code>
              </ClientRow>
              <ClientRow name="Cursor / Continue">
                Standard MCP stdio transport
              </ClientRow>
            </ul>
            <a
              href={`${GITHUB_URL}#quickstart`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
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
      <span className="mt-0.5 inline-flex h-5 min-w-[5rem] items-center justify-center rounded-md bg-blue-100 px-2 text-[11px] font-semibold text-blue-700">
        {name}
      </span>
      <span className="text-slate-600">{children}</span>
    </li>
  );
}

/* ─────────── Tools (white block) ─────────── */
function Tools() {
  const families = [
    {
      color: HYDRANT_RED,
      bg: "bg-red-50",
      border: "border-red-200",
      pill: "bg-red-100 text-red-700",
      title: "Cross-source synthesis",
      I: Network,
      sub: "The headline tools — fan out across all sources, return one cited answer.",
      tools: [
        "search_context",
        "search_all",
        "diagnose_incident",
        "find_similar_incidents",
        "trace_issue",
      ],
    },
    {
      color: "#1D4ED8",
      bg: "bg-blue-50",
      border: "border-blue-200",
      pill: "bg-blue-100 text-blue-700",
      title: "GitHub-flavored",
      I: Github,
      sub: "Code, runbooks, PRs, blame, ownership.",
      tools: ["get_pr_diff", "git_blame", "get_runbook", "who_owns", "list_repos"],
    },
    {
      color: "#B45309",
      bg: "bg-amber-50",
      border: "border-amber-200",
      pill: "bg-amber-100 text-amber-800",
      title: "Slack write",
      I: Slack,
      sub: "Spin up incident channels and post synthesis back to the team.",
      tools: ["create_slack_channel", "post_to_slack"],
    },
    {
      color: "#047857",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      pill: "bg-emerald-100 text-emerald-700",
      title: "Linear write",
      I: Layers,
      sub: "Open tickets, comment, update status — keep the audit trail tight.",
      tools: ["create_linear_issue", "add_linear_comment", "update_linear_issue"],
    },
  ];
  return (
    <section id="tools" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel color="red">MCP tools</SectionLabel>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          17 tools. <span style={{ color: HYDRANT_RED }}>Four families.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Every tool is documented, typed, and callable from any MCP client.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {families.map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border ${f.border} ${f.bg} p-7`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ background: f.color }}
                >
                  <f.I size={20} />
                </div>
                <div className="text-lg font-bold text-slate-900">{f.title}</div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{f.sub}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {f.tools.map((t) => (
                  <span
                    key={t}
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${f.pill}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Architecture (emerald block) ─────────── */
function Architecture() {
  return (
    <section id="architecture" className="bg-emerald-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel color="emerald">Architecture</SectionLabel>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Sources <span className="text-emerald-700">→</span> Hydrant{" "}
          <span className="text-emerald-700">→</span> Your agent
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Three layers. No magic — every box is open code.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1.1fr_auto_1fr] lg:items-stretch">
          {/* Sources */}
          <ArchColumn title="Sources" sub="Indexers run on cron">
            <ArchRow I={Slack} label="Slack" detail="Threads · messages" />
            <ArchRow I={Layers} label="Linear" detail="Issues · comments" />
            <ArchRow I={Github} label="GitHub" detail="PRs · runbooks · code" />
          </ArchColumn>

          <ArchArrow />

          {/* Brain */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-lg shadow-emerald-100/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Flame size={20} strokeWidth={2.4} />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">Hydrant</div>
                <div className="text-xs uppercase tracking-widest text-emerald-700">MCP server</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              <ArchBullet>Postgres + pgvector knowledge graph</ArchBullet>
              <ArchBullet>HNSW vector search + edge traversal</ArchBullet>
              <ArchBullet>17 MCP tools over stdio transport</ArchBullet>
              <ArchBullet>Voyage AI embeddings (512-dim)</ArchBullet>
            </ul>
          </div>

          <ArchArrow />

          {/* Clients */}
          <ArchColumn title="Your agent" sub="Any MCP client">
            <ArchRow I={Bot} label="Cline" detail="VSCode agent" />
            <ArchRow I={Terminal} label="Claude Code" detail="CLI" />
            <ArchRow I={MessageSquare} label="Claude Desktop" detail="App" />
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
      <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
        {title}
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
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
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3">
      <I size={16} className="text-emerald-700" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ArchArrow() {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <ArrowRight size={24} className="text-emerald-600" />
    </div>
  );
}

function ArchBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

/* ─────────── Use cases (white block) ─────────── */
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
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel color="red">Use cases</SectionLabel>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Try these in your agent.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {prompts.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ background: HYDRANT_RED }}
                >
                  <p.I size={18} />
                </div>
                <div className="text-base font-bold text-slate-900">{p.title}</div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-4 font-mono text-[12.5px] leading-relaxed text-slate-700">
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

/* ─────────── CTA (red block) ─────────── */
function CTASection() {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: HYDRANT_RED }}
    >
      <div className="absolute inset-0 -z-10 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 40%)",
          }}
        />
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-20 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
            <Github size={12} /> github.com/the-public-works/hydrant
          </div>
          <h2 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Self-host Hydrant.
            <br />
            Ship faster incident response.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90">
            Free, MIT-licensed, and yours to fork. Drop in your tokens, wire it
            into your agent, and have a working knowledge layer by lunch.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-slate-50"
              style={{ color: HYDRANT_RED }}
            >
              <Star size={16} /> Star the repo
            </a>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <PlayCircle size={16} /> Try the live demo
            </Link>
          </div>
        </div>

        {/* Spec card */}
        <div className="rounded-2xl border border-white/20 bg-white/10 p-7 backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
            What you get
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <SpecRow>17 MCP tools, fully documented</SpecRow>
            <SpecRow>Slack · Linear · GitHub indexers</SpecRow>
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
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-slate-500">
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
          <Link href="/demo" className="hover:text-slate-800">
            Demo
          </Link>
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
function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "red" | "amber" | "blue" | "emerald";
}) {
  const cls = {
    red: "text-red-600",
    amber: "text-amber-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
  }[color];
  return (
    <div className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${cls}`}>
      {children}
    </div>
  );
}
