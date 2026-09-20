/**
 * Scène d'équipements en volume doux (baie serveur, switch, câblage) pour l'écran de connexion.
 * SVG pur, aucune image bitmap, aucune bibliothèque 3D — sous 40 Ko. Purement décoratif
 * (`aria-hidden`) : elle n'illustre pas un vrai projet, elle plante le décor « infrastructure ».
 * Couleurs exclusivement tirées des jetons `--auth-*` (tokens.css) : jamais de couleur en dur.
 * Le clignotement des LED est coupé par la règle globale `prefers-reduced-motion` (globals.css).
 */
export function LoginIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="li-face-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--auth-panel-text-muted))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--auth-bg-start))" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="li-face-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--auth-panel-text))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="hsl(var(--auth-panel-text-muted))" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="li-face-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--auth-bg-end))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--auth-bg-end))" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="li-cable" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--auth-panel-text-muted))" />
          <stop offset="100%" stopColor="hsl(var(--auth-bg-start))" />
        </linearGradient>
        <filter id="li-blur-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <style>{`
          .li-led { animation: li-blink 2.6s ease-in-out infinite; }
          .li-led-1 { animation-delay: .4s; }
          .li-led-2 { animation-delay: 1.1s; }
          .li-led-3 { animation-delay: 1.7s; }
          .li-port-lit { animation: li-blink 3.2s ease-in-out infinite; }
          .li-port-lit:nth-of-type(3n) { animation-delay: .6s; }
          .li-port-lit:nth-of-type(3n+1) { animation-delay: 1.4s; }
          @keyframes li-blink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
        `}</style>
      </defs>

      {/* Câble principal : baie → switch, passe derrière la carte */}
      <path
        d="M451.4 673 C 600 720, 820 640, 959.2 555.2"
        fill="none"
        stroke="url(#li-cable)"
        strokeOpacity="0.8"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* Fibre optique : switch → premier plan, extrémité lumineuse */}
      <path
        d="M931.5 580.8 C 860 660, 780 700, 720 706"
        fill="none"
        stroke="hsl(var(--auth-fiber-glow))"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="720" cy="706" r="7" fill="hsl(var(--auth-fiber-glow))" filter="url(#li-blur-soft)" />
      <circle cx="720" cy="706" r="3.5" fill="hsl(var(--auth-fiber-glow))" />

      {/* Câble secondaire : baie → fiche RJ45 bien visible, juste à côté de la carte */}
      <path
        d="M447.4 802.4 C 470 760, 478 690, 485 615"
        fill="none"
        stroke="url(#li-cable)"
        strokeOpacity="0.85"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <g transform="translate(485 615) rotate(-8)">
        <rect x="-16" y="-11" width="32" height="22" rx="3" fill="hsl(var(--auth-panel-text))" fillOpacity="0.95" />
        <rect x="-11" y="-11" width="5" height="8" fill="hsl(var(--auth-bg-end))" />
        <rect x="-2" y="-11" width="5" height="8" fill="hsl(var(--auth-bg-end))" />
        <rect x="7" y="-11" width="5" height="8" fill="hsl(var(--auth-bg-end))" />
        <rect x="-20" y="-3" width="4.5" height="6" rx="1" fill="hsl(var(--auth-panel-text))" fillOpacity="0.95" />
      </g>

      {/* Baie : quatre unités 1U empilées, tout près de la carte */}
      <g>
        <polygon points="316,664.8 479.5,759.2 399.1,805.6 235.6,711.2" fill="url(#li-face-top)" />
        <polygon points="316,700 479.5,794.4 479.5,759.2 316,664.8" fill="url(#li-face-front)" />
        <polygon points="479.5,794.4 399.1,840.8 399.1,805.6 479.5,759.2" fill="url(#li-face-side)" />
        <line x1="356.9" y1="699" x2="356.9" y2="707.8" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="397.8" y1="722.6" x2="397.8" y2="731.4" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="438.6" y1="746.2" x2="438.6" y2="755" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="li-led" cx="459.9" cy="776.1" r="3.6" fill="hsl(var(--auth-led-online))" />

        <polygon points="316,624.8 479.5,719.2 399.1,765.6 235.6,671.2" fill="url(#li-face-top)" />
        <polygon points="316,660 479.5,754.4 479.5,719.2 316,624.8" fill="url(#li-face-front)" />
        <polygon points="479.5,754.4 399.1,800.8 399.1,765.6 479.5,719.2" fill="url(#li-face-side)" />
        <line x1="356.9" y1="659" x2="356.9" y2="667.8" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="397.8" y1="682.6" x2="397.8" y2="691.4" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="438.6" y1="706.2" x2="438.6" y2="715" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="li-led li-led-1" cx="459.9" cy="736.1" r="3.6" fill="hsl(var(--auth-led-online))" />

        <polygon points="316,584.8 479.5,679.2 399.1,725.6 235.6,631.2" fill="url(#li-face-top)" />
        <polygon points="316,620 479.5,714.4 479.5,679.2 316,584.8" fill="url(#li-face-front)" />
        <polygon points="479.5,714.4 399.1,760.8 399.1,725.6 479.5,679.2" fill="url(#li-face-side)" />
        <line x1="356.9" y1="619" x2="356.9" y2="627.8" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="397.8" y1="642.6" x2="397.8" y2="651.4" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="438.6" y1="666.2" x2="438.6" y2="675" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="li-led li-led-2" cx="459.9" cy="696.1" r="3.6" fill="hsl(var(--auth-led-activity))" />

        <polygon points="316,544.8 479.5,639.2 399.1,685.6 235.6,591.2" fill="url(#li-face-top)" />
        <polygon points="316,580 479.5,674.4 479.5,639.2 316,544.8" fill="url(#li-face-front)" />
        <polygon points="479.5,674.4 399.1,720.8 399.1,685.6 479.5,639.2" fill="url(#li-face-side)" />
        <line x1="356.9" y1="579" x2="356.9" y2="587.8" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="397.8" y1="602.6" x2="397.8" y2="611.4" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="438.6" y1="626.2" x2="438.6" y2="635" stroke="hsl(var(--auth-bg-end))" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="li-led li-led-3" cx="459.9" cy="656.1" r="3.6" fill="hsl(var(--auth-led-activity))" />
      </g>

      {/* Switch : châssis flottant, façade à ports, tout près de la carte */}
      <g>
        <polygon points="980,512 1215.6,648 1146.3,688 910.7,552" fill="url(#li-face-top)" />
        <polygon points="980,560 1215.6,696 1215.6,648 980,512" fill="url(#li-face-front)" />
        <polygon points="1215.6,696 1146.3,736 1146.3,688 1215.6,648" fill="url(#li-face-side)" />
        {[
          [1004.8, 540.2, false], [1040.1, 560.6, true], [1075.5, 581, false],
          [1110.8, 601.4, false], [1146.1, 621.8, true], [1181.5, 642.2, false],
          [1004.8, 559.4, false], [1040.1, 579.8, false], [1075.5, 600.2, true],
          [1110.8, 620.6, false], [1146.1, 641, false], [1181.5, 661.4, false],
        ].map(([x, y, lit], i) => (
          <rect
            key={i}
            className={lit ? 'li-port-lit' : undefined}
            x={x as number}
            y={y as number}
            width="7"
            height="5"
            rx="0.7"
            fill={lit ? 'hsl(var(--auth-led-activity))' : 'hsl(var(--auth-bg-end))'}
          />
        ))}
      </g>
    </svg>
  );
}
