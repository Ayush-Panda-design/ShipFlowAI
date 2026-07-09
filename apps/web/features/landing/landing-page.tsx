"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth-proxy";
import { cn } from "@/lib/utils";
import { ShipflowMissionControl } from "@/features/landing/components/shipflow-mission-control";
import { FadeUp, Marquee, StaggerChildren, StaggerItem } from "@/features/landing/components/motion";
import {
  Bracket,
  CornerMarks,
  PixelHeading,
  SectionLabel,
  TerminalFrame,
  TerminalGrid,
  TerminalLink,
  WorkflowBars,
} from "@/features/landing/components/terminal-ui";

type LandingPageProps = {
  isSignedIn: boolean;
};

const WORKFLOW = [
  "Request",
  "Requirements",
  "Tasks",
  "Code",
  "Review",
  "Approval",
  "Ship",
] as const;

const PAIN_QUOTES = [
  "Our standup blocker is always waiting for review.",
  "Requirements changed mid-sprint — again — and nothing was written down.",
  "We shipped fast but built the wrong thing.",
  "One senior engineer reviews 80% of our pull requests.",
  "Pull requests sit open for days before anyone looks.",
  "We made one huge change to avoid another review round.",
  "Nobody agreed what done actually means.",
  "Code is moving faster than our team can verify it.",
] as const;

const PROBLEMS = [
  {
    title: "Vague ideas become vague builds",
    body: "Teams lose weeks when a customer ask never turns into a clear, shared plan everyone can follow.",
  },
  {
    title: "Reviews pile up while work waits",
    body: "Finished code sits in limbo. Context fades. Standups turn into status meetings about who's blocking whom.",
  },
  {
    title: "Scope shifts without a paper trail",
    body: "Mid-sprint surprises, old docs, and hallway decisions — junior folks especially get stuck re-asking the same questions.",
  },
  {
    title: "Shipping without a final human gate",
    body: "Speed feels great until something slips through. Teams want a deliberate yes before release, not a rushed merge.",
  },
] as const;

const STEPS = [
  {
    label: "Capture the request",
    detail: "Drop in a customer email, ticket, or idea — one place for what to build next.",
  },
  {
    label: "Clarify before you commit",
    detail: "AI asks the questions your team would — so scope is understood before anyone writes code.",
  },
  {
    label: "Write requirements together",
    detail: "Turn the idea into a readable plan your team can edit, approve, and refer back to.",
  },
  {
    label: "Break work into tasks",
    detail: "Engineering tasks appear from the approved plan — ready for your board, not buried in chat.",
  },
  {
    label: "Review against the plan",
    detail: "When a pull request is linked, AI checks it against your requirements — not just style nits.",
  },
  {
    label: "Get a human sign-off",
    detail: "A teammate approves the release when findings are resolved — you stay in control.",
  },
  {
    label: "Ship with confidence",
    detail: "Approved features move to shipped — with a trail from request to release.",
  },
] as const;

const FAQ = [
  {
    q: "Is this replacing our developers?",
    a: "No. ShipFlow helps your team clarify ideas, document decisions, get a first pass on reviews, and record approvals. Your people still write, review, and ship the code.",
  },
  {
    q: "Do we have to use AI for everything?",
    a: "No. You can clarify manually, edit requirements yourself, code in your own IDE, and skip optional AI drafts. The loop works with or without automation on each step.",
  },
  {
    q: "What if we already use GitHub?",
    a: "That's the point. Connect your repos, sync pull requests, and run reviews tied to the feature you're building — without leaving your existing workflow.",
  },
  {
    q: "How is this different from a generic AI code reviewer?",
    a: "Generic reviewers judge code in isolation. ShipFlow ties review to the requirements and tasks you approved for that feature — so feedback is about whether you're building the right thing.",
  },
  {
    q: "Can small teams use it?",
    a: "Yes. Workspaces, plans, and credits are built for teams that want structure without enterprise overhead.",
  },
] as const;

const BENTO = [
  {
    title: "Shared workspaces",
    body: "Everyone sees the same feature requests, requirements, and status — no more hunting through threads for what was decided.",
    span: "md:col-span-2",
  },
  {
    title: "Human release gate",
    body: "AI assists — people approve. Nothing ships without a deliberate sign-off.",
    span: "",
  },
  {
    title: "Plan-linked review",
    body: "Reviews reference your approved requirements — so feedback is about fit, not random opinions.",
    span: "",
  },
  {
    title: "From tasks to shipped",
    body: "Track work on a board, link pull requests, fix findings, and mark features shipped when they are actually done.",
    span: "md:col-span-2",
  },
] as const;

const HEADER_SCROLL_THRESHOLD_PX = 24;

function TerminalLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span className="font-[family-name:var(--font-display-landing)] text-xl uppercase tracking-widest text-white sm:text-2xl">
        ShipFlow
      </span>
      <span className="flex gap-1">
        <span className="size-2 border border-white/50 bg-white" />
        <span className="size-2 border border-white/50 bg-transparent" />
        <span className="size-2 border border-red-500 bg-red-500" />
      </span>
    </Link>
  );
}

export function LandingPage({ isSignedIn }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > HEADER_SCROLL_THRESHOLD_PX,
  );
  const [activeStep, setActiveStep] = useState(0);
  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(DEFAULT_POST_AUTH_PATH)}`;
  const dashboardHref = DEFAULT_POST_AUTH_PATH;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > HEADER_SCROLL_THRESHOLD_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((s) => (s + 1) % WORKFLOW.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const primaryHref = isSignedIn ? dashboardHref : signInHref;
  const primaryLabel = isSignedIn ? "Go to dashboard" : "Get started";
  const headerAuthLabel = isSignedIn ? "Go to dashboard" : "Sign in";

  return (
    <div className="landing-page landing-terminal min-h-screen bg-black font-[family-name:var(--font-mono-landing)] text-white">
      <TerminalGrid />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-transparent transition-colors duration-300",
          scrolled && "border-white/15 bg-black/90 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <TerminalLogo />
          <nav className="hidden items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-white/50 md:flex">
            {[
              ["#problems", "Problems"],
              ["#how-it-works", "How it works"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="transition-colors hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <TerminalLink href={primaryHref} variant="ghost" className="px-4 py-2 text-[10px] sm:text-xs">
            {headerAuthLabel}
          </TerminalLink>
        </div>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="relative px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:pb-24 lg:pt-28">
          <div className="mx-auto max-w-7xl">
            <TerminalFrame className="min-h-[min(88vh,920px)]">
              <CornerMarks />
              <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:min-h-[min(88vh,920px)]">
                {/* Left column */}
                <div className="flex flex-col justify-between border-b border-white/15 p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
                  <div className="space-y-5 sm:space-y-7">
                    <Bracket>Idea → plan → review → ship</Bracket>

                    <PixelHeading as="h1" className="max-w-xl text-[2rem] sm:text-5xl lg:text-[3.4rem]">
                      Stop losing features in the gap between idea and ship
                      <span className="ml-2 inline-block size-2.5 bg-red-500 align-middle" aria-hidden />
                    </PixelHeading>

                    <p className="max-w-md text-xs leading-relaxed text-white/55 sm:text-sm">
                      One calm path from customer request to released feature — clear requirements,
                      planned tasks, review tied to the plan, and a human yes before anything goes out.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link href={primaryHref} className="inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90 sm:text-sm">
                        {primaryLabel}
                        <ArrowRight className="size-4" />
                      </Link>
                      <TerminalLink href="#how-it-works" variant="ghost">
                        See how it works
                      </TerminalLink>
                    </div>

                    <ul className="space-y-1.5 text-[11px] text-white/45 sm:text-xs">
                      {["No credit card to explore", "Works with GitHub", "Humans approve releases"].map((item) => (
                        <li key={item}>
                          <Bracket>{item}</Bracket>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-10 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {[
                        `Loop: ${WORKFLOW.length} steps`,
                        `Active: ${WORKFLOW[activeStep]}`,
                        "Mode: delivery",
                      ].map((stat) => (
                        <Bracket key={stat}>{stat}</Bracket>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {WORKFLOW.map((step, i) => (
                        <motion.span
                          key={step}
                          animate={{ opacity: activeStep === i ? 1 : 0.4 }}
                          className={cn(
                            "border px-2 py-0.5 text-[10px] uppercase tracking-wider sm:text-[11px]",
                            activeStep === i
                              ? "border-red-500/80 bg-red-500/10 text-white"
                              : "border-white/15 text-white/45",
                          )}
                        >
                          {step}
                        </motion.span>
                      ))}
                    </div>

                    <WorkflowBars activeIndex={activeStep} />
                  </div>
                </div>

                {/* Right column — live delivery mission control */}
                <div className="relative flex min-h-[320px] flex-col lg:min-h-0">
                  <ShipflowMissionControl
                    activeStep={activeStep}
                    className="min-h-[300px] flex-1 lg:min-h-[420px]"
                  />
                </div>
              </div>
            </TerminalFrame>
          </div>
        </section>

        {/* Pain quotes */}
        <section className="border-y border-white/10 py-5">
          <Marquee className="py-1" speed={36}>
            <div className="flex gap-3">
              {PAIN_QUOTES.map((quote) => (
                <span
                  key={quote}
                  className="inline-flex shrink-0 items-center gap-2 border border-white/15 bg-black px-4 py-2 text-[11px] text-white/55 sm:text-xs"
                >
                  <span className="text-red-500">›</span>
                  {quote}
                </span>
              ))}
            </div>
          </Marquee>
        </section>

        {/* Problems */}
        <section id="problems" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <FadeUp className="max-w-2xl">
              <SectionLabel>Sound familiar?</SectionLabel>
              <PixelHeading className="mt-3 text-3xl sm:text-4xl">
                The problems teams actually talk about
              </PixelHeading>
              <p className="mt-4 text-xs leading-relaxed text-white/50 sm:text-sm">
                Not invented for a pitch deck — these are the friction points that show up in
                standups, retros, and late-night threads when delivery slows down.
              </p>
            </FadeUp>

            <StaggerChildren className="mt-12 grid gap-4 sm:grid-cols-2" stagger={0.08}>
              {PROBLEMS.map((problem, i) => (
                <StaggerItem key={problem.title}>
                  <TerminalFrame className="p-5 sm:p-6">
                    <Bracket>Issue {String(i + 1).padStart(2, "0")}</Bracket>
                    <h3 className="mt-3 text-sm font-medium uppercase tracking-wide text-white sm:text-base">
                      {problem.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">{problem.body}</p>
                  </TerminalFrame>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-white/10 bg-[#050505] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <FadeUp className="max-w-2xl">
              <SectionLabel>How ShipFlow helps</SectionLabel>
              <PixelHeading className="mt-3 text-3xl sm:text-4xl">
                Seven steps. One thread. Nothing falls through.
              </PixelHeading>
            </FadeUp>

            <div className="mt-12 space-y-3">
              {STEPS.map((step, i) => (
                <FadeUp key={step.label} delay={i * 0.03}>
                  <div className="grid gap-4 border border-white/15 bg-black p-4 sm:grid-cols-[72px_1fr] sm:items-start sm:p-5">
                    <div className="flex size-12 items-center justify-center border border-white/20 text-lg text-red-400">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="text-sm uppercase tracking-wide text-white">{step.label}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/50 sm:text-sm">{step.detail}</p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* Bento */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <FadeUp>
              <PixelHeading className="text-center text-3xl sm:text-4xl">
                Built for teams who ship, not slide decks
              </PixelHeading>
            </FadeUp>

            <StaggerChildren className="mt-12 grid gap-4 md:grid-cols-3" stagger={0.06}>
              {BENTO.map((item) => (
                <StaggerItem key={item.title} className={item.span}>
                  <TerminalFrame className="h-full p-6">
                    <h3 className="text-sm uppercase tracking-wide text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">{item.body}</p>
                  </TerminalFrame>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-8 sm:px-6">
          <FadeUp>
            <TerminalFrame className="mx-auto max-w-4xl p-8 text-center sm:p-12">
              <PixelHeading className="text-2xl sm:text-3xl">
                Ready to close the gap between idea and ship?
              </PixelHeading>
              <p className="mx-auto mt-4 max-w-lg text-xs text-white/50 sm:text-sm">
                Sign in, create a workspace, and walk one real feature through the loop. No
                promises we cannot keep — just a clearer path your team can feel.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href={primaryHref} className="inline-flex items-center gap-2 bg-white px-6 py-3 text-xs uppercase tracking-[0.18em] text-black hover:bg-white/90 sm:text-sm">
                  {isSignedIn ? "Go to dashboard" : "Get started"}
                  <ArrowRight className="size-4" />
                </Link>
                <TerminalLink
                  href="https://github.com/Ayush-Panda-design/ShipFlowAI"
                  variant="ghost"
                  className="px-6 py-3"
                >
                  View source
                </TerminalLink>
              </div>
            </TerminalFrame>
          </FadeUp>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-4 py-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-2xl">
            <FadeUp className="text-center">
              <PixelHeading className="text-2xl sm:text-3xl">Questions</PixelHeading>
            </FadeUp>
            <FadeUp delay={0.08} className="mt-8">
              <Accordion className="w-full border-white/20 bg-black text-white [&_[data-slot=accordion-item]]:border-white/15">
                {FAQ.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-xs uppercase tracking-wide hover:text-red-400 sm:text-sm">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs leading-relaxed text-white/50 sm:text-sm">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeUp>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <TerminalLogo />
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
            ShipFlow AI © 2026. All rights reserved.
          </p>
          <Link
            href="/tech-stack"
            className="text-[10px] uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white"
          >
            For judges: tech stack
          </Link>
        </div>
      </footer>
    </div>
  );
}
