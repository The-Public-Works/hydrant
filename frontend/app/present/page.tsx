/**
 * Present — slide deck used during the live pitch.
 *
 * Audience-facing URL:    /present
 * Speaker-notes URL:      /present?speaker_notes=true
 *
 * Keyboard navigation:
 *   →  Space  l  j        next slide
 *   ←  Shift+Space  h  k  previous slide
 *   1–8                   jump
 *   ESC                   exit to landing
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bolt,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  DollarSign,
  Flame,
  Github,
  GitPullRequestArrow,
  Layers,
  Mail,
  MessageSquare,
  Moon,
  Network,
  PlayCircle,
  Rocket,
  Send,
  ShieldCheck,
  Slack,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const SPOTIFY = "#1DB954";
const TOTAL = 8;

type SlideId =
  | "title"
  | "problem"
  | "cost"
  | "solution"
  | "demo"
  | "impact"
  | "scale"
  | "ask";

const ORDER: SlideId[] = [
  "title",
  "problem",
  "cost",
  "solution",
  "demo",
  "impact",
  "scale",
  "ask",
];

const SPEAKER_NOTES: Record<SlideId, string[]> = {
  title: [
    "Open with the personal hook from slide 2 — make it visceral, not hypothetical.",
    "Name the team and challenge clearly, then move on. Don't linger on this slide.",
  ],
  problem: [
    "Open with the 2am framing — make eye contact, slow down. 15 seconds max.",
    "Land the line: 'Every on-call engineer has this story.' Pause for it.",
    "Then: this is the process we're cutting — first 10–30 minutes of every incident.",
  ],
  cost: [
    "Read the $5,600/min number out loud. Say it twice if you need to.",
    "MTTR is on the CTO's dashboard. This isn't an engineering problem — it's a board problem.",
    "Spotify-specific: 2,000+ services means hundreds of on-calls every week. Compounds.",
  ],
  solution: [
    "Lead with 'no matter where your knowledge lives' — that's the unlock for non-technical jurors.",
    "Name the four sources fast. Don't dive into embeddings/vectors — jurors don't care.",
    "Land: every juror has lost time hunting across exactly these four tools. This generalizes day one.",
  ],
  demo: [
    "Open the fresh #incident-auth-down channel — show real panic, real timestamps. Make it feel live.",
    "One prompt to Cline. Stopwatch starts the moment you press enter.",
    "Highlight the deep-link citations as the answer streams — Slack thread, Linear ticket, GitHub runbook, GitHub PR.",
    "The reveal moment is the bot posting the synthesis BACK into the incident channel. Pause there.",
    "If anything fails live, switch to the recorded backup video without explaining why.",
  ],
  impact: [
    "After the demo lands, this slide stamps the number into memory.",
    "25× is your headline. Say it. Repeat it. Put it on the screenshot they'll remember.",
  ],
  scale: [
    "Pivot from 'incident MTTR' to the broader knowledge layer story.",
    "Same engine, many use cases — onboarding is your strongest secondary.",
  ],
  ask: [
    "Direct invite for the 20-minute meeting. That's literally Q5 on the jury form.",
    "Email and team name on screen. Make it easy to follow up.",
  ],
};

function readShowNotes(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("speaker_notes");
  return v === "true" || v === "1" || v === "yes";
}

export default function Present() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  // Initialize from URL on mount only — avoids SSR hydration mismatch.
  useEffect(() => {
    setShowNotes(readShowNotes());
  }, []);

  const slideId = ORDER[idx];

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [idx]);

  const next = () => setIdx((i) => Math.min(TOTAL - 1, i + 1));
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") {
        router.push("/");
        return;
      }
      if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === "l" ||
        e.key === "j" ||
        (e.key === " " && !e.shiftKey)
      ) {
        e.preventDefault();
        next();
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        e.key === "h" ||
        e.key === "k" ||
        (e.key === " " && e.shiftKey)
      ) {
        e.preventDefault();
        prev();
      } else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (n < TOTAL) setIdx(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const isFirst = idx === 0;
  const isLast = idx === TOTAL - 1;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-bg text-ink">
      <Background />

      {/* top chrome */}
      <header className="z-20 flex shrink-0 items-center justify-between gap-4 px-10 py-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shadow-glow"
            style={{ background: SPOTIFY }}
          >
            <Sparkles size={16} className="text-black" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-spotify">
            Team Spotify-2 · Spotify Challenge
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showNotes && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300 ring-1 ring-amber-400/40">
              ● notes on
            </span>
          )}
          <SlideDots count={TOTAL} active={idx} onPick={setIdx} />
          <span className="font-mono text-xs text-ink-dim">
            {String(idx + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-ink-mid hover:border-spotify/50 hover:text-spotify"
            title="Exit (Esc)"
          >
            <X size={12} /> Exit
          </button>
        </div>
      </header>

      {/* slide body */}
      <main
        ref={mainRef}
        className="relative z-10 flex flex-1 min-h-0 flex-col items-stretch justify-start overflow-y-auto px-10 pb-6 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col">
          <SlideRenderer id={slideId} />

          {showNotes && (
            <div
              className="mt-10 rounded-xl border border-spotify/30 bg-spotify/5 px-6 py-5"
              aria-label="Speaker notes"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-spotify">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-spotify" />
                Speaker notes
                <span className="ml-auto font-mono text-[10px] opacity-70">
                  ?speaker_notes=true
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-mid">
                {SPEAKER_NOTES[slideId].map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="select-none opacity-50">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* prev/next floating */}
      <button
        type="button"
        onClick={prev}
        disabled={isFirst}
        title="Previous slide (← / h / k)"
        className={`fixed left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 p-2 transition hover:border-spotify/60 hover:text-spotify ${
          isFirst ? "cursor-not-allowed opacity-30" : ""
        }`}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={next}
        disabled={isLast}
        title="Next slide (→ / l / j / Space)"
        className={`fixed right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 p-2 transition hover:border-spotify/60 hover:text-spotify ${
          isLast ? "cursor-not-allowed opacity-30" : ""
        }`}
      >
        <ChevronRight size={18} />
      </button>

      <KeyboardHint />
    </div>
  );
}

/* ─── slide content ──────────────────────────────────────────────────── */

function SlideRenderer({ id }: { id: SlideId }) {
  switch (id) {
    case "title":
      return <SlideTitle />;
    case "problem":
      return <SlideProblem />;
    case "cost":
      return <SlideCost />;
    case "solution":
      return <SlideSolution />;
    case "demo":
      return <SlideDemo />;
    case "impact":
      return <SlideImpact />;
    case "scale":
      return <SlideScale />;
    case "ask":
      return <SlideAsk />;
  }
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-spotify">
      {children}
    </div>
  );
}

function SlideTitle() {
  return (
    <div className="flex min-h-[72vh] flex-col justify-center">
      <Kicker>Spotify · Cline + 2Hero · 2026</Kicker>
      <h1 className="mt-6 font-display text-6xl font-bold leading-[1.05] text-ink md:text-7xl lg:text-[88px]">
        Cutting incident MTTR
        <br />
        with an <span style={{ color: SPOTIFY }}>AI knowledge layer</span>.
      </h1>
      <p className="mt-8 max-w-3xl text-2xl italic text-ink-mid">
        From hours of hunting to seconds of context — across Slack, Linear and GitHub.
      </p>
      <div className="mt-12 flex items-center gap-3 text-sm text-ink-dim">
        <Users size={16} />
        Team Spotify-2 · Chetan Singh + Henning
      </div>
    </div>
  );
}

function SlideProblem() {
  const tools = [
    { l: "Slack",  I: Slack },
    { l: "Linear", I: Layers },
    { l: "GitHub", I: Github },
  ];
  return (
    <div>
      <Kicker>The problem</Kicker>
      <h2 className="mt-4 flex items-center gap-4 font-display text-5xl font-bold text-ink lg:text-6xl">
        <Moon size={42} style={{ color: SPOTIFY }} />
        It&apos;s 2am. Auth is broken.
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* quote */}
        <div className="relative rounded-2xl border-l-4 border-spotify bg-bg-panel p-8">
          <span
            className="absolute right-6 top-3 font-display text-7xl leading-none opacity-30"
            style={{ color: SPOTIFY }}
          >
            &ldquo;
          </span>
          <p className="font-display text-2xl italic leading-snug text-ink lg:text-3xl">
            We&apos;ve all spent hours at 2am hunting through Slack to figure out why auth
            broke.
          </p>
          <p className="mt-6 text-sm text-ink-dim">Every on-call engineer has this story.</p>
        </div>

        {/* the process */}
        <div className="flex flex-col gap-5">
          <div>
            <Kicker>The process we&apos;re fixing</Kicker>
            <h3 className="mt-3 font-display text-3xl font-semibold text-ink">
              The first 10–30 minutes of every incident.
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {tools.map(({ l, I }) => (
              <div
                key={l}
                className="flex flex-col items-center gap-2 rounded-lg bg-bg-raised p-4"
              >
                <I size={22} className="text-ink-dim" />
                <span className="text-[11px] uppercase tracking-wide text-ink-dim">{l}</span>
              </div>
            ))}
          </div>
          <p className="text-sm italic text-ink-mid">
            Same hunt. Every time. Every team.
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideCost() {
  const cards = [
    { I: DollarSign, n: "$5,600", u: "/min", l: "Enterprise downtime cost", s: "Gartner — that's $336K/hour" },
    { I: Clock,      n: "#1",     u: "metric",  l: "MTTR is on every SRE OKR", s: "Reported up to the CTO" },
    { I: Flame,      n: "Top 3",  u: "reasons", l: "Senior engineers quit",    s: "On-call burnout — State of DevOps" },
  ];
  return (
    <div>
      <Kicker>Why it matters</Kicker>
      <h2 className="mt-4 font-display text-5xl font-bold text-ink lg:text-6xl">
        The cost is enormous.
      </h2>
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.l}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-bg-card p-7"
          >
            <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: SPOTIFY }} />
            <c.I size={22} className="text-spotify" />
            <div
              className="mt-5 font-display text-6xl font-bold leading-none"
              style={{ color: SPOTIFY }}
            >
              {c.n}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-ink-dim">
              {c.u}
            </div>
            <div className="mt-4 text-base font-semibold text-ink">{c.l}</div>
            <div className="mt-1 text-sm italic text-ink-dim">{c.s}</div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex items-start gap-3 rounded-lg bg-bg-raised px-5 py-4">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-spotify" />
        <p className="text-base text-ink-mid">
          <span className="font-semibold text-spotify">At Spotify — 2,000+ services.</span>{" "}
          Every minute of context-hunting compounds across hundreds of on-calls every week.
        </p>
      </div>
    </div>
  );
}

