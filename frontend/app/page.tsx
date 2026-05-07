/**
 * Landing — single-page marketing scroll for jurors / visitors.
 *
 * Optimized for the 30-second skim: each section answers one of the
 * jury's four scoring questions in plain language.
 *
 *   Q1 Process we help with        → "The 2am moment" hero + problem
 *   Q2 How business critical       → cost stats
 *   Q3 Tech-solution impact        → architecture + scale
 *   Q4 Demo-solution impact        → live demo timeline + 25× number
 *
 * Sister pages:
 *   /present  — slide deck used during the live pitch
 *   /demo     — the actual product (ctx-mcp chat + graph)
 */
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bolt,
  Clock,
  Code2,
  DollarSign,
  Flame,
  Github,
  GitPullRequestArrow,
  Layers,
  Moon,
  Network,
  PlayCircle,
  Rocket,
  Send,
  ShieldCheck,
  Slack,
  Sparkles,
  Users,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const SPOTIFY = "#1DB954";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <Background />
      <NavBar />
      <Hero />
      <Cost />
      <HowItWorks />
      <DemoTimeline />
      <ImpactNumber />
      <Scale />
      <Ask />
      <Footer />
    </div>
  );
}

/* ─────────── Background grid + glow ─────────── */
function Background() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="pointer-events-none fixed -left-40 top-[-160px] -z-10 h-[500px] w-[500px] rounded-full opacity-[0.15] blur-[120px]"
        style={{ background: SPOTIFY }}
      />
      <div
        className="pointer-events-none fixed right-[-160px] top-[40%] -z-10 h-[400px] w-[400px] rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: SPOTIFY }}
      />
    </>
  );
}

/* ─────────── Nav ─────────── */
function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shadow-glow"
            style={{ background: SPOTIFY }}
          >
            <Sparkles size={16} className="text-black" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Spotify-2</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">
              Spotify · Cline + 2Hero
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-ink-mid md:flex">
          <a href="#problem" className="hover:text-ink">Problem</a>
          <a href="#solution" className="hover:text-ink">Solution</a>
          <a href="#demo" className="hover:text-ink">Demo</a>
          <a href="#impact" className="hover:text-ink">Impact</a>
          <Link href="/demo" className="hover:text-ink">
            Try it →
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/present"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-mid hover:border-white/30 hover:text-ink"
          >
            <PlayCircle size={14} /> Present
          </Link>
          <a
            href="#ask"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
            style={{ background: SPOTIFY }}
          >
            Talk to us <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ─────────── Hero ─────────── */
