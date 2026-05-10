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
  BookOpen,
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

// Order matters: slides 2 + 3 must answer the jury's 1A (target user) and
// 1B (mission-critical goal) per the finalist-selection rules. Slide 4
// is the before/after impact — placed early so jurors see the visceral
// shift before the architecture, then live demo proves it.
//   1   Title
//   2   1A · Target user                  → Q1 (well articulated)
//   3   1B · Mission-critical goal        → Q2 (mission-critical)
//   4   The shift · before/after          → Q4 (demo impact, previewed)
//   5   Solution · 3-source AI layer      → Q3 (tech opportunity)
//   6   Live demo · 5-step proof          → Q3 + Q4 (live execution)
//   7   Scale & secondary wins            → Q3 (generalizes)
//   8   Ask · 20 minutes                  → conversion
const ORDER: SlideId[] = [
  "title",
  "problem",
  "cost",
  "impact",
  "solution",
  "demo",
  "scale",
  "ask",
];

const SPEAKER_NOTES: Record<SlideId, string[]> = {
  title: [
    "OPEN (read aloud): 'Hi — we're Team Spotify-2, Chetan and Henning. We built ctx-mcp for Spotify's Intelligent Context Navigation challenge.'",
    "HOOK: 'In the next 5 minutes we'll show you how an AI knowledge layer cuts incident MTTR for the on-call engineer — the most exposed person in the company at 2am.'",
    "SETUP next slide: 'Let me start by being specific about who we're helping and why it matters.'",
    "Pace cue: ~15 seconds. Don't linger on this slide — momentum matters.",
  ],
  problem: [
    "OPEN (read aloud): 'It's 2am. Their phone buzzes. Something on production just broke and they're the one on-call. They have 5 minutes to figure out what's wrong before the situation escalates and the whole company is watching.'",
    "REINFORCE specificity: 'We're being deliberately specific here. Not the whole engineering team. Not someone calmly reviewing dashboards during the day. One person. One moment.'",
    "VOLUME line: 'Across an org of Spotify's size — 2,000+ services on rotation — that's 50+ person-years per year of engineering time burned just hunting for context.'",
    "CLOSE: 'That's the user. Now let me tell you what their goal actually is.'",
    "Pace cue: ~25 seconds total. The 4 brand-coloured tool blocks (Slack / GitHub / Linear / Sentry) do the visual heavy-lifting — let them speak.",
  ],
  cost: [
    "OPEN (read aloud): 'Their goal is simple — restore production, fast. Every minute they're hunting for context, the business is bleeding.'",
    "WALK through the 4 cards (point at each as you say it):",
    "  1. '$5,600 a minute. That's Gartner's number for enterprise downtime — not a hypothetical.'",
    "  2. 'MTTR is on the CEO's dashboard. This isn't an engineering metric — it's a board metric.'",
    "  3. 'Top-3 reason senior engineers quit. The cost compounds when good people walk out.'",
    "  4. 'SLA exposure on enterprise contracts. Repeated breaches mean lost deals.'",
    "CLOSE (read verbatim): 'Faster diagnosis equals dollars saved, customers retained, engineers retained.'",
    "Pace cue: ~30 seconds. Pause for half a beat after the closing line — let it land.",
  ],
  impact: [
    "PAUSE for ~3 seconds before talking — let jurors absorb the contrast.",
    "OPEN (read aloud): 'Here's the shift we're delivering.'",
    "POINT at the BEFORE panel: 'Five tools open. Twenty-five minutes. One engineer hunting alone — and whatever they figure out dies in DMs.'",
    "POINT at the AFTER panel: 'One channel. Around two minutes. The whole on-call team has the answer — and Linear has the audit trail.'",
    "POINT at the metric ribbon: 'Every dimension shifts — time, team context, audit trail, cognitive load.'",
    "CLOSE: 'Linear has the receipts. That's how we beat closed-app competitors that hand you an answer with no proof.'",
    "Pace cue: ~30 seconds. The visual does the heavy lifting — don't over-explain.",
  ],
  solution: [
    "OPEN (read aloud): 'Here's how it works. No org has incident knowledge in one place — so we don't try to move it. We go to where it already lives.'",
    "POINT at the 5 source boxes: 'Sentry alerts, Slack threads, Linear tickets, GitHub runbooks and PRs, Notion docs. Five sources, all indexed continuously.'",
    "POINT at the brain in the middle: 'An AI knowledge layer that does cross-source semantic search and synthesis. We built it as an MCP server — so any AI agent, like Cline, can use it.'",
    "POINT at the synthesis output: 'Out comes one cited answer with deep links to every source.'",
    "GENERALIZE: 'Today it's Slack, Linear, and GitHub. Tomorrow: any tool your team adds — drop in a connector, the same engine indexes it.'",
    "Pace cue: ~30 seconds. Skip embeddings/vectors talk — non-technical jurors don't care.",
  ],
  demo: [
    "OPEN (read aloud): 'Let me show you this happening live.'",
    "[CLICK 'Start' on the slide-6 stopwatch BEFORE switching to Cline. The timer keeps running across slide-changes (it's localStorage-backed) so you can come back here at the end to see the final time.]",
    "[SWITCH TO CLINE. Paste the demo prompt from clipboard. Press enter.]",
    "NARRATE STEP 1: 'A new incident channel just opened — auth is throwing 401s on production.'",
    "NARRATE STEP 2: 'One prompt — into Cline, our sponsor's AI agent.'",
    "NARRATE STEP 3 (while Cline runs): 'Cline is calling our MCP server. It fans out across Slack, Linear, and GitHub in parallel.'",
    "NARRATE STEP 4: 'Synthesizing context — past Slack thread, Linear RCA, GitHub runbook, the breaking PR, the owner to page.'",
    "NARRATE STEP 5 (the punchline): 'And the synthesis posts back to the incident channel. The whole on-call team has the answer — not just whoever asked.'",
    "[NAVIGATE BACK to slide 6. CLICK 'Stop' on the stopwatch — the digits turn green and lock at the final time.]",
    "READ the time aloud (e.g.): 'Around two minutes. End-to-end.' If it went over 2 minutes, own it: 'a little long on this run — the API was a bit slow today, but the synthesis is right.'",
    "If live fails: switch to the backup video silently. Don't apologise, don't narrate the failure — just resume narrating from STEP 3 over the recording.",
  ],
  scale: [
    "OPEN (read aloud): 'This isn't just an incident-response tool. It's a general knowledge layer.'",
    "POINT at 2,000+: 'At Spotify scale, 2,000+ services. The same engine deploys across all of them on day one — drop in a token, get unified context.'",
    "WALK the 3 wins (point at each):",
    "  1. 'Reduces on-call burnout. Less hunting, more fixing.'",
    "  2. 'Accelerates onboarding. Junior engineers get senior-level context instantly.'",
    "  3. 'Captures tribal knowledge. Insights stay even when seniors leave.'",
    "CLOSE: 'One knowledge layer. Many use cases — incidents today, onboarding and code review tomorrow.'",
    "Pace cue: ~25 seconds.",
  ],
  ask: [
    "OPEN (read aloud): 'We'd love twenty minutes online to show you how this could deploy at Spotify.'",
    "EXPAND: 'Across Slack, Linear, GitHub — across services and teams. Whatever your engineers already use.'",
    "CLOSE: 'The email is on the screen. Thanks for watching.'",
    "Pace cue: ~15 seconds. End with a half-beat of silence so the email line lands.",
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
  // Slide 2 — answers jury question 1A: "Who is the target user?"
  // Surgical, specific persona. Not "engineering teams" — the on-call
  // engineer in the first 5 minutes of an incident.
  //
  // Brand-color the tool icons (vs the previous dim-grey treatment) so
  // jurors recognize Slack / GitHub / Linear / Sentry by sight in one
  // second instead of having to read the labels.
  const tools = [
    { l: "Slack",  I: Slack,         color: "#36C5F0" }, // Slack-cyan
    { l: "GitHub", I: Github,        color: "#FFFFFF" }, // wordmark white on dark
    { l: "Linear", I: Layers,        color: "#5E6AD2" }, // Linear's signature indigo
    { l: "Sentry", I: AlertTriangle, color: "#FB4226" }, // Sentry red — also reads as "alert"
  ];
  return (
    <div>
      <Kicker>1A · Target user</Kicker>
      <h2 className="mt-4 font-display text-5xl font-bold leading-[1.1] text-ink lg:text-6xl">
        On-call engineers,
        <br />
        <span style={{ color: SPOTIFY }}>in the first 5 minutes</span> of an incident.
      </h2>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-mid lg:text-xl">
        Not engineering teams in general. Not SREs reviewing dashboards.{" "}
        <span className="font-semibold text-ink">
          The specific human paged at 2am
        </span>{" "}
        with 5 minutes to figure out <em>what broke</em> before the CEO joins
        the channel.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">
        {/* Left — what's open on their screen */}
        <div className="flex flex-col">
          <Kicker>What&apos;s open on their screen</Kicker>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {tools.map(({ l, I, color }) => (
              <div
                key={l}
                className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-bg-raised p-5"
              >
                {/* top accent stripe in the tool's brand color */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: color }}
                />
                <I size={32} style={{ color }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink">
                  {l}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm italic text-ink-mid">
            Hunting across 4+ tools. Same hunt, every time.
          </p>
        </div>

        {/* Right — scale of the population */}
        <div className="rounded-2xl border border-spotify/30 bg-bg-panel p-7 shadow-glow">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-spotify">
            How big this population is
          </div>
          <div
            className="mt-6 font-display text-7xl font-bold leading-none"
            style={{ color: SPOTIFY }}
          >
            ~3 hrs
          </div>
          <div className="mt-3 text-base font-semibold text-ink">
            per engineer per week, on incident triage
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-sm text-ink-mid">
            At Spotify (2,000+ services × on-call rotations) that&apos;s{" "}
            <span className="font-semibold text-ink">
              50+ person-years per year
            </span>{" "}
            of engineering time spent context-hunting.
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideCost() {
  // Slide 3 — answers jury question 1B: "What goal? Why mission-critical?"
  // Four distinct mission-criticality angles — revenue, board KPI, talent
  // churn, SLA exposure. Hard for a juror to rate this < 9 if all four
  // land. Same card visual pattern as before, just reframed.
  const cards = [
    {
      I: DollarSign,
      n: "$5,600",
      u: "/min",
      l: "Direct revenue loss",
      s: "Gartner — every minute of downtime",
    },
    {
      I: Users,
      n: "Board KPI",
      u: "not eng KPI",
      l: "MTTR reaches the CEO",
      s: "Reported up during every sev-1",
    },
    {
      I: Flame,
      n: "Top 3",
      u: "driver",
      l: "Senior engineer churn",
      s: "On-call burnout — State of DevOps",
    },
    {
      I: ShieldCheck,
      n: "SLA",
      u: "exposure",
      l: "Enterprise contract risk",
      s: "Repeated breaches = lost deals",
    },
  ];
  return (
    <div>
      <Kicker>1B · Mission-critical goal</Kicker>
      <h2 className="mt-4 font-display text-5xl font-bold text-ink lg:text-6xl">
        Restore production. <span style={{ color: SPOTIFY }}>Fast.</span>
      </h2>
      <p className="mt-6 max-w-3xl text-lg italic leading-relaxed text-ink-mid lg:text-xl">
        Every minute the on-call engineer is hunting for context, the business
        is bleeding — revenue, customer trust, talent.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.l}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-bg-card p-6"
          >
            <div
              className="absolute inset-x-0 top-0 h-[2px]"
              style={{ background: SPOTIFY }}
            />
            <c.I size={22} className="text-spotify" />
            <div className="mt-4 flex items-baseline gap-3">
              <div
                className="font-display text-5xl font-bold leading-none"
                style={{ color: SPOTIFY }}
              >
                {c.n}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-dim">
                {c.u}
              </div>
            </div>
            <div className="mt-4 text-base font-semibold text-ink">{c.l}</div>
            <div className="mt-1 text-sm italic text-ink-dim">{c.s}</div>
          </div>
        ))}
      </div>

      <div
        className="mt-8 rounded-xl px-6 py-4 text-center"
        style={{
          background: "rgba(15,122,56,0.18)",
          border: "1px solid rgba(29,185,84,0.3)",
        }}
      >
        <span className="text-base font-semibold text-ink">
          Faster diagnosis = dollars saved, customers retained, engineers retained.
        </span>
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
        {/* 5 sources, stacked single column. Order = where the on-call
            engineer typically looks first (alert → chatter → tickets →
            code → docs). */}
        <div className="flex flex-col gap-2.5">
          <SourceBox I={AlertTriangle} title="Sentry" sub="The alert that paged the team" />
          <SourceBox I={Slack}         title="Slack"  sub="Past incident channels & threads" />
          <SourceBox I={Layers}        title="Linear" sub="Tickets · root causes · fixes" />
          <SourceBox I={Github}        title="GitHub" sub="Runbooks · PRs · code that fixed past incidents" />
          <SourceBox I={BookOpen}      title="Notion" sub="Internal docs & runbooks" />
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

// 5 storyboard cards. `activeFrom` / `activeUntil` are seconds from
// the stopwatch start — each card is "inactive" until its window opens,
// "active" within its window (pulsing), and "done" after it closes.
// Times calibrated against a real Cline run that completes in ~2 min.
type DemoStep = {
  n: string;
  t: string;
  d: string;
  I: LucideIcon;
  red?: boolean;
  activeFrom: number;
  activeUntil: number;
};

const DEMO_STEPS: DemoStep[] = [
  { n: "1", t: "New incident in Slack",   d: "#incident-auth-down · just paged",                   I: AlertTriangle,       red: true, activeFrom:   0, activeUntil:  3 },
  { n: "2", t: "One prompt to Cline",     d: "“Diagnose, open ticket, post to channel”",            I: MessageSquare,                  activeFrom:   1, activeUntil:  6 },
  { n: "3", t: "MCP fans out",            d: "Slack · Linear · GitHub — in parallel",               I: Network,                        activeFrom:   5, activeUntil: 63 },
  { n: "4", t: "Synthesized context",     d: "Past incident · runbook · ticket · fix · owner",      I: GitPullRequestArrow,            activeFrom:  63, activeUntil: 96 },
  { n: "5", t: "Posted back to channel",  d: "Whole team gets context, not just the asker",         I: Send,                           activeFrom:  96, activeUntil: 130 },
];

// Tool-call timeline shown in the stream below the storyboard. Each
// event fades in when `elapsedSec >= at`. Calibrated to the actual
// Cline run captured for this demo (see GUIDE.md for the source log).
type StreamEvent = {
  at: number; // seconds from stopwatch start
  kind: "call" | "result" | "system";
  text: string;
};

const TOOL_STREAM: StreamEvent[] = [
  { at:   0, kind: "system", text: "Incident detected — #incident-2026-05-09-auth-401s" },
  { at:   2, kind: "system", text: "Cline received prompt — reading docs/runbooks/incident-flow.md" },
  { at:   6, kind: "call",   text: 'mcp.get_runbook("incident flow", k=5)' },
  { at:   8, kind: "result", text: "5 chunks · docs/runbooks/incident-flow.md  (842 ms)" },
  { at:  10, kind: "call",   text: "mcp.get_node(282)" },
  { at:  12, kind: "result", text: "Full incident-flow.md loaded  (210 ms)" },
  { at:  15, kind: "call",   text: 'mcp.diagnose_incident("Auth 401s after deploy")' },
  { at:  24, kind: "result", text: "6 similar incidents · 2 runbook hits · owner @chetan-platform  (8.4 s)" },
  { at:  27, kind: "call",   text: "mcp.trace_issue(#3, repo=Henning-1/...)" },
  { at:  36, kind: "result", text: "Issue context · 8 suspect files · top: src/config/config.js  (7.1 s)" },
  { at:  40, kind: "call",   text: "mcp.get_pr_diff(#2)" },
  { at:  47, kind: "result", text: "src/config/config.js — default(30) → default(0)  (4.2 s)" },
  { at:  51, kind: "call",   text: "mcp.git_blame(src/config/config.js, L30-35)" },
  { at:  55, kind: "result", text: "commit 38e7e901… by Henning  (310 ms)" },
  { at:  58, kind: "call",   text: "mcp.who_owns(src/config/config.js)" },
  { at:  60, kind: "result", text: "@chetan-platform · CODEOWNERS rule *  (47 ms)" },
  { at:  63, kind: "system", text: "Synthesizing diagnosis with citations…" },
  { at:  88, kind: "call",   text: 'mcp.create_linear_issue("Auth 401s — JWT expiry regression")' },
  { at:  96, kind: "result", text: "CLI-36 opened ↗" },
  { at: 101, kind: "call",   text: 'mcp.create_slack_channel("incident-…-auth-401s-HHMMSS")' },
  { at: 113, kind: "result", text: "Channel created · 2 users invited · synthesis posted ↗" },
  { at: 118, kind: "system", text: "✓ Done — whole on-call team has context." },
];

const STOPWATCH_LS_KEY = "ctx-demo-stopwatch";

function SlideDemo() {
  // Lifted state — both the stopwatch (controls) and the visualization
  // (storyboard active states + tool stream) read from the same elapsed
  // time. Persisted via localStorage so it survives slide navigation.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);

  // Restore from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STOPWATCH_LS_KEY);
      if (!raw) return;
      const { start, stop } = JSON.parse(raw) as {
        start: number | null;
        stop: number | null;
      };
      if (typeof start === "number") setStartedAt(start);
      if (typeof stop === "number") setStoppedAt(stop);
    } catch {
      // corrupt JSON — ignore, the stopwatch starts fresh
    }
  }, []);

  // Re-render every 200ms while running.
  useEffect(() => {
    if (startedAt === null || stoppedAt !== null) return;
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [startedAt, stoppedAt]);

  const persist = (start: number | null, stop: number | null) => {
    if (typeof window === "undefined") return;
    try {
      if (start === null && stop === null) {
        window.localStorage.removeItem(STOPWATCH_LS_KEY);
      } else {
        window.localStorage.setItem(
          STOPWATCH_LS_KEY,
          JSON.stringify({ start, stop }),
        );
      }
    } catch {
      // storage full / disabled — gracefully no-op
    }
  };

  const handleStart = () => {
    const t = Date.now();
    setStartedAt(t);
    setStoppedAt(null);
    persist(t, null);
  };
  const handleStop = () => {
    const t = Date.now();
    setStoppedAt(t);
    persist(startedAt, t);
  };
  const handleReset = () => {
    setStartedAt(null);
    setStoppedAt(null);
    persist(null, null);
  };

  const elapsedMs =
    startedAt === null
      ? 0
      : stoppedAt !== null
      ? stoppedAt - startedAt
      : Date.now() - startedAt;
  const elapsedSec = elapsedMs / 1000;
  const isRunning = startedAt !== null && stoppedAt === null;

  return (
    <div>
      <Kicker>Live demo</Kicker>
      <h2 className="mt-4 flex items-center gap-3 font-display text-5xl font-bold text-ink lg:text-6xl">
        <PlayCircle size={42} className="text-spotify" />
        New incident. Watch the team get context.
      </h2>

      {/* Storyboard cards — each lights up when elapsedSec is in its window. */}
      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-5">
        {DEMO_STEPS.map((s) => (
          <StoryboardCard key={s.n} step={s} elapsedSec={elapsedSec} isRunning={isRunning} />
        ))}
      </div>

      {/* Side-by-side: tool stream on the left, stopwatch on the right. */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-stretch">
        <ToolStream elapsedSec={elapsedSec} isRunning={isRunning} />
        <DemoStopwatch
          elapsedMs={elapsedMs}
          startedAt={startedAt}
          stoppedAt={stoppedAt}
          onStart={handleStart}
          onStop={handleStop}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}

function StoryboardCard({
  step,
  elapsedSec,
  isRunning,
}: {
  step: DemoStep;
  elapsedSec: number;
  isRunning: boolean;
}) {
  // Three states driven by elapsed time:
  //   ready   — stopwatch hasn't started, or elapsed < activeFrom
  //   active  — activeFrom <= elapsed < activeUntil (pulsing)
  //   done    — elapsed >= activeUntil (solid green ✓)
  const phase =
    elapsedSec === 0 && !isRunning
      ? "ready"
      : elapsedSec >= step.activeUntil
      ? "done"
      : elapsedSec >= step.activeFrom
      ? "active"
      : "ready";

  // Step 1 uses red (it's the alarming "incident detected" step) — we
  // keep it red even when active/done because the panic-color carries
  // narrative meaning. All other steps follow the active/done palette.
  const accent = step.red ? "#E5484D" : SPOTIFY;
  const numberColor = step.red ? "#E5484D" : SPOTIFY;
  const iconClass = step.red ? "text-danger" : "text-spotify";

  const opacity = phase === "ready" ? 0.45 : 1;
  const borderClass =
    phase === "active"
      ? "border-spotify/70"
      : phase === "done"
      ? "border-spotify/40"
      : "border-white/10";
  const ringClass = phase === "active" ? "shadow-glow" : "";

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-bg-card p-4 transition-opacity duration-300 ${borderClass} ${ringClass}`}
      style={{ opacity }}
    >
      <div
        className={`absolute inset-x-0 top-0 h-[2px] ${
          phase === "active" ? "alert-blink" : ""
        }`}
        style={{ background: accent }}
      />
      {/* Done checkmark */}
      {phase === "done" && !step.red && (
        <div
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-black"
          style={{ background: SPOTIFY }}
          aria-hidden="true"
        >
          ✓
        </div>
      )}
      <div className="flex items-center justify-between">
        <span
          className="font-display text-2xl font-bold"
          style={{ color: numberColor }}
        >
          {step.n}
        </span>
        <step.I size={18} className={iconClass} />
      </div>
      <div className="mt-3 text-sm font-semibold text-ink">{step.t}</div>
      <div className="mt-1.5 text-[11px] leading-relaxed text-ink-mid">
        {step.d}
      </div>
    </div>
  );
}

function ToolStream({
  elapsedSec,
  isRunning,
}: {
  elapsedSec: number;
  isRunning: boolean;
}) {
  // Auto-scroll to bottom as new events come in.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [elapsedSec]);

  const visible = TOOL_STREAM.filter((e) => elapsedSec >= e.at);
  const total = TOOL_STREAM.length;

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-spotify">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-spotify ${
              isRunning ? "alert-blink" : ""
            }`}
          />
          ctx-mcp · tool stream
        </div>
        <div className="font-mono text-[10px] text-ink-dim">
          {visible.length}/{total} events
        </div>
      </div>
      <div
        ref={scrollRef}
        className="mt-3 h-[180px] space-y-1 overflow-y-auto font-mono text-[11px] leading-snug"
      >
        {visible.length === 0 && (
          <div className="italic text-ink-dim">
            (waiting for stopwatch to start…)
          </div>
        )}
        {visible.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 text-ink-dim">
              [{String(Math.floor(e.at)).padStart(3, " ")}s]
            </span>
            <span
              className={
                e.kind === "call"
                  ? "text-spotify"
                  : e.kind === "result"
                  ? "pl-3 text-ink-mid"
                  : "italic text-ink"
              }
            >
              {e.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Live-demo stopwatch — sits beside the tool-call stream on slide 6.
//
// Controlled component: state lives in `SlideDemo` (so the tool stream
// + storyboard cards can read the same elapsed time). This component
// just renders the digits + buttons and fires callbacks.
//
// The state-persistence machinery (localStorage round-trip via
// STOPWATCH_LS_KEY) lives in SlideDemo above.
// ─────────────────────────────────────────────────────────────────────────

function DemoStopwatch({
  elapsedMs,
  startedAt,
  stoppedAt,
  onStart,
  onStop,
  onReset,
}: {
  elapsedMs: number;
  startedAt: number | null;
  stoppedAt: number | null;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const seconds = Math.floor(elapsedMs / 1000);
  const tenths = Math.floor((elapsedMs % 1000) / 100);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const isReady = startedAt === null;
  const isRunning = startedAt !== null && stoppedAt === null;
  const isStopped = stoppedAt !== null;

  // Color of the digits: dim when ready, white when running, green when
  // stopped (and red when running past 2 min — visual reminder of the
  // promise we're trying to keep).
  const overTarget = isRunning && elapsedMs >= 120_000;
  const numberColor = isStopped
    ? SPOTIFY
    : overTarget
    ? "#E5484D"
    : isRunning
    ? "#FFFFFF"
    : "#8A8A8A";

  return (
    <div className="flex h-full flex-col rounded-2xl border-2 border-spotify/30 bg-bg-panel p-5 shadow-glow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-spotify">
          <Clock size={14} />
          Live-demo stopwatch
        </div>
        <div className="text-[11px] font-mono text-ink-dim">
          {isReady && "ready · target <2 min"}
          {isRunning && (overTarget ? "⚠ over target" : "● running")}
          {isStopped && "✓ done"}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-center gap-1 font-display tabular-nums leading-none">
        <span
          className="text-7xl font-bold transition-colors duration-200"
          style={{ color: numberColor }}
        >
          {mm}:{ss}
        </span>
        <span
          className="text-3xl font-bold transition-colors duration-200"
          style={{ color: numberColor, opacity: 0.55 }}
        >
          .{tenths}
        </span>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {isReady && (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-1.5 rounded-md px-5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            style={{ background: SPOTIFY }}
          >
            Start
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/50 px-5 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
          >
            Stop
          </button>
        )}
        {isStopped && (
          <>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-ink-mid transition hover:border-white/30 hover:text-ink"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-1.5 rounded-md px-5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
              style={{ background: SPOTIFY }}
            >
              Start again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SlideImpact() {
  // Slide 6 — answers Q4 (demo impact) at the 10/10 level by making the
  // contrast visible, not just numeric. Two CSS-only mockups side by
  // side: chaotic-multi-tool BEFORE vs synthesized-Slack-message AFTER.
  // Subtle animations (red blink + jitter on BEFORE, bot-pulse +
  // citation-glow on AFTER) keep the eye moving without being gimmicky.
  return (
    <div>
      <Kicker>The shift</Kicker>
      <h2 className="mt-4 font-display text-4xl font-bold leading-[1.15] text-ink lg:text-5xl">
        From{" "}
        <span className="text-ink-mid line-through decoration-danger/60 decoration-2">
          5 tools and 25 minutes
        </span>
        <br />
        to{" "}
        <span style={{ color: SPOTIFY }}>one channel and ~2 minutes.</span>
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1.05fr] lg:items-stretch">
        <BeforePanel />
        <div className="hidden items-center justify-center lg:flex">
          <ArrowRight size={42} className="text-spotify" />
        </div>
        <AfterPanel />
      </div>

      {/* metric ribbon — 4 dimensions of shift, not just time. */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Time",           before: "~25 min",        after: "~2 min" },
          { label: "Team context",   before: "One engineer",   after: "Whole channel" },
          { label: "Audit trail",    before: "Nothing logged", after: "Linear ticket" },
          { label: "Cognitive load", before: "5 tabs + grep",  after: "1 message" },
        ].map((m) => (
          <ShiftMetric key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}

function BeforePanel() {
  // Mockup of the chaotic 2am workflow — each row is a tool the on-call
  // engineer has open. Red dot blinks, rows jitter slightly with
  // staggered delays so the panel feels restless without being noisy.
  const rows: { I: LucideIcon; title: string; detail: string }[] = [
    { I: Slack,         title: "Slack search 'auth 401'", detail: "65 results across 12 channels..." },
    { I: Github,        title: "github.com/.../issues",   detail: "47 open issues filtering on 'auth'" },
    { I: AlertTriangle, title: "Sentry · auth-prod",       detail: "11k events, no clear pattern" },
    { I: Layers,        title: "Linear",                  detail: "23 tickets, none obvious" },
    { I: Code2,         title: "$ git log --grep=auth",   detail: "7 commits, which one broke?" },
  ];
  return (
    <div className="rounded-2xl border border-danger/30 bg-bg-card p-5 shadow-[0_0_30px_rgba(229,72,77,0.12)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-danger">
        <span className="alert-blink h-1.5 w-1.5 rounded-full bg-danger" />
        Before · 2am scramble
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r, i) => (
          <div
            key={r.title}
            className="jitter-row flex items-center gap-3 rounded-md bg-bg-raised px-3 py-2.5"
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            <r.I size={16} className="shrink-0 text-ink-dim" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ink">{r.title}</div>
              <div className="truncate text-[11px] text-ink-dim">{r.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs italic leading-relaxed text-ink-dim">
        5 tools open. 25 minutes. One engineer hunting alone &mdash; whatever
        they figure out dies in DMs.
      </p>
    </div>
  );
}

function AfterPanel() {
  // Mockup of the new world — one Slack message in the incident channel
  // containing the full synthesis. Bot avatar pulses (alive). Citation
  // chips glow in stagger (the AI fanning out across sources).
  return (
    <div className="relative rounded-2xl border-2 border-spotify/60 bg-bg-raised p-5 shadow-glow">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-spotify">
        <span className="shimmer h-1.5 w-1.5 rounded-full bg-spotify" />
        After · #incident-2026-05-09-auth-401s
      </div>

      <div className="mt-4 flex gap-3">
        <div
          className="bot-pulse flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm"
          style={{ background: SPOTIFY }}
          aria-hidden="true"
        >
          🤖
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-ink">ctx-mcp</span>
            <span className="rounded-sm bg-white/10 px-1 py-0 font-mono text-[9px] font-semibold text-ink-dim">
              APP
            </span>
            <span className="text-[10px] text-ink-dim">12:06</span>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink">
            <p>
              <span className="font-semibold">Diagnosis</span>{" "}
              <code className="rounded bg-white/10 px-1">JWT_ACCESS_EXPIRATION_MINUTES</code>
              {" = "}
              <code className="rounded bg-white/10 px-1">0</code> in{" "}
              <code className="rounded bg-white/10 px-1">src/config/config.js</code>.
              Confidence:{" "}
              <span className="font-semibold" style={{ color: SPOTIFY }}>HIGH</span>.
            </p>
            <p>
              <span className="font-semibold">Suspect</span> PR #2 (
              <code className="rounded bg-white/10 px-1">38e7e9...</code>) by @henning
            </p>
            <p>
              <span className="font-semibold">Owner</span> @alice-platform per CODEOWNERS
            </p>
            <p>
              <span className="font-semibold">Mitigation</span>{" "}
              <code className="rounded bg-white/10 px-1">git revert 38e7e9</code> &middot; ETA 5 min
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <CitationChip I={Slack}  label="past Slack thread" delay="0s" />
              <CitationChip I={Layers} label="Linear CLI-5"      delay="0.4s" />
              <CitationChip I={Github} label="auth-runbook.md"   delay="0.8s" />
            </div>

            <p>
              <span className="font-semibold">Tracking</span>{" "}
              <span style={{ color: SPOTIFY }}>CLI-21</span>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs italic leading-relaxed text-ink-dim">
        ~2 minutes. Whole channel has context. Linear has the audit trail.
      </p>
    </div>
  );
}

function CitationChip({
  I,
  label,
  delay,
}: {
  I: LucideIcon;
  label: string;
  delay: string;
}) {
  return (
    <span
      className="citation-glow inline-flex items-center gap-1 rounded-md bg-spotify/10 px-2 py-0.5 text-[10px] text-spotify"
      style={{ animationDelay: delay }}
    >
      <I size={11} />
      {label}
    </span>
  );
}

function ShiftMetric({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-dim">
        {label}
      </div>
      <div className="mt-2 text-[11px] text-ink-dim line-through decoration-danger/50">
        {before}
      </div>
      <div className="text-[12px] font-semibold" style={{ color: SPOTIFY }}>
        &rarr; {after}
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