function SlideSolution() {
  return (
    <div>
      <Kicker>The solution</Kicker>
      <h2 className="mt-4 font-display text-4xl font-bold text-ink lg:text-5xl">
        Wherever your incident knowledge lives — we connect it.
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_auto_1fr_auto_0.9fr] lg:items-stretch">
        {/* 3 sources, single column */}
        <div className="flex flex-col gap-3">
          <SourceBox I={Slack}  title="Slack"  sub="Past incident channels & threads" />
          <SourceBox I={Layers} title="Linear" sub="Tickets · root causes · fixes" />
          <SourceBox I={Github} title="GitHub" sub="Runbooks · PRs · code that fixed past incidents" />
        </div>
        <div className="hidden items-center justify-center lg:flex">
          <ArrowRight size={28} className="text-spotify/70" />
        </div>
        {/* MCP brain */}
        <div className="rounded-2xl border-2 border-spotify/60 bg-bg-raised p-7 shadow-glow">
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
            <Bullet>Unified semantic search</Bullet>
            <Bullet>Cross-source synthesis</Bullet>
            <Bullet>Cited deep-links back</Bullet>
          </ul>
        </div>
        <div className="hidden items-center justify-center lg:flex">
          <ArrowRight size={28} className="text-spotify/70" />
        </div>
        {/* Output */}
        <div className="relative rounded-2xl border border-white/10 bg-bg-card p-7">
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: SPOTIFY }} />
          <Bolt size={22} className="text-spotify" />
          <div className="mt-4 font-display text-3xl font-bold text-ink">Synthesis</div>
          <div className="font-display text-3xl font-bold" style={{ color: SPOTIFY }}>
            in seconds
          </div>
          <div className="mt-4 text-xs italic text-ink-dim">
            Past incident · runbook · ticket · fix · owner
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-bg-raised px-6 py-4">
        <SpotifyMark />
        <span className="text-sm text-ink-mid">No matter where your knowledge lives.</span>
        <span className="ml-auto text-xs italic text-ink-dim">
          Demo: real Slack + Linear + GitHub workspaces.
        </span>
      </div>
    </div>
  );
}

