import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/patterns/brand';
import { ThemeToggle } from '@/components/patterns/theme-toggle';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const networkNodes = [
  { x: 14, y: 18, size: 16, color: 'var(--cat-switch)' },
  { x: 44, y: 28, size: 18, color: 'var(--cat-firewall)' },
  { x: 63, y: 42, size: 15, color: 'var(--cat-server)' },
  { x: 32, y: 62, size: 18, color: 'var(--cat-internet)' },
  { x: 76, y: 68, size: 16, color: 'var(--cat-router)' },
  { x: 52, y: 82, size: 20, color: 'var(--cat-switch)' },
];

const networkPaths = [
  'M8 22 C18 18, 26 20, 38 30 S58 42, 72 34',
  'M18 60 C26 50, 36 52, 46 63 S66 80, 76 72',
  'M28 22 L38 36 L48 46 L61 46',
  'M38 30 L32 54 L44 74',
  'M62 42 L70 58 L52 82',
  'M18 60 L12 82',
];

/**
 * Auth screens with a dramatic cyber-architectural background: no left-side panel, just a networked
 * canvas behind the form card, to echo the project diagrams and feel “premium / engineering-driven”.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#020d1d] text-fg">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(119,156,255,0.18), transparent 22%), radial-gradient(circle at 78% 18%, rgba(93,220,255,0.16), transparent 18%), radial-gradient(circle at 50% 80%, rgba(96,165,250,0.10), transparent 28%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.9) 1.1px, transparent 1.1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
        }}
      />

      <svg
        className="absolute inset-0 size-full opacity-80"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="netGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(96,165,250,0.4)" />
            <stop offset="50%" stopColor="rgba(103,232,249,0.95)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0.6)" />
          </linearGradient>
        </defs>
        {networkPaths.map((path, index) => (
          <path
            key={path}
            d={path}
            fill="none"
            stroke="url(#netGlow)"
            strokeWidth={index % 2 === 0 ? 0.18 : 0.12}
            strokeDasharray={index % 2 === 0 ? '0.6 0.9' : '0.4 0.8'}
            opacity={0.9}
            style={{ animation: `floatPath ${12 + index * 2}s ease-in-out infinite alternate` }}
          />
        ))}
        {networkNodes.map((node, index) => (
          <g
            key={`${node.x}-${node.y}`}
            transform={`translate(${node.x} ${node.y})`}
            style={{ animation: `pulseNode ${3.5 + index * 0.5}s ease-in-out infinite` }}
          >
            <circle r={node.size / 10} fill={node.color} opacity={0.28} />
            <circle r={node.size / 16} fill={node.color} />
          </g>
        ))}
      </svg>

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <Brand className="text-white/90" />
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-12 sm:px-8">
        <div className="relative w-full max-w-[440px] rounded-[28px] border border-white/10 bg-slate-950/55 px-5 py-7 shadow-[0_30px_80px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:px-7 sm:py-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[2rem] leading-none font-semibold tracking-[-0.04em] text-white">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-slate-300">{subtitle}</p>}
            </div>
            <div className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-200">
              {t('app.name')}
            </div>
          </div>
          <div>{children}</div>
        </div>
      </div>

      <style>{`
        @keyframes pulseNode {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.18); opacity: 1; }
        }
        @keyframes floatPath {
          0% { opacity: 0.35; transform: translate3d(0, 0, 0); }
          100% { opacity: 1; transform: translate3d(0.4rem, -0.5rem, 0); }
        }
      `}</style>
    </div>
  );
}
