"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  MessageSquareQuote,
  Package,
  Shield,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ShipFlowLogo } from "@/components/brand/shipflow-logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth-proxy";
import { cn } from "@/lib/utils";
import {
  DrawLine,
  FadeUp,
  Floating,
  Marquee,
  MovingBorder,
  PulseRing,
  Spotlight,
  StaggerChildren,
  StaggerItem,
  TextReveal,
} from "@/features/landing/components/motion";
import { DemoSlot } from "@/features/landing/components/demo-slot";
import {
  IlluApproval,
  IlluClarify,
  IlluRequirements,
  IlluReview,
  IlluShip,
  IlluTasks,
  IlluUnclearRequest,
} from "@/features/landing/illustrations";

type LandingPageProps = {
  isSignedIn: boolean;
  userName?: string | null;
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
    Illustration: IlluUnclearRequest,
    accent: "from-rose-500/20 to-transparent",
  },
  {
    title: "Reviews pile up while work waits",
    body: "Finished code sits in limbo. Context fades. Standups turn into status meetings about who's blocking whom.",
    Illustration: IlluReview,
    accent: "from-amber-500/20 to-transparent",
  },
  {
    title: "Scope shifts without a paper trail",
    body: "Mid-sprint surprises, old docs, and hallway decisions — junior folks especially get stuck re-asking the same questions.",
    Illustration: IlluClarify,
    accent: "from-orange-500/15 to-transparent",
  },
  {
    title: "Shipping without a final human gate",
    body: "Speed feels great until something slips through. Teams want a deliberate yes before release, not a rushed merge.",
    Illustration: IlluApproval,
    accent: "from-emerald-500/15 to-transparent",
  },
] as const;

