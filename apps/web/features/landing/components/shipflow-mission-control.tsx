"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

const PIPELINE_NODES = [
  { id: "request", label: "REQ", angle: -90 },
  { id: "requirements", label: "SPEC", angle: -38 },
  { id: "tasks", label: "TASK", angle: 14 },
  { id: "code", label: "CODE", angle: 66 },
  { id: "review", label: "REV", angle: 118 },
  { id: "approval", label: "OK", angle: 170 },
  { id: "ship", label: "SHIP", angle: 222 },
] as const;

const LOG_LINES = [
  { step: 0, text: "INTAKE  customer ticket #1842 received" },
  { step: 1, text: "CLARIFY  scope questions generated — 3 replies" },
  { step: 2, text: "SPEC     requirements doc drafted — awaiting edit" },
  { step: 3, text: "PLAN     12 engineering tasks created from spec" },
  { step: 4, text: "BUILD    PR #247 opened — auth middleware" },
  { step: 5, text: "REVIEW   AI check vs requirements — 2 findings" },
  { step: 6, text: "SHIP     approved, merged, marked shipped ✓" },
] as const;

const REVIEW_SNIPPETS = [
  { severity: "blocking", text: "Missing validation on /api/intake route" },
  { severity: "ok", text: "Requirements alignment: checkout flow covered" },
  { severity: "warn", text: "Task #7 not referenced in diff — verify scope" },
] as const;

type ShipflowMissionControlProps = {
  activeStep: number;
  className?: string;
};

function polarToXY(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

export function ShipflowMissionControl({ activeStep, className }: ShipflowMissionControlProps) {
  const [reviewIndex, setReviewIndex] = useState(0);

  const cx = 50;
  const cy = 48;
  const radius = 34;

  useEffect(() => {
    const id = window.setInterval(() => {
      setReviewIndex((i) => (i + 1) % REVIEW_SNIPPETS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const activeNode = PIPELINE_NODES[Math.min(activeStep, PIPELINE_NODES.length - 1)]!;
  const activePos = polarToXY(activeNode.angle, radius, cx, cy);

  return (
    <div
      className={cn(
        "relative h-full min-h-[280px] w-full overflow-hidden bg-black font-mono text-[10px] sm:min-h-[360px] sm:text-[11px]",
        className,
      )}
    >
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
        }}
        aria-hidden
      />

      {/* Radar sweep */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[42%] h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(239,68,68,0.35) 40deg, transparent 80deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        aria-hidden
      />

      {/* HUD corners */}
      <div className="absolute left-3 top-3 text-white/30" aria-hidden>
        SF-MC v1.0
      </div>
      <div className="absolute right-3 top-3 text-right text-white/30" aria-hidden>
        LIVE
        <span className="ml-1 inline-block size-1.5 animate-pulse bg-red-500" />
      </div>

      {/* Pipeline SVG */}
      <svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 top-[38%] h-[55%] w-[min(100%,420px)] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" strokeDasharray="1 2" />

        {PIPELINE_NODES.map((node, i) => {
          const pos = polarToXY(node.angle, radius, cx, cy);
          const next = PIPELINE_NODES[(i + 1) % PIPELINE_NODES.length]!;
          const nextPos = polarToXY(next.angle, radius, cx, cy);
          const isActive = i === activeStep;
          const isPast = i < activeStep;

          return (
            <g key={node.id}>
              <line
                x1={pos.x}
                y1={pos.y}
                x2={nextPos.x}
                y2={nextPos.y}
                stroke={isPast ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.1)"}
                strokeWidth="0.25"
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isActive ? 2.8 : 2}
                fill={isActive ? "#ef4444" : isPast ? "#22c55e" : "rgba(255,255,255,0.2)"}
              />
              <text
                x={pos.x}
                y={pos.y - 3.5}
                textAnchor="middle"
                fill={isActive ? "#fff" : "rgba(255,255,255,0.45)"}
                fontSize="2.8"
                fontFamily="monospace"
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* Traveling packet */}
        <motion.circle
          key={activeStep}
          r="1.2"
          fill="#fbbf24"
          initial={{ cx: activePos.x, cy: activePos.y, opacity: 1 }}
          animate={{
            cx: [activePos.x, cx, activePos.x],
            cy: [activePos.y, cy, activePos.y],
            opacity: [1, 0.6, 1],
          }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      </svg>

      {/* Center hub */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], borderColor: ["rgba(239,68,68,0.5)", "rgba(239,68,68,1)", "rgba(239,68,68,0.5)"] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto flex size-14 items-center justify-center border border-red-500/60 bg-red-500/10 sm:size-16"
        >
          <span className="text-[9px] uppercase tracking-widest text-red-400 sm:text-[10px]">Flow</span>
        </motion.div>
      </div>

      {/* Terminal log — bottom left */}
      <div className="absolute bottom-20 left-3 right-3 sm:bottom-24 sm:left-4 sm:right-auto sm:w-[58%]">
        <div className="border border-white/15 bg-black/80 p-2 backdrop-blur-sm sm:p-3">
          <p className="mb-1.5 text-[9px] uppercase tracking-[0.25em] text-white/35">Event stream</p>
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {LOG_LINES.slice(Math.max(0, activeStep - 2), activeStep + 2).map((line) => (
                <motion.p
                  key={`${line.step}-${line.text}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: line.step === activeStep ? 1 : 0.45, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "truncate text-[10px] sm:text-[11px]",
                    line.step === activeStep ? "text-green-400" : "text-white/40",
                  )}
                >
                  <span className="text-red-500/80">&gt;</span> {line.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* AI review card — top right */}
      <div className="absolute right-3 top-12 w-[44%] max-w-[200px] sm:right-4 sm:top-14 sm:w-[42%]">
        <AnimatePresence mode="wait">
          <motion.div
            key={reviewIndex}
            initial={{ opacity: 0, y: 12, rotate: 1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -8, rotate: -1 }}
            transition={{ duration: 0.35 }}
            className="border border-white/20 bg-black/90 p-2.5 shadow-[0_0_24px_rgba(239,68,68,0.15)] sm:p-3"
          >
            <p className="text-[9px] uppercase tracking-wider text-white/40">AI review</p>
            <p
              className={cn(
                "mt-1 text-[10px] leading-snug sm:text-[11px]",
                REVIEW_SNIPPETS[reviewIndex]!.severity === "blocking"
                  ? "text-red-400"
                  : REVIEW_SNIPPETS[reviewIndex]!.severity === "ok"
                    ? "text-green-400"
                    : "text-yellow-400",
              )}
            >
              {REVIEW_SNIPPETS[reviewIndex]!.text}
            </p>
            <div className="mt-2 flex gap-2 text-[9px] text-white/30">
              <span>PR #247</span>
              <span>·</span>
              <span>vs spec</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Metrics strip */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 border-t border-white/10 pt-3 sm:bottom-4 sm:left-4 sm:right-4">
        {[
          { label: "IN REVIEW", value: "3", color: "text-yellow-400" },
          { label: "AWAITING OK", value: "1", color: "text-red-400" },
          { label: "SHIPPED", value: "12", color: "text-green-400" },
        ].map((m) => (
          <div key={m.label} className="flex-1 border border-white/10 px-2 py-1.5 min-w-[80px]">
            <p className="text-[8px] tracking-widest text-white/35">{m.label}</p>
            <p className={cn("text-sm font-medium tabular-nums", m.color)}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Glitch flash on step change */}
      <motion.div
        key={`flash-${activeStep}`}
        className="pointer-events-none absolute inset-0 bg-white"
        initial={{ opacity: 0.12 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        aria-hidden
      />
    </div>
  );
}