function SourceBox({
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SPOTIFY }} />
      <span>{children}</span>
    </li>
  );
}

function SlideDemo() {
  const steps = [
    { n: "1", t: "New incident in Slack", d: "#incident-auth-down · 2 min ago · nobody knows yet", I: AlertTriangle, red: true },
    { n: "2", t: "One prompt to Cline",   d: "“What do we know about this?”",                       I: MessageSquare },
    { n: "3", t: "MCP fans out",          d: "Slack · Linear · GitHub — in parallel",               I: Network },
    { n: "4", t: "Synthesized context",   d: "Past incident · runbook · ticket · fix · owner",       I: GitPullRequestArrow },
    { n: "5", t: "Posted back to channel",d: "Whole team gets context, not just the asker",          I: Send },
  ];
  return (
    <div>
      <Kicker>Live demo</Kicker>
      <h2 className="mt-4 flex items-center gap-3 font-display text-5xl font-bold text-ink lg:text-6xl">
        <PlayCircle size={42} className="text-spotify" />
        New incident. Watch the team get context.
      </h2>

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
                className="font-display text-3xl font-bold"
                style={{ color: s.red ? "#E5484D" : SPOTIFY }}
              >
                {s.n}
              </span>
              <s.I size={20} className={s.red ? "text-danger" : "text-spotify"} />
            </div>
            <div className="mt-5 text-base font-semibold text-ink">{s.t}</div>
            <div className="mt-2 text-sm leading-relaxed text-ink-mid">{s.d}</div>
          </div>
        ))}
      </div>

      <div
        className="mt-10 flex items-center gap-3 rounded-xl px-6 py-4"
        style={{ background: "rgba(15,122,56,0.18)", border: "1px solid rgba(29,185,84,0.3)" }}
      >
        <Clock size={18} className="text-spotify" />
        <p className="text-base text-ink">
          <span className="font-semibold">End-to-end on stage: under 60 seconds.</span>{" "}
          <span className="text-ink-mid italic">
            The whole on-call team gets the context — not just the asker.
          </span>
        </p>
      </div>
    </div>
  );
}