function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-24" id="problem">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-spotify/30 bg-spotify/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-spotify">
            <span className="h-1.5 w-1.5 rounded-full bg-spotify shimmer" />
            Spotify challenge · Intelligent context navigation
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] text-ink md:text-6xl lg:text-7xl">
            Cutting incident MTTR with an{" "}
            <span style={{ color: SPOTIFY }}>AI knowledge layer.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-mid">
            <span className="font-semibold text-ink">Slack · Linear · GitHub.</span>{" "}
            Wherever your team&apos;s incident knowledge lives, we connect it.
            Synthesized context in <span className="font-semibold text-ink">under 60 seconds</span>.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              style={{ background: SPOTIFY }}
            >
              See the live demo <PlayCircle size={16} />
            </Link>
            <Link
              href="/present"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 text-sm font-medium text-ink-mid hover:border-white/30 hover:text-ink"
            >
              Open the deck <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-ink-dim">
            <div className="flex items-center gap-2">
              <Users size={14} /> Team Spotify-2 · Chetan Singh + Henning
            </div>
            <div className="flex items-center gap-2">
              <Code2 size={14} /> Python MCP server + pgvector
            </div>
            <div className="flex items-center gap-2">
              <Github size={14} /> Real Slack + Linear + GitHub workspaces
            </div>
          </div>
        </div>

        {/* The "2am moment" card — the personal hook */}
        <div className="relative">
          <div
            className="absolute -inset-1 -z-10 rounded-2xl opacity-30 blur-xl"
            style={{ background: SPOTIFY }}
          />
          <div className="rounded-2xl border border-white/10 bg-bg-panel p-7 shadow-glow">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-spotify">
              <Moon size={14} /> The 2am moment
            </div>
            <p className="mt-5 font-display text-2xl leading-snug text-ink">
              <span style={{ color: SPOTIFY }} className="text-4xl">&ldquo;</span>
              We&apos;ve all spent hours at 2am hunting through Slack to figure out why auth
              broke.
            </p>
            <p className="mt-4 text-sm italic text-ink-dim">
              Every on-call engineer has this story.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/5 pt-5">
              {[
                { l: "Slack", I: Slack },
                { l: "Linear", I: Layers },
                { l: "GitHub", I: Github },
              ].map(({ l, I }) => (
                <div
                  key={l}
                  className="flex flex-col items-center gap-2 rounded-lg bg-bg-raised p-3"
                >
                  <I size={18} className="text-ink-dim" />
                  <span className="text-[10px] uppercase tracking-wide text-ink-dim">{l}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-dim">
              The first 10–30 minutes of every incident: the same hunt, every time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── The cost is enormous ─────────── */
function Cost() {
  const cards = [
    {
      I: DollarSign,
      n: "$5,600",
      u: "/min",
      label: "Enterprise downtime cost",
      sub: "Gartner — that's $336K/hour",
    },
    {
      I: Clock,
      n: "#1",
      u: "metric",
      label: "MTTR is on every SRE OKR",
      sub: "Reported up to the CTO",
    },
    {
      I: Flame,
      n: "Top 3",
      u: "reasons",
      label: "Senior engineers quit",
      sub: "On-call burnout — State of DevOps",
    },
  ];
  return (
    <section className="border-y border-white/5 bg-bg-panel/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Why it matters</SectionLabel>
        <h2 className="mt-3 font-display text-4xl font-semibold text-ink md:text-5xl">
          The cost is enormous.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map(({ I, n, u, label, sub }) => (
            <div
              key={label}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-bg-card p-7 transition hover:border-spotify/40"
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: SPOTIFY }}
              />
              <I size={22} className="text-spotify" />
              <div className="mt-4 font-display text-5xl font-bold leading-none" style={{ color: SPOTIFY }}>
                {n}
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-ink-dim">
                {u}
              </div>
              <div className="mt-4 text-base font-semibold text-ink">{label}</div>
              <div className="mt-1 text-sm italic text-ink-dim">{sub}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-lg bg-bg-raised px-5 py-4 text-sm">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-spotify" />
          <p className="text-ink-mid">
            <span className="font-semibold text-spotify">At Spotify — 2,000+ services.</span>{" "}
            Every minute of context-hunting compounds across hundreds of on-calls every week.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────── How it works ─────────── */
function HowItWorks() {
  return (
    <section id="solution" className="mx-auto max-w-6xl px-6 py-24">
      <SectionLabel>The solution</SectionLabel>
      <h2 className="mt-3 font-display text-4xl font-semibold text-ink md:text-5xl">
        Wherever your incident knowledge lives — we connect it.
      </h2>
      <p className="mt-4 max-w-2xl text-base text-ink-mid">
        No org has incident knowledge in one place. We unify Slack threads, Linear tickets,
        and GitHub runbooks + PRs — then synthesize them into one cited answer.
      </p>

      {/* Flow diagram */}
      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_auto_1fr_auto_0.9fr] lg:items-stretch">
        {/* 3 sources, single column */}
        <div className="flex flex-col gap-3">
          <SourceCard I={Slack}  title="Slack"  sub="Past incident channels & threads" />
          <SourceCard I={Layers} title="Linear" sub="Tickets · root causes · fixes" />
          <SourceCard I={Github} title="GitHub" sub="Runbooks · PRs · code that fixed past incidents" />
        </div>
        <FlowArrow />
        {/* Brain */}
        <div className="relative rounded-2xl border-2 border-spotify/60 bg-bg-raised p-7 shadow-glow">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: SPOTIFY }}
            >
              <Network size={20} className="text-black" />
            </div>
            <div>
              <div className="font-display text-xl font-semibold text-ink">
                AI Knowledge Layer
              </div>
              <div className="text-xs uppercase tracking-widest text-spotify">MCP server</div>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-ink-mid">
            <Capability>Unified semantic search across all sources</Capability>
            <Capability>Cross-source synthesis with deep-link citations</Capability>
            <Capability>Posts the answer back into the incident channel</Capability>
          </ul>
        </div>
        <FlowArrow />
        {/* Output */}
        <div className="rounded-2xl border border-white/10 bg-bg-card p-7">
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: SPOTIFY }}
          />
          <Bolt size={20} className="text-spotify" />
          <div className="mt-4 font-display text-3xl font-bold text-ink">Synthesis</div>
          <div className="font-display text-3xl font-bold" style={{ color: SPOTIFY }}>
            in seconds
          </div>
          <div className="mt-4 text-xs italic text-ink-dim">
            Past incident · runbook · ticket · fix · owner
          </div>
        </div>
      </div>

      {/* Bottom strip — "no matter where" */}
      <div className="mt-12 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-bg-raised px-6 py-4 text-sm">
        <SpotifyMark />
        <span className="font-semibold text-spotify">No matter where your knowledge lives.</span>
        <span className="text-ink-mid">Slack, Linear, GitHub today — any tool tomorrow.</span>
        <span className="ml-auto text-xs italic text-ink-dim">
          Demo: real workspaces, real data.
        </span>
      </div>
    </section>
  );
}

