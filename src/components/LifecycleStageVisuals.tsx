import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { TOKENS } from '../theme/tokens';
import type { LifecycleSlug } from '../types/sunfix';

export const LifecycleStageVisual: React.FC<{
  slug: LifecycleSlug;
  interactive?: boolean;
}> = ({ slug, interactive = false }) => {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [gateTripped, setGateTripped] = useState(true);
  const [sliderPct, setSliderPct] = useState(52);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]) setInView(entries[0].isIntersecting);
      },
      { threshold: 0.1 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const animateActive = inView && !reducedMotion;

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border p-4 sm:p-5 overflow-hidden"
      style={{
        backgroundColor: TOKENS.mossDeep,
        borderColor: TOKENS.hairlineStrong,
      }}
    >
      {slug === 'digital-twin' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
            <span>MESA RIDGE 48 kWp · TWIN TOPOLOGY [DEMO]</span>
            <span style={{ color: TOKENS.terracotta }}>FAULT: INVERTER G04-UV</span>
          </div>
          <svg viewBox="0 0 360 150" className="w-full h-36" aria-hidden="true">
            <polygon
              points="30,85 180,22 330,85 180,140"
              fill={TOKENS.moss}
              stroke={TOKENS.hairlineStrong}
              strokeWidth="1.5"
            />
            {[0, 1, 2].map((i) => (
              <polygon
                key={i}
                points={`${72 + i * 32},${68 + i * 10} ${130 + i * 32},${44 + i * 10} ${148 + i * 32},${52 + i * 10} ${90 + i * 32},${76 + i * 10}`}
                fill={TOKENS.scene.cellBaseDark}
                stroke={TOKENS.sky}
                strokeWidth="1"
              />
            ))}
            <line
              x1="158"
              y1="66"
              x2="232"
              y2="92"
              stroke={TOKENS.brass}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={animateActive ? 'sf-dash-flow' : undefined}
            />
            <rect
              x="226"
              y="76"
              width="28"
              height="24"
              rx="3"
              fill={TOKENS.mossRaised}
              stroke={TOKENS.terracotta}
              strokeWidth="2"
            />
            {animateActive && (
              <circle
                cx="240"
                cy="88"
                r="16"
                fill="none"
                stroke={TOKENS.terracotta}
                strokeWidth="1.5"
                className="sf-pulse-ring"
              />
            )}
            <line
              x1="254"
              y1="88"
              x2="296"
              y2="88"
              stroke={TOKENS.terracotta}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle cx="300" cy="88" r="8" fill={TOKENS.mossRaised} stroke={TOKENS.sage} strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {slug === 'safety-gate' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
              DETERMINISTIC SAFETY GATE
            </span>
            {interactive && (
              <button
                type="button"
                onClick={() => setGateTripped((v) => !v)}
                className="px-2.5 py-1 rounded border text-[11px] font-mono-tech transition-colors"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                {gateTripped ? 'Clear Simulated Hazard' : 'Simulate Hazard Flag'}
              </button>
            )}
          </div>
          <div
            className="rounded-lg border p-3 flex items-center justify-between gap-3 transition-colors"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: gateTripped ? TOKENS.terracotta : TOKENS.mint,
            }}
          >
            <div className="flex items-center gap-2.5">
              {gateTripped ? (
                <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: TOKENS.terracotta }} />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: TOKENS.mint }} />
              )}
              <div>
                <div className="text-xs font-semibold" style={{ color: TOKENS.bone }}>
                  {gateTripped ? 'STOP-WORK HOLD ACTIVE' : 'NON-INVASIVE CLEARANCE PASSED'}
                </div>
                <div className="text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
                  {gateTripped
                    ? 'safetyCleared = false · Escalate to licensed electrical supervisor'
                    : 'safetyCleared = true · Repair tasks unlocked (no energized opening)'}
                </div>
              </div>
            </div>
            {gateTripped && <Lock className="w-4 h-4 shrink-0" style={{ color: TOKENS.terracotta }} />}
          </div>
        </div>
      )}

      {slug === 'hybrid-diagnosis' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
            <span>FIREBASE AI LOGIC ROUTING</span>
            <span style={{ color: TOKENS.mint }}>ZOD SCHEMA FILTERED</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono-tech">
            {[
              { label: 'LOCAL', sub: 'Gemini Nano', color: TOKENS.mint },
              { label: 'CLOUD', sub: 'App Check + Flash', color: TOKENS.sky },
              { label: 'DEMO RULES', sub: 'Offline Safe', color: TOKENS.amberWarn },
            ].map((node) => (
              <div
                key={node.label}
                className="rounded-lg border p-2.5 transition-colors"
                style={{
                  backgroundColor: TOKENS.moss,
                  borderColor: node.color,
                }}
              >
                <div className="font-semibold" style={{ color: node.color }}>
                  {node.label}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: TOKENS.sage }}>
                  {node.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {slug === 'safety-gated-repair' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
            <span>INDEXEDDB + FIRESTORE WORK ORDER</span>
            <span style={{ color: TOKENS.brass }}>TWIN SYNC READY</span>
          </div>
          {[
            { label: '1. Confirm external AC disconnect status', done: true },
            { label: '2. Capture FieldProof G04-UV LCD photo', done: true },
            { label: '3. Verify post-service export > 30 kW', done: false },
          ].map((step) => (
            <div
              key={step.label}
              className="flex items-center justify-between rounded border px-3 py-1.5 text-xs transition-colors"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: step.done ? TOKENS.mint : TOKENS.brass,
                color: TOKENS.bone,
              }}
            >
              <span className="truncate">{step.label}</span>
              <span
                className="text-[10px] font-mono-tech shrink-0 ml-2"
                style={{ color: step.done ? TOKENS.mint : TOKENS.brass }}
              >
                {step.done ? 'DONE' : 'ACTIVE'}
              </span>
            </div>
          ))}
        </div>
      )}

      {slug === 'fieldproof' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
            <span>BEFORE / AFTER FIELDPROOF [DEMO]</span>
            <span style={{ color: TOKENS.brass }}>{sliderPct}% WIPE</span>
          </div>
          <div
            className="relative h-28 rounded-lg border overflow-hidden select-none"
            style={{ borderColor: TOKENS.hairlineStrong, backgroundColor: TOKENS.moss }}
          >
            {/* After State (Right/Underlying) */}
            <div className="absolute inset-0 flex flex-col justify-between p-3" style={{ backgroundColor: TOKENS.mossRaised }}>
              <div className="flex justify-end">
                <span className="text-[10px] font-mono-tech uppercase px-1.5 py-0.5 rounded border" style={{ borderColor: TOKENS.mint, color: TOKENS.mint }}>
                  AFTER · NOMINAL [SIMULATED]
                </span>
              </div>
              <div className="text-right font-mono-tech">
                <div className="text-lg font-semibold tabular-nums" style={{ color: TOKENS.mint }}>
                  38.4 kW AC
                </div>
                <div className="text-[11px]" style={{ color: TOKENS.sage }}>
                  L2-N 240.2 V · Export Restored
                </div>
              </div>
            </div>

            {/* Before State (Clipped Left) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden flex flex-col justify-between p-3 border-r-2"
              style={{
                width: `${sliderPct}%`,
                backgroundColor: TOKENS.ink,
                borderColor: TOKENS.brass,
              }}
            >
              <div className="whitespace-nowrap">
                <span className="text-[10px] font-mono-tech uppercase px-1.5 py-0.5 rounded border" style={{ borderColor: TOKENS.terracotta, color: TOKENS.terracotta }}>
                  BEFORE · G04-UV [DEMO]
                </span>
              </div>
              <div className="font-mono-tech whitespace-nowrap">
                <div className="text-lg font-semibold tabular-nums flex items-center gap-1.5" style={{ color: TOKENS.terracotta }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  0.0 kW AC
                </div>
                <div className="text-[11px]" style={{ color: TOKENS.sage }}>
                  L2-N 196.4 V · Trip Logged
                </div>
              </div>
            </div>
          </div>

          <input
            type="range"
            aria-label="Compare before and after FieldProof evidence"
            min={8}
            max={92}
            value={sliderPct}
            onChange={(e) => setSliderPct(Number.parseInt(e.target.value, 10))}
            className="w-full"
            style={{ accentColor: TOKENS.brass }}
          />
        </div>
      )}

      {slug === 'service-report' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
            <span>REPORT SF-2026-1042 [DEMO]</span>
            <span style={{ color: TOKENS.mint }}>PRINT & AUDIT READY</span>
          </div>
          <div className="space-y-2 rounded-lg border p-3" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <div className="flex items-center justify-between text-xs font-mono-tech">
              <span style={{ color: TOKENS.sage }}>Expected (Simulated)</span>
              <span style={{ color: TOKENS.brass }}>44.5 kW</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: TOKENS.mossDeep }}>
              <div className="h-full w-[88%]" style={{ backgroundColor: TOKENS.brass }} />
            </div>
            <div className="flex items-center justify-between text-xs font-mono-tech">
              <span style={{ color: TOKENS.sage }}>Observed During Fault</span>
              <span style={{ color: TOKENS.terracotta }}>0.0 kW</span>
            </div>
            <div className="text-[11px]" style={{ color: TOKENS.sage }}>
              Citations: <span className="font-mono-tech" style={{ color: TOKENS.bone }}>kb-inv-g04 · kb-nec-690</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
