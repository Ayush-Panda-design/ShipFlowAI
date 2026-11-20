import { ill, STROKE } from "./palette";

const stroke = {
  stroke: ill.ink,
  strokeWidth: STROKE,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Frame({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function Sparkle({ x, y, r = 5, delay = "0s" }: { x: number; y: number; r?: number; delay?: string }) {
  return (
    <path
      d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`}
      fill={ill.amber}
      className="sf-twinkle"
      style={{ animationDelay: delay }}
    />
  );
}

/** Developer workspace with a floating code-review card. */
export function EmptyPullRequestsIllustration({ className }: { className?: string }) {
  return (
    <Frame label="A developer workspace with a floating code review card" className={className}>
      <ellipse cx="120" cy="140" rx="96" ry="10" fill={ill.cream} />
      <circle cx="120" cy="78" r="58" fill={ill.rose} />
      {/* monitor */}
      <rect x="62" y="64" width="116" height="68" rx="9" fill={ill.card} {...stroke} />
      <rect x="62" y="64" width="116" height="14" rx="9" fill={ill.peachSoft} />
      <rect x="62" y="71" width="116" height="7" fill={ill.peachSoft} />
      <path d="M62 78 H178" {...stroke} />
      <circle cx="73" cy="71" r="2.4" fill={ill.burgundy} />
      <circle cx="82" cy="71" r="2.4" fill={ill.amber} />
      <circle cx="91" cy="71" r="2.4" fill={ill.green} />
      <rect x="72" y="88" width="30" height="5" rx="2.5" fill={ill.blue} />
      <rect x="106" y="88" width="40" height="5" rx="2.5" fill={ill.line} />
      <rect x="82" y="99" width="46" height="5" rx="2.5" fill={ill.burgundy} />
      <rect x="132" y="99" width="22" height="5" rx="2.5" fill={ill.line} />
      <rect x="82" y="110" width="34" height="5" rx="2.5" fill={ill.green} />
      <rect x="72" y="121" width="52" height="5" rx="2.5" fill={ill.line} />
      <path d="M102 132 L98 142 H142 L138 132" fill={ill.card} {...stroke} />
      {/* desk plant */}
      <path d="M200 140 q-2 -16 -8 -22 M200 140 q2 -20 10 -26 M200 140 q-6 -10 -16 -10" fill="none" stroke={ill.green} strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M192 140 h16 l-2 -8 h-12z" fill={ill.amber} {...stroke} />
      {/* floating review card */}
      <g className="sf-float">
        <rect x="136" y="26" width="84" height="50" rx="10" fill={ill.card} {...stroke} />
        <circle cx="152" cy="42" r="8" fill={ill.burgundy} />
        <path d="M148 42.3 l3 3 l5.4-6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="166" y="37" width="40" height="5.5" rx="2.7" fill={ill.ink} opacity="0.75" />
        <rect x="166" y="47" width="26" height="5" rx="2.5" fill={ill.line} />
        <rect x="146" y="60" width="64" height="5" rx="2.5" fill={ill.blueSoft} />
        <rect x="146" y="60" width="38" height="5" rx="2.5" fill={ill.blue} />
      </g>
      <Sparkle x={28} y={52} />
      <Sparkle x={118} y={22} r={4} delay="1s" />
    </Frame>
  );
}

/** A document being analysed by AI with a completed checkmark. */
export function EmptyReviewsIllustration({ className }: { className?: string }) {
  return (
    <Frame label="A document being analysed by AI with a completed checkmark" className={className}>
      <ellipse cx="120" cy="142" rx="88" ry="9" fill={ill.cream} />
      <circle cx="120" cy="78" r="58" fill={ill.rose} />
      {/* document */}
      <g transform="rotate(-5 110 80)">
        <rect x="68" y="30" width="86" height="106" rx="10" fill={ill.card} {...stroke} />
        <rect x="80" y="44" width="36" height="6" rx="3" fill={ill.ink} opacity="0.8" />
        {[58, 70, 82, 94, 106].map((y, i) => (
          <rect key={y} x="80" y={y} width={[62, 50, 58, 40, 54][i]} height="5" rx="2.5" fill={ill.line} />
        ))}
        {/* highlighted lines under analysis */}
        <rect x="76" y="66" width="70" height="12" rx="4" fill={ill.amber} opacity="0.28" />
        <rect x="76" y="90" width="52" height="12" rx="4" fill={ill.blue} opacity="0.2" />
      </g>
      {/* magnifier / AI lens */}
      <g className="sf-drift">
        <circle cx="156" cy="96" r="22" fill={ill.card} fillOpacity="0.85" {...stroke} />
        <circle cx="156" cy="96" r="14" fill={ill.blueSoft} opacity="0.8" />
        <path d="M172 112 L188 128" {...stroke} strokeWidth={3.4} />
        <path d="M156 86 l2.4 6.2 l6.2 2.4 l-6.2 2.4 l-2.4 6.2 l-2.4 -6.2 l-6.2 -2.4 l6.2 -2.4z" fill={ill.burgundy} />
      </g>
      {/* completed badge */}
      <g className="sf-float" style={{ animationDelay: "-1.5s" }}>
        <circle cx="178" cy="40" r="17" fill={ill.green} {...stroke} />
        <path d="M170 40.5 l5.5 5.5 l11-12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sparkle x={42} y={60} />
      <Sparkle x={206} y={86} r={4} delay="1.2s" />
    </Frame>
  );
}

/** Interconnected git branches / repositories. */
export function EmptyReposIllustration({ className }: { className?: string }) {
  return (
    <Frame label="Interconnected git branches and repositories" className={className}>
      <ellipse cx="120" cy="142" rx="90" ry="9" fill={ill.cream} />
      <circle cx="120" cy="76" r="56" fill={ill.rose} />
      {/* branches */}
      <path d="M120 126 V58" fill="none" stroke={ill.ink} strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M120 100 C120 84 78 92 78 70 V56" fill="none" stroke={ill.burgundy} strokeWidth={STROKE + 0.5} strokeLinecap="round" className="sf-dash" strokeDasharray="1 7" />
      <path d="M120 84 C120 70 162 76 162 56" fill="none" stroke={ill.blue} strokeWidth={STROKE + 0.5} strokeLinecap="round" className="sf-dash" strokeDasharray="1 7" />
      {/* repo cards */}
      <g className="sf-float-slow">
        <rect x="48" y="24" width="62" height="34" rx="9" fill={ill.card} {...stroke} />
        <circle cx="62" cy="41" r="6" fill={ill.peachSoft} {...stroke} />
        <rect x="74" y="35" width="28" height="5" rx="2.5" fill={ill.ink} opacity="0.75" />
        <rect x="74" y="44" width="18" height="4.5" rx="2.2" fill={ill.line} />
      </g>
      <g className="sf-float" style={{ animationDelay: "-2s" }}>
        <rect x="132" y="24" width="62" height="34" rx="9" fill={ill.card} {...stroke} />
        <circle cx="146" cy="41" r="6" fill={ill.blueSoft} {...stroke} />
        <rect x="158" y="35" width="28" height="5" rx="2.5" fill={ill.ink} opacity="0.75" />
        <rect x="158" y="44" width="18" height="4.5" rx="2.2" fill={ill.line} />
      </g>
      {/* commit nodes */}
      <circle cx="120" cy="124" r="9" fill={ill.burgundy} {...stroke} />
      <circle cx="120" cy="124" r="3.4" fill={ill.card} />
      <circle cx="120" cy="100" r="6" fill={ill.card} {...stroke} />
      <circle cx="120" cy="84" r="6" fill={ill.card} {...stroke} />
      <circle cx="78" cy="68" r="5.5" fill={ill.amber} {...stroke} />
      <circle cx="162" cy="68" r="5.5" fill={ill.blue} {...stroke} />
      <Sparkle x={30} y={96} />
      <Sparkle x={214} y={104} r={4} delay="1s" />
    </Frame>
  );
}

/** A rocket on its launch pad, ready for release. */
export function EmptyReleaseIllustration({ className }: { className?: string }) {
  return (
    <Frame label="A rocket on a launch pad, ready for release" className={className}>
      <ellipse cx="120" cy="142" rx="92" ry="9" fill={ill.cream} />
      <circle cx="120" cy="76" r="56" fill={ill.rose} />
      {/* launch pad */}
      <path d="M82 138 H158 L152 124 H88Z" fill={ill.card} {...stroke} />
      <path d="M92 124 L84 108 M148 124 L156 108" fill="none" {...stroke} />
      <path d="M84 108 H100 M140 108 H156" {...stroke} />
      {/* rocket */}
      <g className="sf-float-slow">
        <path d="M106 96 L88 116 L108 112Z" fill={ill.burgundy} {...stroke} />
        <path d="M134 96 L152 116 L132 112Z" fill={ill.burgundy} {...stroke} />
        <path d="M120 22 C142 44 144 82 136 118 L104 118 C96 82 98 44 120 22Z" fill={ill.card} {...stroke} />
        <path d="M120 22 C98 44 96 82 104 118 H120Z" fill={ill.cream} />
        <path d="M120 22 C142 44 144 82 136 118 L104 118 C96 82 98 44 120 22Z" fill="none" {...stroke} />
        <path d="M110 46 C113 38 127 38 130 46 C127 42 113 42 110 46Z" fill={ill.burgundy} />
        <path d="M102 100 H138" {...stroke} />
        <circle cx="120" cy="70" r="11" fill={ill.blueSoft} {...stroke} />
        <circle cx="120" cy="70" r="5" fill={ill.blue} />
        <circle cx="118" cy="68" r="1.6" fill="#fff" />
        <path d="M112 118 H128 L124 126 H116Z" fill={ill.amber} {...stroke} />
      </g>
      {/* countdown chip */}
      <g className="sf-drift">
        <rect x="150" y="36" width="64" height="26" rx="13" fill={ill.card} {...stroke} />
        <circle cx="165" cy="49" r="4.5" fill={ill.amber} />
        <rect x="176" y="45.5" width="28" height="6.5" rx="3.2" fill={ill.ink} opacity="0.75" />
      </g>
      <Sparkle x={36} y={50} />
      <Sparkle x={206} y={98} r={4} delay="1.1s" />
      <Sparkle x={60} y={116} r={3.5} delay="0.6s" />
    </Frame>
  );
}

/** Lightbulb idea flowing into a task card — feature requests & projects. */
export function EmptyFeaturesIllustration({ className }: { className?: string }) {
  return (
    <Frame label="An idea flowing into a planned task" className={className}>
      <ellipse cx="120" cy="142" rx="92" ry="9" fill={ill.cream} />
      <circle cx="120" cy="76" r="56" fill={ill.rose} />
      {/* bulb */}
      <g className="sf-float-slow">
        <path d="M70 66 a24 24 0 1 1 40 18 c-5 4 -6 8 -6 12 H76 c0 -4 -1 -8 -6 -12 z" fill={ill.peachSoft} {...stroke} transform="translate(-4 -6)" />
        <path d="M72 102 H104 M75 109 H101" {...stroke} transform="translate(-4 -6)" />
        <path d="M80 68 l7 8 l7 -8" fill="none" stroke={ill.burgundy} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" transform="translate(-4 -6)" />
      </g>
      {/* rays */}
      <path d="M62 22 l4 8 M36 40 l8 4 M26 70 h9" {...stroke} stroke={ill.amber} />
      {/* arrow */}
      <path d="M112 76 C124 76 128 90 142 90" fill="none" stroke={ill.burgundy} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray="2 6" className="sf-dash" />
      {/* task card */}
      <g className="sf-float" style={{ animationDelay: "-1.5s" }}>
        <rect x="136" y="62" width="82" height="68" rx="11" fill={ill.card} {...stroke} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="148" y={76 + i * 17} width="11" height="11" rx="3.5" fill={i === 0 ? ill.green : ill.card} {...stroke} />
            {i === 0 ? <path d="M150.5 81.8 l2.4 2.4 l4-4.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
            <rect x="166" y={78 + i * 17} width={[40, 32, 24][i]} height="5.5" rx="2.7" fill={i === 0 ? ill.ink : ill.line} opacity={i === 0 ? 0.75 : 1} />
          </g>
        ))}
      </g>
      <Sparkle x={30} y={104} />
      <Sparkle x={210} y={34} r={4} delay="0.9s" />
    </Frame>
  );
}