function SourceCard({
  I,
  title,
  sub,
}: {
  I: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <div className="relative flex flex-col rounded-xl border border-white/10 bg-bg-card p-4">
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
        style={{ background: SPOTIFY }}
      />
      <div className="flex items-center gap-2">
        <I size={16} className="text-spotify" />
        <div className="text-sm font-semibold text-ink">{title}</div>
      </div>
      <div className="mt-1 text-[11px] leading-snug text-ink-dim">{sub}</div>
    </div>
  );
}

function Capability({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: SPOTIFY }}
      />
      <span>{children}</span>
    </li>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <ArrowRight size={28} className="text-spotify/70" />
    </div>
  );
}

/* ─────────── Demo timeline ─────────── */
function DemoTimeline() {
  const steps = [
    {
      n: "1",
      title: "New incident in Slack",
      desc: "#incident-auth-down · 2 min ago · nobody knows yet",
      I: AlertTriangle,
      red: true,
    },
    {
      n: "2",
      title: "One prompt to Cline",
      desc: "“What do we know about this?”",
      I: MessageSquare,
    },
    {
      n: "3",
      title: "MCP fans out",
      desc: "Slack · Linear · GitHub — in parallel",
      I: Network,
    },
    {
      n: "4",
      title: "Synthesized context",
      desc: "Past incident · runbook · ticket · fix · owner",
      I: GitPullRequestArrow,
    },
    {
      n: "5",
      title: "Posted back to channel",
      desc: "Whole team gets context, not just the asker",
      I: Send,
    },
  ];
  return (
    <section
      id="demo"
      className="border-y border-white/5 bg-gradient-to-b from-bg via-bg-panel/40 to-bg"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Live demo</SectionLabel>
        <h2 className="mt-3 font-display text-4xl font-semibold text-ink md:text-5xl">
          New incident. Watch the team get context.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-ink-mid">
          A fresh Slack incident channel. Real Linear tickets, real GitHub runbooks + PRs in
          the back. One prompt — and the whole team has the answer.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-5">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative flex flex-col rounded-xl border border-white/10 bg-bg-card p-5"
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: s.red ? "#E5484D" : SPOTIFY }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="font-display text-2xl font-bold"
                  style={{ color: s.red ? "#E5484D" : SPOTIFY }}
                >
                  {s.n}
                </span>
                <s.I size={18} className={s.red ? "text-danger" : "text-spotify"} />
              </div>
              <div className="mt-4 text-sm font-semibold text-ink">{s.title}</div>
              <div className="mt-2 text-xs leading-relaxed text-ink-mid">{s.desc}</div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 flex items-center gap-3 rounded-xl px-6 py-4"
          style={{ background: "rgba(15,122,56,0.18)", border: "1px solid rgba(29,185,84,0.3)" }}
        >
          <Clock size={18} className="text-spotify" />
          <p className="text-sm text-ink">
            <span className="font-semibold">End-to-end on stage: under 60 seconds.</span>{" "}
            <span className="text-ink-mid italic">
              The whole on-call team gets the context — not just the asker.
            </span>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-md border border-spotify/30 bg-spotify/10 px-5 py-2.5 text-sm font-semibold text-spotify hover:bg-spotify/20"
          >
            Try the live demo <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Impact number ─────────── */
function ImpactNumber() {
  return (
    <section id="impact" className="mx-auto max-w-6xl px-6 py-24">
      <SectionLabel>The impact</SectionLabel>
      <h2 className="mt-3 font-display text-4xl font-semibold text-ink md:text-5xl">
        From hours of hunting to seconds of answer.
      </h2>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-white/10 bg-bg-card p-8">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-dim">
            Traditional
          </div>
          <div className="mt-4 font-display text-7xl font-bold text-ink-dim">~25 min</div>
          <div className="mt-3 text-base italic text-ink-mid">just to gather context</div>
          <div className="mt-2 text-xs leading-relaxed text-ink-dim">
            Slack search · old issues · runbooks · grafana · git blame · pinging seniors
          </div>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight size={36} className="text-spotify" />
        </div>
        <div className="rounded-2xl border-2 border-spotify/60 bg-bg-raised p-8 shadow-glow">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-spotify">
            With our MCP
          </div>
          <div
            className="mt-4 font-display text-7xl font-bold"
            style={{ color: SPOTIFY }}
          >
            &lt; 60 sec
          </div>
          <div className="mt-3 text-base italic text-ink">end-to-end diagnosis</div>
          <div className="mt-2 text-xs leading-relaxed text-ink-mid">
            Cause · fix · prior incidents · owner — synthesized in one prompt
          </div>
        </div>
      </div>

      <div
        className="mt-8 rounded-xl px-6 py-4 text-center text-sm"
        style={{ background: "rgba(15,122,56,0.18)", border: "1px solid rgba(29,185,84,0.3)" }}
      >
        <span className="font-semibold text-ink">~25× faster context gathering.</span>{" "}
        <span className="italic text-ink-mid">Live stopwatch on screen during the demo.</span>
      </div>
    </section>
  );
}

/* ─────────── Scale + secondary wins ─────────── */
function Scale() {
  const wins = [
    {
      I: Flame,
      title: "Reduces on-call burnout",
      desc: "Engineers spend less time hunting, more time fixing.",
    },
    {
      I: Rocket,
      title: "Accelerates onboarding",
      desc: "Junior engineers get senior-level context instantly.",
    },
    {
      I: Users,
      title: "Captures tribal knowledge",
      desc: "Insights stay even when seniors leave.",
    },
  ];
  return (
    <section className="border-y border-white/5 bg-bg-panel/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Scale & secondary wins</SectionLabel>
        <h2 className="mt-3 font-display text-4xl font-semibold text-ink md:text-5xl">
          Beyond incidents. Beyond any one tool.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          {/* Big stat */}
          <div className="relative rounded-2xl border border-white/10 bg-bg-card p-8">
            <div
              className="absolute inset-x-0 top-0 h-[2px]"
              style={{ background: SPOTIFY }}
            />
            <SpotifyMark />
            <div
              className="mt-6 font-display text-7xl font-bold"
              style={{ color: SPOTIFY }}
            >
              2,000+
            </div>
            <div className="mt-2 text-base font-semibold text-ink">services at Spotify</div>
            <div className="mt-2 text-xs italic text-ink-dim">
              Any tool. Any team. Drop in a token, get unified context.
            </div>
          </div>

          {/* Wins */}
          <div className="flex flex-col gap-4">
            {wins.map(({ I, title, desc }) => (
              <div
                key={title}
                className="relative flex items-start gap-4 rounded-xl border border-white/10 bg-bg-card p-5"
              >
                <div
                  className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                  style={{ background: SPOTIFY }}
                />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-spotify/10">
                  <I size={20} className="text-spotify" />
                </div>
                <div>
                  <div className="font-semibold text-ink">{title}</div>
                  <div className="mt-1 text-sm text-ink-mid">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm italic text-ink-dim">
          One knowledge layer. Many use cases — incidents, onboarding, code review,
          architecture decisions.
        </p>
      </div>
    </section>
  );
}

/* ─────────── Ask ─────────── */
function Ask() {
  return (
    <section id="ask" className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(29,185,84,0.18) 0%, rgba(15,122,56,0.05) 100%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <SectionLabel>Let&apos;s talk</SectionLabel>
            <h2 className="mt-3 font-display text-6xl font-bold leading-[1.05] text-ink">
              20 minutes.
              <br />
              <span style={{ color: SPOTIFY }}>Online.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg italic text-ink-mid">
              We&apos;d love to show you how this could deploy at Spotify — across Slack, Linear,
              GitHub, and any tool your teams already use.
            </p>
            <a
              href="mailto:chetan@kalipso.ai?subject=Spotify%20Hackathon%20-%20Knowledge%20MCP%20demo"
              className="mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              style={{ background: SPOTIFY }}
            >
              chetan@kalipso.ai <ArrowUpRight size={16} />
            </a>
          </div>

          {/* Team card */}
          <div className="rounded-2xl border border-spotify/30 bg-bg-panel p-8 shadow-glow">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-spotify">
              <Users size={14} /> Team Spotify-2
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-b border-white/5 pb-6">
              <div>
                <div className="font-display text-2xl font-bold text-ink">Chetan Singh</div>
                <div className="mt-1 text-xs italic" style={{ color: "#C9F5D5" }}>
                  Founding Engineer · Kalipso
                </div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-ink">Henning</div>
                <div className="mt-1 text-xs italic" style={{ color: "#C9F5D5" }}>
                  Co-builder
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-ink-mid">
              <Row I={Code2}>Backend · Infra · AI engineering</Row>
              <Row I={ShieldCheck}>Came 2nd at Kong hackathon — back for the win</Row>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  I,
  children,
}: {
  I: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <I size={16} className="text-spotify" />
      <span>{children}</span>
    </div>
  );
}

/* ─────────── Footer ─────────── */
function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-dim">
        <div>© Team Spotify-2 · Spotify × Cline + 2Hero hackathon · 2026</div>
        <div className="flex items-center gap-4">
          <Link href="/demo" className="hover:text-ink">
            Try it →
          </Link>
          <Link href="/present" className="hover:text-ink">
            Open the deck →
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ─────────── Tiny helpers ─────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-spotify">
      {children}
    </div>
  );
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill={SPOTIFY} />
      <path
        fill="#0A0A0A"
        d="M30 38c14-6 32-6 46 2 2 1 3 4 1 6-2 2-4 3-7 1-12-7-28-7-39-2-2 1-5 0-6-2-1-2 0-4 5-5zm0 14c12-5 26-5 38 2 2 1 3 3 1 5-2 2-3 3-5 1-10-6-22-6-32-2-2 1-4 0-5-2-1-2 0-3 3-4zm0 12c10-4 22-4 31 2 2 1 2 3 1 4-1 1-3 2-4 1-8-5-18-5-26-2-2 1-3 0-4-1-1-2 0-3 2-4z"
      />
    </svg>
  );
}
