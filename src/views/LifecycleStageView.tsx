import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ShieldAlert } from 'lucide-react';
import { EditorialHeadline } from '../components/EditorialHeadline';
import { LifecycleStageVisual } from '../components/LifecycleStageVisuals';
import { useSunFix } from '../context/SunFixContext';
import { LIFECYCLE_STAGES } from '../data/demoData';
import { TOKENS } from '../theme/tokens';

export const LifecycleStageView: React.FC = () => {
  const { activeLifecycleSlug, navigate, knowledgeDocs } = useSunFix();

  const currentIndex = Math.max(
    0,
    LIFECYCLE_STAGES.findIndex((s) => s.slug === activeLifecycleSlug),
  );
  const stage = LIFECYCLE_STAGES[currentIndex];
  const prevStage = currentIndex > 0 ? LIFECYCLE_STAGES[currentIndex - 1] : null;
  const nextStage =
    currentIndex < LIFECYCLE_STAGES.length - 1 ? LIFECYCLE_STAGES[currentIndex + 1] : null;

  const linkedKnowledge = knowledgeDocs.filter((k) => stage.knowledgeIds.includes(k.id));

  return (
    <div className="min-h-screen editorial-vignette" style={{ backgroundColor: TOKENS.ink, color: TOKENS.bone }}>
      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 border-b px-4 sm:px-8 py-3.5"
        style={{
          backgroundColor: TOKENS.ink,
          borderColor: TOKENS.hairline,
        }}
      >
        <div className="max-w-[1160px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate('welcome')}
              className="inline-flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap"
              style={{ color: TOKENS.sage }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Overview
            </button>
            <span className="hidden sm:inline font-mono-tech text-xs" style={{ color: TOKENS.hairlineStrong }}>
              /
            </span>
            <span className="hidden sm:inline font-mono-tech text-xs truncate" style={{ color: TOKENS.brass }}>
              {stage.indexLabel} · {stage.shortTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(stage.targetRoute)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              backgroundColor: TOKENS.brass,
              color: TOKENS.ink,
            }}
          >
            {stage.ctaLabel}
          </button>
        </div>
      </header>

      {/* Main Editorial Stage Article */}
      <main className="max-w-[1160px] mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-14">
        {/* Stage Title Block */}
        <section className="space-y-5 max-w-3xl">
          <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
            {stage.indexLabel} · Field Service Lifecycle
          </div>
          <h1 className="text-3xl sm:text-5xl leading-[1.08]" style={{ color: TOKENS.bone }}>
            <EditorialHeadline text={stage.headline} />
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: TOKENS.sage }}>
            {stage.summary}
          </p>
        </section>

        {/* Interactive Visual + Field Purpose */}
        <section
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-10 border-t items-start"
          style={{ borderColor: TOKENS.hairline }}
        >
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.sage }}>
              Field Technician Workflow
            </div>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: TOKENS.bone }}>
              {stage.fieldPurpose}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(stage.targetRoute)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: TOKENS.brass,
                  color: TOKENS.ink,
                }}
              >
                Try it in the app: {stage.ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <LifecycleStageVisual slug={stage.slug} interactive />
          </div>
        </section>

        {/* Inputs / Outputs Architectural Table */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t"
          style={{ borderColor: TOKENS.hairline }}
        >
          <div
            className="rounded-xl border p-6 space-y-3"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairline,
            }}
          >
            <div className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
              Stage Inputs
            </div>
            <ul className="space-y-2.5 text-sm" style={{ color: TOKENS.bone }}>
              {stage.inputs.map((inp) => (
                <li key={inp} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="font-mono-tech text-xs mt-1" style={{ color: TOKENS.brass }}>
                    →
                  </span>
                  <span>{inp}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-xl border p-6 space-y-3"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairline,
            }}
          >
            <div className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.mint }}>
              Verified Outputs
            </div>
            <ul className="space-y-2.5 text-sm" style={{ color: TOKENS.bone }}>
              {stage.outputs.map((out) => (
                <li key={out} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="font-mono-tech text-xs mt-1" style={{ color: TOKENS.mint }}>
                    ✓
                  </span>
                  <span>{out}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Safety Notes & Knowledge Citations */}
        <section
          className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-10 border-t"
          style={{ borderColor: TOKENS.hairline }}
        >
          <div
            className="md:col-span-7 rounded-xl border p-6 space-y-3"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.terracotta,
            }}
          >
            <div className="flex items-center gap-2 text-xs font-mono-tech uppercase" style={{ color: TOKENS.terracotta }}>
              <ShieldAlert className="w-4 h-4" />
              Field Safety Guardrails
            </div>
            <ul className="space-y-2 text-sm leading-relaxed" style={{ color: TOKENS.bone }}>
              {stage.safetyNotes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>

          <div
            className="md:col-span-5 rounded-xl border p-6 space-y-3"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairline,
            }}
          >
            <div className="text-xs font-mono-tech uppercase" style={{ color: TOKENS.sage }}>
              Linked Knowledge IDs
            </div>
            <div className="space-y-2">
              {linkedKnowledge.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => navigate('knowledge')}
                  className="w-full text-left rounded-lg border p-3 flex items-start gap-2.5 transition-colors"
                  style={{
                    backgroundColor: TOKENS.mossRaised,
                    borderColor: TOKENS.hairline,
                  }}
                >
                  <BookOpen className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOKENS.brass }} />
                  <div className="min-w-0">
                    <div className="text-xs font-mono-tech" style={{ color: TOKENS.brass }}>
                      {k.id}
                    </div>
                    <div className="text-xs font-medium mt-0.5 line-clamp-1" style={{ color: TOKENS.bone }}>
                      {k.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stage Pagination */}
        <nav
          aria-label="Lifecycle stage navigation"
          className="pt-8 border-t flex flex-wrap items-center justify-between gap-4"
          style={{ borderColor: TOKENS.hairline }}
        >
          {prevStage ? (
            <button
              type="button"
              onClick={() => navigate('lifecycle', { lifecycleSlug: prevStage.slug })}
              className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
              }}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" style={{ color: TOKENS.sage }} />
              <div>
                <div className="text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
                  Previous · {prevStage.indexLabel}
                </div>
                <div className="text-sm font-medium" style={{ color: TOKENS.bone }}>
                  {prevStage.shortTitle}
                </div>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextStage && (
            <button
              type="button"
              onClick={() => navigate('lifecycle', { lifecycleSlug: nextStage.slug })}
              className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border text-right transition-colors ml-auto"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
              }}
            >
              <div>
                <div className="text-[11px] font-mono-tech" style={{ color: TOKENS.brass }}>
                  Next · {nextStage.indexLabel}
                </div>
                <div className="text-sm font-medium" style={{ color: TOKENS.bone }}>
                  {nextStage.shortTitle}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 shrink-0" style={{ color: TOKENS.brass }} />
            </button>
          )}
        </nav>
      </main>
    </div>
  );
};