function SlideImpact() {
  return (
    <div>
      <Kicker>The impact</Kicker>
      <h2 className="mt-4 font-display text-5xl font-bold text-ink lg:text-6xl">
        From hours of hunting to seconds of answer.
      </h2>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-white/10 bg-bg-card p-8">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-dim">
            Traditional
          </div>
          <div className="mt-6 font-display text-8xl font-bold text-ink-dim">~25 min</div>
          <div className="mt-4 text-base italic text-ink-mid">just to gather context</div>
          <div className="mt-2 text-xs leading-relaxed text-ink-dim">
            Slack · old issues · runbooks · grafana · git blame · pinging seniors
          </div>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight size={42} className="text-spotify" />
        </div>
        <div className="rounded-2xl border-2 border-spotify/60 bg-bg-raised p-8 shadow-glow">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-spotify">
            With our MCP
          </div>
          <div
            className="mt-6 font-display text-8xl font-bold"
            style={{ color: SPOTIFY }}
          >
            &lt; 60s
          </div>
          <div className="mt-4 text-base italic text-ink">end-to-end diagnosis</div>
          <div className="mt-2 text-xs leading-relaxed text-ink-mid">
            Cause · fix · prior incidents · owner — synthesized in one prompt
          </div>
        </div>
      </div>

      <div
        className="mt-10 rounded-xl px-6 py-4 text-center"
        style={{ background: "rgba(15,122,56,0.18)", border: "1px solid rgba(29,185,84,0.3)" }}
      >
        <span className="text-lg font-semibold text-ink">~25× faster context gathering.</span>{" "}
        <span className="italic text-ink-mid">Live stopwatch on screen during the demo.</span>
      </div>
    </div>
  );
}

