import { ill, STROKE } from "./palette";

/** A paper rocket flying through a workflow of cards: idea → code → review → production. */
export function HeroWorkflowIllustration({ className }: { className?: string }) {
  const stroke = { stroke: ill.ink, strokeWidth: STROKE, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <svg
      viewBox="0 0 560 340"
      className={className}
      role="img"
      aria-label="A paper rocket flying through a workflow of idea, code, review and deployment cards"
    >
      {/* soft background shapes */}
      <circle cx="380" cy="150" r="138" fill={ill.rose} />
      <circle cx="455" cy="86" r="62" fill={ill.peachSoft} />
      <ellipse cx="290" cy="336" rx="270" ry="52" fill={ill.cream} />
      <ellipse cx="120" cy="296" rx="62" ry="13" fill={ill.card} opacity="0.9" />
      <ellipse cx="460" cy="302" rx="74" ry="14" fill={ill.card} opacity="0.9" />

      {/* workflow path */}
      <path
        d="M70 252 C 130 252, 120 150, 196 140 S 300 190, 346 150 S 398 128, 432 112"
        fill="none"
        stroke={ill.burgundy}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray="2 9"
        className="sf-dash"
      />
      {/* path nodes */}
      {[
        [70, 252],
        [196, 140],
        [346, 150],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="7" fill={ill.card} {...stroke} />
          <circle cx={x} cy={y} r="2.6" fill={ill.burgundy} />
        </g>
      ))}

      {/* CARD · idea / checklist (bottom-left) */}
      <g className="sf-float-slow">
        <g transform="rotate(-4 100 230)">
          <rect x="34" y="196" width="150" height="84" rx="13" fill={ill.card} {...stroke} />
          <rect x="34" y="196" width="150" height="22" rx="13" fill={ill.peachSoft} />
          <rect x="34" y="208" width="150" height="10" fill={ill.peachSoft} />
          <path d="M34 218 H184" {...stroke} />
          <circle cx="48" cy="207" r="3" fill={ill.burgundy} />
          <rect x="58" y="204.5" width="46" height="5" rx="2.5" fill={ill.ink} opacity="0.75" />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0 ${i * 17})`}>
              <circle cx="52" cy="233" r="6" fill={i < 2 ? ill.green : ill.card} {...stroke} />
              {i < 2 ? (
                <path d="M49 233.2 l2.2 2.2 l4-4.4" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
              <rect x="66" y="230.5" width={[84, 68, 52][i]} height="5" rx="2.5" fill={ill.line} />
            </g>
          ))}
        </g>
      </g>

      {/* CARD · code (top-centre) */}
      <g className="sf-drift">
        <rect x="150" y="30" width="170" height="108" rx="14" fill={ill.card} {...stroke} />
        <path d="M150 56 H320" {...stroke} />
        <circle cx="166" cy="43" r="3.6" fill={ill.burgundy} />
        <circle cx="179" cy="43" r="3.6" fill={ill.amber} />
        <circle cx="192" cy="43" r="3.6" fill={ill.green} />
        <rect x="236" y="40" width="64" height="6" rx="3" fill={ill.line} />
        {(
          [
            [[168, 26, ill.burgundy], [200, 54, ill.blue]],
            [[184, 40, ill.ink], [230, 24, ill.amber]],
            [[184, 62, ill.green], [252, 30, ill.line]],
            [[168, 36, ill.blue], [210, 46, ill.line]],
          ] as [number, number, string][][]
        ).map((row, i) => (
          <g key={i}>
            {row.map(([x, w, c], j) => (
              <rect key={j} x={x} y={70 + i * 15} width={w} height="6" rx="3" fill={c} opacity={c === ill.ink ? 0.8 : 1} />
            ))}
          </g>
        ))}
      </g>

      {/* CARD · review approved (centre-right) */}
      <g className="sf-float" style={{ animationDelay: "-2s" }}>
        <rect x="316" y="186" width="152" height="72" rx="13" fill={ill.card} {...stroke} />
        <circle cx="344" cy="216" r="15" fill={ill.green} />
        <path d="M337 216.5 l5 5 l9.5-10.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="368" y="206" width="72" height="6.5" rx="3.2" fill={ill.ink} opacity="0.8" />
        <rect x="368" y="220" width="52" height="5.5" rx="2.7" fill={ill.line} />
        <rect x="332" y="241" width="120" height="6" rx="3" fill={ill.blueSoft} />
        <rect x="332" y="241" width="88" height="6" rx="3" fill={ill.blue} className="sf-grow" />
      </g>

      {/* floating deploy chip */}
      <g className="sf-drift" style={{ animationDelay: "-3s" }}>
        <rect x="462" y="168" width="92" height="30" rx="15" fill={ill.card} {...stroke} />
        <circle cx="480" cy="183" r="4.5" fill={ill.green} />
        <circle cx="480" cy="183" r="8" fill="none" stroke={ill.green} strokeWidth="1.2" opacity="0.45" className="sf-twinkle" />
        <rect x="493" y="179.5" width="48" height="6.5" rx="3.2" fill={ill.ink} opacity="0.75" />
      </g>

      {/* paper rocket */}
      <g className="sf-float" style={{ animationDelay: "-1s" }}>
        <g transform="translate(474 66) rotate(38) scale(1.12)">
          {/* flame */}
          <g className="sf-flame">
            <path d="M0 38 C-11 54, -6 74, 0 92 C6 74, 11 54, 0 38Z" fill={ill.amber} {...stroke} />
            <path d="M0 42 C-5 54, -3 64, 0 74 C3 64, 5 54, 0 42Z" fill={ill.peachSoft} />
          </g>
          {/* fins */}
          <path d="M-13 22 L-30 48 L-11 42Z" fill={ill.burgundy} {...stroke} />
          <path d="M13 22 L30 48 L11 42Z" fill={ill.burgundy} {...stroke} />
          {/* body */}
          <path d="M0 -58 C20 -38 22 -6 15 40 L-15 40 C-22 -6 -20 -38 0 -58Z" fill={ill.card} {...stroke} />
          {/* paper fold */}
          <path d="M0 -58 L0 40" fill="none" {...stroke} opacity="0.5" />
          <path d="M0 -58 C-20 -38 -22 -6 -15 40 L0 40Z" fill={ill.cream} opacity="0.9" />
          <path d="M0 -58 C20 -38 22 -6 15 40 L-15 40 C-22 -6 -20 -38 0 -58Z" fill="none" {...stroke} />
          {/* nose + band */}
          <path d="M-8.5 -35 C-5 -45 5 -45 8.5 -35 C5 -39 -5 -39 -8.5 -35Z" fill={ill.burgundy} />
          <path d="M-16.5 22 H16.5" {...stroke} />
          {/* window */}
          <circle cx="0" cy="-6" r="9" fill={ill.blueSoft} {...stroke} />
          <circle cx="0" cy="-6" r="4.2" fill={ill.blue} />
          <circle cx="-2" cy="-8" r="1.4" fill="#fff" />
        </g>
      </g>

      {/* sparkles */}
      {[
        [506, 34, 7, "0s"],
        [296, 20, 5, "0.8s"],
        [96, 150, 5, "1.4s"],
        [540, 214, 6, "0.4s"],
        [236, 226, 4, "1.1s"],
      ].map(([x, y, r, d]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${(y as number) - (r as number)} Q${x} ${y} ${(x as number) + (r as number)} ${y} Q${x} ${y} ${x} ${(y as number) + (r as number)} Q${x} ${y} ${(x as number) - (r as number)} ${y} Q${x} ${y} ${x} ${(y as number) - (r as number)}Z`}
          fill={ill.amber}
          className="sf-twinkle"
          style={{ animationDelay: d as string }}
        />
      ))}
    </svg>
  );
}