const STEPS = [
  {
    label: "Capture the request",
    detail: "Drop in a customer email, ticket, or idea — one place for what to build next.",
    Illustration: IlluUnclearRequest,
  },
  {
    label: "Clarify before you commit",
    detail: "AI asks the questions your team would — so scope is understood before anyone writes code.",
    Illustration: IlluClarify,
  },
  {
    label: "Write requirements together",
    detail: "Turn the idea into a readable plan your team can edit, approve, and refer back to.",
    Illustration: IlluRequirements,
  },
  {
    label: "Break work into tasks",
    detail: "Engineering tasks appear from the approved plan — ready for your board, not buried in chat.",
    Illustration: IlluTasks,
  },
  {
    label: "Review against the plan",
    detail: "When a pull request is linked, AI checks it against your requirements — not just style nits.",
    Illustration: IlluReview,
  },
  {
    label: "Get a human sign-off",
    detail: "A teammate approves the release when findings are resolved — you stay in control.",
    Illustration: IlluApproval,
  },
  {
    label: "Ship with confidence",
    detail: "Approved features move to shipped — with a trail from request to release.",
    Illustration: IlluShip,
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

const HEADER_SCROLL_THRESHOLD_PX = 24;

export function LandingPage({ isSignedIn, userName }: LandingPageProps) {
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

  return (
    <div className="landing-page min-h-screen bg-[var(--landing-bg)] text-[var(--landing-fg)]">
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-amber-900/10 bg-[var(--landing-bg)]/85 backdrop-blur-xl dark:border-amber-500/10"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/">
            <ShipFlowLogo size="sm" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 dark:text-stone-300 md:flex">
            <a href="#demo" className="transition-colors hover:text-amber-700 dark:hover:text-amber-400">
              Demo
            </a>
            <a href="#problems" className="transition-colors hover:text-amber-700 dark:hover:text-amber-400">
              Problems
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-amber-700 dark:hover:text-amber-400">
              How it works
            </a>
            <a href="#faq" className="transition-colors hover:text-amber-700 dark:hover:text-amber-400">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            {isSignedIn ? (
              <Button render={<Link href={dashboardHref} />}>Dashboard</Button>
            ) : (
              <Button render={<Link href={signInHref} />}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-10 pt-[4.25rem] sm:px-6 sm:pb-16 sm:pt-28 lg:pb-24 lg:pt-32">
          <Spotlight className="hidden sm:block" />
          <motion.div
            className="pointer-events-none absolute -right-32 top-20 hidden size-72 rounded-full bg-emerald-500/10 blur-3xl sm:block"
            animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -left-20 bottom-10 hidden size-64 rounded-full bg-orange-500/10 blur-3xl sm:block"
            animate={{ x: [0, 25, 0], y: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-10">
            <div className="space-y-3.5 sm:space-y-5 lg:space-y-7">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/25 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs dark:text-amber-300"
              >
                <Package className="size-3 sm:size-3.5" />
                Idea → plan → review → ship
              </motion.p>

              <h1 className="max-w-xl text-[1.65rem] font-bold leading-[1.1] tracking-tight sm:text-4xl sm:leading-[1.08] lg:text-[3.2rem]">
                <span className="sm:hidden">
                  Stop losing features between idea and ship.
                </span>
                <span className="hidden sm:inline">
                  <TextReveal text="Stop losing features in the gap between idea and ship." />
                </span>
              </h1>

              <FadeUp delay={0.15}>
                <p className="max-w-lg text-[0.9375rem] leading-snug text-stone-600 sm:text-lg sm:leading-relaxed dark:text-stone-300">
                  One calm path from customer request to released feature — clear requirements,
                  planned tasks, review tied to the plan, and a human yes before anything goes out.
                </p>
              </FadeUp>

              {/* Mobile demo — sits high in the fold */}
              <DemoSlot compact className="md:hidden" />

              <FadeUp delay={0.25} className="flex flex-wrap gap-2 sm:gap-3">
                {isSignedIn ? (
                  <Button
                    size="default"
                    className="bg-amber-600 text-white hover:bg-amber-700 sm:h-10 sm:px-6"
                    render={<Link href={dashboardHref} />}
                  >
                    {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Open dashboard"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <Button
                    size="default"
                    className="bg-amber-600 text-white hover:bg-amber-700 sm:h-10 sm:px-6"
                    render={<Link href={signInHref} />}
                  >
                    Start free
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="default"
                  className="border-amber-800/15 bg-transparent sm:h-10 sm:px-6 dark:border-amber-500/20"
                  render={<a href="#how-it-works" />}
                >
                  See how it works
                </Button>
              </FadeUp>

              <FadeUp delay={0.32}>
                <div className="flex flex-col gap-1.5 text-xs text-stone-600 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2 sm:text-sm dark:text-stone-400">
                  {["No credit card to explore", "Works with GitHub", "Humans approve releases"].map(
                    (item) => (
                      <span key={item} className="inline-flex items-center gap-1.5">
                        <Check className="size-3.5 shrink-0 text-emerald-600 sm:size-4" />
                        {item}
                      </span>
                    ),
                  )}
                </div>
              </FadeUp>

              {/* Compact workflow strip — mobile only */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {WORKFLOW.map((step, i) => (
                  <motion.span
                    key={step}
                    animate={{
                      scale: activeStep === i ? 1.04 : 1,
                      backgroundColor:
                        activeStep === i
                          ? "rgba(245, 158, 11, 0.22)"
                          : "rgba(245, 158, 11, 0.08)",
                    }}
                    transition={{ duration: 0.35 }}
                    className="shrink-0 rounded-full border border-amber-600/20 px-2.5 py-1 text-[11px] font-medium text-amber-900 dark:text-amber-200"
                  >
                    {step}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="hidden flex-col gap-5 md:flex lg:gap-6">
              <DemoSlot />

              <FadeUp delay={0.15} className="relative">
                <MovingBorder>
                  <div className="p-5 lg:p-6">
                    <p className="mb-3 text-sm font-medium text-stone-500 dark:text-stone-400">
                      The delivery loop
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WORKFLOW.map((step, i) => (
                        <motion.span
                          key={step}
                          animate={{
                            scale: activeStep === i ? 1.05 : 1,
                            backgroundColor:
                              activeStep === i
                                ? "rgba(245, 158, 11, 0.22)"
                                : "rgba(245, 158, 11, 0.08)",
                          }}
                          transition={{ duration: 0.35 }}
                          className="rounded-full border border-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-900 sm:px-3 sm:py-1.5 sm:text-sm dark:text-amber-200"
                        >
                          {step}
                        </motion.span>
                      ))}
                    </div>
                    <div className="mt-5 grid h-32 place-items-center sm:h-36">
                      <Floating duration={6} y={8}>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.95, rotate: 4 }}
                            transition={{ duration: 0.4 }}
                            className="h-28 w-36 sm:h-32 sm:w-44"
                          >
                            {(() => {
                              const StepIllu = STEPS[Math.min(activeStep, STEPS.length - 1)]!.Illustration;
                              return <StepIllu />;
                            })()}
                          </motion.div>
                        </AnimatePresence>
                      </Floating>
                    </div>
                    <DrawLine className="mt-3 w-full" />
                    <p className="mt-3 text-center text-xs text-stone-600 sm:text-sm dark:text-stone-400">
                      Step {activeStep + 1} of {WORKFLOW.length}:{" "}
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {STEPS[Math.min(activeStep, STEPS.length - 1)]?.label}
                      </span>
                    </p>
                  </div>
                </MovingBorder>
                <div className="absolute -right-2 -top-2 sm:-right-3 sm:-top-3">
                  <span className="relative flex size-9 items-center justify-center sm:size-10">
                    <PulseRing />
                    <span className="relative flex size-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg sm:size-10">
                      <Shield className="size-3.5 sm:size-4" />
                    </span>
                  </span>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* Pain quotes marquee */}
        <section className="border-y border-amber-900/8 py-6 dark:border-amber-500/10">
          <Marquee className="py-1" speed={32}>
            <div className="flex gap-4">
              {PAIN_QUOTES.map((quote) => (
                <span
                  key={quote}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-800/10 bg-[var(--landing-card)] px-4 py-2 text-sm text-stone-600 dark:border-amber-500/15 dark:text-stone-300"
                >
                  <MessageSquareQuote className="size-4 shrink-0 text-rose-500" />
                  {quote}
                </span>
              ))}
            </div>
          </Marquee>
        </section>

        {/* Problems */}
        <section id="problems" className="px-5 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Sound familiar?
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                The problems teams actually talk about
              </h2>
              <p className="mt-4 text-stone-600 dark:text-stone-300">
                Not invented for a pitch deck — these are the friction points that show up in
                standups, retros, and late-night threads when delivery slows down.
              </p>
            </FadeUp>

            <StaggerChildren className="mt-14 grid gap-6 sm:grid-cols-2" stagger={0.1}>
              {PROBLEMS.map((problem) => (
                <StaggerItem key={problem.title}>
                  <motion.article
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-amber-900/10 bg-[var(--landing-card)] p-6 dark:border-amber-500/10",
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                        problem.accent,
                      )}
                    />
                    <div className="relative grid gap-4 sm:grid-cols-[1fr_120px] sm:items-center">
                      <div>
                        <h3 className="text-lg font-semibold">{problem.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                          {problem.body}
                        </p>
                      </div>
                      <div className="h-24 sm:h-28">
                        <problem.Illustration />
                      </div>
                    </div>
                  </motion.article>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-[var(--landing-muted)] px-5 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <FadeUp className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                How ShipFlow helps
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Seven steps. One thread. Nothing falls through.
              </h2>
            </FadeUp>

            <div className="mt-14 space-y-6">
              {STEPS.map((step, i) => (
                <FadeUp key={step.label} delay={i * 0.04}>
                  <div className="grid gap-6 rounded-2xl border border-amber-900/8 bg-[var(--landing-card)] p-5 sm:grid-cols-[64px_1fr_140px] sm:items-center dark:border-amber-500/10">
                    <motion.div
                      whileInView={{ scale: [0.8, 1] }}
                      viewport={{ once: true }}
                      className="flex size-12 items-center justify-center rounded-xl bg-amber-500/15 text-lg font-bold text-amber-800 dark:text-amber-300"
                    >
                      {i + 1}
                    </motion.div>
                    <div>
                      <h3 className="font-semibold">{step.label}</h3>
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{step.detail}</p>
                    </div>
                    <div className="hidden h-24 sm:block">
                      <step.Illustration />
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* Bento features */}
        <section className="px-5 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <FadeUp className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for teams who ship, not slide decks
              </h2>
            </FadeUp>

            <StaggerChildren className="mt-12 grid gap-4 md:grid-cols-3" stagger={0.08}>
              <StaggerItem className="md:col-span-2">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="h-full rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-500/10 to-transparent p-8 dark:border-amber-500/10"
                >
                  <Users className="size-8 text-amber-700 dark:text-amber-400" />
                  <h3 className="mt-4 text-xl font-semibold">Shared workspaces</h3>
                  <p className="mt-2 max-w-lg text-stone-600 dark:text-stone-300">
                    Everyone sees the same feature requests, requirements, and status — no more
                    hunting through threads for what was decided.
                  </p>
                  <div className="mt-6 h-32 max-w-md">
                    <IlluRequirements />
                  </div>
                </motion.div>
              </StaggerItem>
              <StaggerItem>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex h-full flex-col rounded-2xl border border-emerald-800/15 bg-emerald-500/8 p-6 dark:border-emerald-500/20"
                >
                  <Shield className="size-7 text-emerald-700 dark:text-emerald-400" />
                  <h3 className="mt-3 font-semibold">Human release gate</h3>
                  <p className="mt-2 flex-1 text-sm text-stone-600 dark:text-stone-300">
                    AI assists — people approve. Nothing ships without a deliberate sign-off.
                  </p>
                  <div className="mt-4 h-20">
                    <IlluApproval />
                  </div>
                </motion.div>
              </StaggerItem>
              <StaggerItem>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex h-full flex-col rounded-2xl border border-amber-900/10 bg-[var(--landing-card)] p-6"
                >
                  <h3 className="font-semibold">Plan-linked review</h3>
                  <p className="mt-2 flex-1 text-sm text-stone-600 dark:text-stone-300">
                    Reviews reference your approved requirements — so feedback is about fit, not
                    random opinions.
                  </p>
                  <div className="mt-4 h-20">
                    <IlluReview />
                  </div>
                </motion.div>
              </StaggerItem>
              <StaggerItem className="md:col-span-2">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="grid gap-6 rounded-2xl border border-amber-900/10 bg-[var(--landing-card)] p-8 sm:grid-cols-2 dark:border-amber-500/10"
                >
                  <div>
                    <h3 className="text-xl font-semibold">From tasks to shipped</h3>
                    <p className="mt-2 text-stone-600 dark:text-stone-300">
                      Track work on a board, link pull requests, fix findings, and mark features
                      shipped when they are actually done.
                    </p>
                  </div>
                  <div className="h-28">
                    <IlluShip />
                  </div>
                </motion.div>
              </StaggerItem>
            </StaggerChildren>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-8 sm:px-6">
          <FadeUp>
            <MovingBorder className="mx-auto max-w-4xl">
              <div className="px-6 py-12 text-center sm:px-12">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Ready to close the gap between idea and ship?
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-600 dark:text-stone-300">
                  Sign in, create a workspace, and walk one real feature through the loop. No
                  promises we cannot keep — just a clearer path your team can feel.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button size="lg" className="bg-amber-600 text-white hover:bg-amber-700" render={<Link href={isSignedIn ? dashboardHref : signInHref} />}>
                    {isSignedIn ? "Go to dashboard" : "Get started"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    render={
                      <Link
                        href="https://github.com/Ayush-Panda-design/AI-powered-Code-review"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    View source
                  </Button>
                </div>
              </div>
            </MovingBorder>
          </FadeUp>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-5 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <FadeUp className="text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">Questions</h2>
            </FadeUp>
            <FadeUp delay={0.1} className="mt-8">
              <Accordion className="w-full">
                {FAQ.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-base hover:text-amber-700 dark:hover:text-amber-400">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-stone-600 dark:text-stone-300">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeUp>
          </div>
        </section>
      </main>

      <footer className="border-t border-amber-900/10 px-5 py-10 dark:border-amber-500/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <ShipFlowLogo size="sm" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            ShipFlow AI — ChaiCode Hackathon
          </p>
          <div className="flex gap-4 text-sm">
            <Link href="/tech-stack" className="text-stone-600 hover:text-amber-700 dark:text-stone-300 dark:hover:text-amber-400">
              For judges: tech stack
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