function SlideScale() {
  const wins = [
    { I: Flame,  t: "Reduces on-call burnout",      d: "Engineers spend less time hunting, more time fixing." },
    { I: Rocket, t: "Accelerates onboarding",        d: "Junior engineers get senior-level context instantly." },
    { I: Users,  t: "Captures tribal knowledge",     d: "Insights stay even when seniors leave." },
  ];
  return (
    <div>
      <Kicker>Scale & secondary wins</Kicker>
      <h2 className="mt-4 font-display text-5xl font-bold text-ink lg:text-6xl">
        Beyond incidents. Beyond any one tool.
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="relative rounded-2xl border border-white/10 bg-bg-card p-8">
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: SPOTIFY }} />
          <SpotifyMark />
          <div
            className="mt-8 font-display text-8xl font-bold leading-none"
            style={{ color: SPOTIFY }}
          >
            2,000+
          </div>
          <div className="mt-4 text-base font-semibold text-ink">services at Spotify</div>
          <div className="mt-2 text-sm italic text-ink-dim">
            Any tool. Any team. Drop in a token, get unified context.
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {wins.map(({ I, t, d }) => (
            <div
              key={t}
              className="relative flex items-start gap-4 rounded-xl border border-white/10 bg-bg-card p-5"
            >
              <div
                className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                style={{ background: SPOTIFY }}
              />
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-spotify/10">
                <I size={20} className="text-spotify" />
              </div>
              <div>
                <div className="text-base font-semibold text-ink">{t}</div>
                <div className="mt-1 text-sm text-ink-mid">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-sm italic text-ink-dim">
        One knowledge layer. Many use cases — incidents, onboarding, code review, architecture
        decisions.
      </p>
    </div>
  );
}

function SlideAsk() {
  return (
    <div className="grid min-h-[68vh] grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
      <div>
        <Kicker>Let&apos;s talk</Kicker>
        <h2 className="mt-4 font-display text-7xl font-bold leading-[1.05] text-ink lg:text-8xl">
          20 minutes.
          <br />
          <span style={{ color: SPOTIFY }}>Online.</span>
        </h2>
        <p className="mt-8 max-w-xl text-2xl italic text-ink-mid">
          We&apos;d love to show you how this could deploy at Spotify — across Slack, Linear,
          GitHub, and any tool your teams already use.
        </p>
      </div>

      <div className="rounded-2xl border border-spotify/30 bg-bg-panel p-8 shadow-glow">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-spotify">
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
              Founding Engineer · Kalipso
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm text-ink-mid">
          <a
            href="mailto:chetan@kalipso.ai"
            className="flex items-center gap-3 hover:text-ink"
          >
            <Mail size={16} className="text-spotify" />
            chetanbadgujar92@gmail.com
          </a>
          <div className="flex items-center gap-3">
            <Code2 size={16} className="text-spotify" />
            Backend · Infra · AI engineering
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── chrome pieces ──────────────────────────────────────────────────── */

function Background() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="pointer-events-none fixed -left-40 top-[-160px] -z-10 h-[500px] w-[500px] rounded-full opacity-[0.13] blur-[120px]"
        style={{ background: SPOTIFY }}
      />
    </>
  );
}

function SlideDots({
  count,
  active,
  onPick,
}: {
  count: number;
  active: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="hidden items-center gap-1 md:flex">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          aria-label={`Go to slide ${i + 1}`}
          className={`h-1.5 rounded-full transition-all ${
            i === active ? "w-7" : "w-1.5 hover:opacity-70"
          }`}
          style={{ background: i === active ? SPOTIFY : "rgba(255,255,255,0.2)" }}
        />
      ))}
    </div>
  );
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill={SPOTIFY} />
      <path
        fill="#0A0A0A"
        d="M30 38c14-6 32-6 46 2 2 1 3 4 1 6-2 2-4 3-7 1-12-7-28-7-39-2-2 1-5 0-6-2-1-2 0-4 5-5zm0 14c12-5 26-5 38 2 2 1 3 3 1 5-2 2-3 3-5 1-10-6-22-6-32-2-2 1-4 0-5-2-1-2 0-3 3-4zm0 12c10-4 22-4 31 2 2 1 2 3 1 4-1 1-3 2-4 1-8-5-18-5-26-2-2 1-3 0-4-1-1-2 0-3 2-4z"
      />
    </svg>
  );
}

function KeyboardHint() {
  const [open, setOpen] = useState(false);
  const help = useMemo(
    () => [
      ["→ / Space", "next"],
      ["←", "prev"],
      ["1–8", "jump"],
      ["ESC", "exit"],
    ],
    [],
  );
  return (
    <div className="fixed bottom-3 right-3 z-20 text-right">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-white/15 bg-bg/70 px-2 py-1 font-mono text-[10px] text-ink-mid backdrop-blur hover:border-spotify/50 hover:text-spotify"
      >
        {open ? "× hide keys" : "?"}
      </button>
      {open && (
        <div className="mt-1 rounded-md border border-white/15 bg-bg/95 p-2 text-left font-mono text-[10px] leading-tight text-ink-mid">
          {help.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-ink">{k}</span>
              <span className="opacity-70">{v}</span>
            </div>
          ))}
          <div className="mt-2 border-t border-white/10 pt-2 opacity-70">
            <Link href="/?speaker_notes=true" className="hover:text-spotify">
              speaker notes mode
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
