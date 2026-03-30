import React from 'react';

/** SVG pattern definitions for colorblind-accessible piece overlays. */
export const PiecePatternDefs: React.FC = React.memo(function PiecePatternDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        {/* Diagonal stripe pattern */}
        <pattern
          id="pattern-stripe"
          patternUnits="userSpaceOnUse"
          width={8}
          height={8}
          patternTransform="rotate(45)"
        >
          <line
            x1={0} y1={0} x2={0} y2={8}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={3}
          />
        </pattern>

        {/* Dot pattern */}
        <pattern
          id="pattern-dot"
          patternUnits="userSpaceOnUse"
          width={10}
          height={10}
        >
          <circle
            cx={5} cy={5} r={2}
            fill="rgba(255,255,255,0.35)"
          />
        </pattern>

        {/* Cross-hatch pattern */}
        <pattern
          id="pattern-crosshatch"
          patternUnits="userSpaceOnUse"
          width={8}
          height={8}
        >
          <line
            x1={0} y1={0} x2={8} y2={8}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2}
          />
          <line
            x1={8} y1={0} x2={0} y2={8}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2}
          />
        </pattern>
      </defs>
    </svg>
  );
});
