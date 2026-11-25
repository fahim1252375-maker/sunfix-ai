import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cloud,
  FileText,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { AIRuntimeIndicator } from '../components/RuntimeStatusBadge';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';

const ASSESSMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  evidence_available: { label: 'Evidence available', color: TOKENS.mint },
  needs_inspection: { label: 'More readings needed', color: TOKENS.amberWarn },
  stop_work_required: { label: 'Stop-work required · Requires qualified inspection', color: TOKENS.terracotta },
};

const CAUSE_RANK_LABELS: Record<string, string> = {
  likely: 'Evidence available',
  possible: 'Possible cause',
  requires_inspection: 'Requires qualified inspection',
  unverified: 'Unverified',
};

export const DiagnosticResultsView: React.FC = () => {
  const {
    cases,
    activeCaseId,
    setActiveCaseId,
    knowledgeDocs,
    createWorkOrderFromCase,
    runCloudDeepAnalysisForCase,
    effectiveOnline,
    navigate,
    lastAiWarning,
  } = useSunFix();

  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const activeCase = cases.find((c) => c.id === activeCaseId) || cases[0];
  if (!activeCase) {
    return (
      <div
        className="border rounded-xl p-8 text-center space-y-3"
        style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
      >
        <p className="text-sm" style={{ color: TOKENS.sage }}>No diagnostic cases recorded yet.</p>
        <button
          type="button"
          onClick={() => navigate('diagnostics')}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
        >
          Start New Diagnosis
        </button>
      </div>
    );
  }

  const citedDocs = knowledgeDocs.filter((doc) => activeCase.assessment.sourceIds.includes(doc.id));
  const statusMeta =
    ASSESSMENT_STATUS_LABELS[activeCase.assessment.assessmentStatus] ||
    ASSESSMENT_STATUS_LABELS.needs_inspection;

  const handleCloudDeepAnalysis = async () => {
    setCloudLoading(true);
    setCloudError(null);
    try {
      await runCloudDeepAnalysisForCase(activeCase.id);
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Cloud deep analysis failed.');
    } finally {
      setCloudLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <AIRuntimeIndicator source={activeCase.inferenceRecord.inferenceSource} />
            <span className="text-xs font-mono-tech uppercase" style={{ color: statusMeta.color }}>
              {statusMeta.label}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl" style={{ color: TOKENS.bone }}>
            {activeCase.assessment.caseTitle}
          </h1>
          <p className="text-xs font-mono-tech" style={{ color: TOKENS.sage }}>
            {activeCase.assetName} · {activeCase.componentName} · Model: {activeCase.inferenceRecord.modelName} ({activeCase.inferenceRecord.latencyMs} ms)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {cases.length > 1 && (
            <select
              aria-label="Select diagnostic case"
              value={activeCase.id}
              onChange={(e) => setActiveCaseId(e.target.value)}
              className="rounded-lg border px-3 py-2 text-xs"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {effectiveOnline && !activeCase.stopWork && (
            <button
              type="button"
              disabled={cloudLoading}
              onClick={handleCloudDeepAnalysis}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.sky,
                color: TOKENS.sky,
              }}
            >
              <Cloud className="w-4 h-4" />
              {cloudLoading ? 'Running Cloud Deep Analysis...' : 'Request Cloud Deep Analysis'}
            </button>
          )}

          <button
            type="button"
            onClick={() => createWorkOrderFromCase(activeCase.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
          >
            <Wrench className="w-4 h-4" />
            {activeCase.stopWork
              ? 'Open Safety Escalation Work Order'
              : 'Accept & Create Safety-Reviewed Work Order'}
          </button>
        </div>
      </div>

      {/* Warning / Fallback Notices */}
      {(lastAiWarning || activeCase.inferenceRecord.errorDetail || cloudError) && (
        <div
          className="p-4 rounded-xl border text-xs space-y-1"
          style={{
            backgroundColor: TOKENS.brassSoft,
            borderColor: TOKENS.amberWarn,
            color: TOKENS.amberWarn,
          }}
        >
          {lastAiWarning && <div>{lastAiWarning}</div>}
          {activeCase.inferenceRecord.errorDetail && (
            <div className="font-mono-tech text-[11px] opacity-90">
              Runtime detail: {activeCase.inferenceRecord.errorDetail}
            </div>
          )}
          {cloudError && <div style={{ color: TOKENS.terracotta }}>{cloudError}</div>}
        </div>
      )}

      {/* Mandatory Stop-Work Hold Alert */}
      {activeCase.stopWork && (
        <div
          role="alert"
          className="p-5 rounded-xl border space-y-2"
          style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.terracotta }}
        >
          <div className="flex items-center gap-2 text-base font-bold" style={{ color: TOKENS.terracotta }}>
            <ShieldAlert className="w-5 h-5" />
            STOP-WORK SAFETY HOLD — ESCALATION REQUIRED
          </div>
          <p className="text-sm leading-relaxed" style={{ color: TOKENS.bone }}>
            {activeCase.stopWorkReason ||
              'Hazardous physical or electrical condition detected. Do not proceed with standard diagnostic probing or repairs.'}
          </p>
        </div>
      )}

      {/* Summary & Observed Evidence */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div
            className="border rounded-xl p-5 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
              Diagnostic Assessment Summary
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: TOKENS.bone }}>
              {activeCase.assessment.summary}
            </p>
            <div
              className="text-xs pt-2 border-t flex flex-wrap gap-4"
              style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}
            >
              <span>
                Priority: <strong className="uppercase" style={{ color: TOKENS.brass }}>{activeCase.priority}</strong>
              </span>
              <span>
                Fault Code: <strong className="font-mono-tech" style={{ color: TOKENS.bone }}>{activeCase.faultCode || 'None'}</strong>
              </span>
              <span>
                Case Status: <strong style={{ color: TOKENS.sky }}>{activeCase.status}</strong>
              </span>
            </div>
          </div>

          {/* Evidence-First Possible Causes */}
          <div
            className="border rounded-xl p-5 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
              Possible Causes & Evidence Verification
            </h2>
            <div className="space-y-3">
              {activeCase.assessment.possibleCauses.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border space-y-2.5"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.bone }}>
                      {item.cause}
                    </span>
                    <span className="text-xs font-mono-tech" style={{ color: TOKENS.brass }}>
                      {CAUSE_RANK_LABELS[item.assessment] || item.assessment}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium mb-1" style={{ color: TOKENS.mint }}>
                        Supporting Evidence
                      </div>
                      <ul className="space-y-1 list-disc pl-4" style={{ color: TOKENS.sage }}>
                        {item.supportingEvidence.length > 0 ? (
                          item.supportingEvidence.map((ev, i) => <li key={i}>{ev}</li>)
                        ) : (
                          <li>No direct confirming evidence attached yet</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-1" style={{ color: TOKENS.amberWarn }}>
                        Missing / Needed Verification
                      </div>
                      <ul className="space-y-1 list-disc pl-4" style={{ color: TOKENS.sage }}>
                        {item.missingEvidence.length > 0 ? (
                          item.missingEvidence.map((m, i) => <li key={i}>{m}</li>)
                        ) : (
                          <li>None flagged</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safe Next Actions */}
          <div
            className="border rounded-xl p-5 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
              Safe Non-Invasive Next Actions
            </h2>
            <ul className="space-y-2">
              {activeCase.assessment.safeNextActions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm p-2.5 rounded-lg border"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline, color: TOKENS.bone }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOKENS.mint }} />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Optional Cloud Deep Analysis Comparison */}
          {activeCase.cloudDeepAnalysis && activeCase.cloudInferenceRecord && (
            <div
              className="border rounded-xl p-5 space-y-3"
              style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.sky }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg" style={{ color: TOKENS.sky }}>
                  Cloud Deep Analysis Correlation
                </h2>
                <AIRuntimeIndicator source={activeCase.cloudInferenceRecord.inferenceSource} compact />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: TOKENS.bone }}>
                {activeCase.cloudDeepAnalysis.summary}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Field Inputs & Verified Knowledge Citations */}
        <div className="lg:col-span-4 space-y-6">
          <div
            className="border rounded-xl p-5 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <h2 className="font-display text-base" style={{ color: TOKENS.bone }}>
              Recorded Field Readings
            </h2>
            {activeCase.readings.length === 0 ? (
              <p className="text-xs" style={{ color: TOKENS.sage }}>No numerical readings logged.</p>
            ) : (
              <div className="space-y-2">
                {activeCase.readings.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 border-b"
                    style={{ borderColor: TOKENS.hairline }}
                  >
                    <span style={{ color: TOKENS.sage }}>{r.label}</span>
                    <span className="font-mono-tech font-semibold tabular-nums" style={{ color: TOKENS.bone }}>
                      {r.value} {r.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeCase.assessment.requiredInformation.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: TOKENS.amberWarn }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Required Information
                </div>
                <ul className="space-y-1 text-xs list-disc pl-4" style={{ color: TOKENS.sage }}>
                  {activeCase.assessment.requiredInformation.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div
            className="border rounded-xl p-5 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base flex items-center gap-2" style={{ color: TOKENS.bone }}>
                <BookOpen className="w-4 h-4" style={{ color: TOKENS.brass }} />
                Verified Knowledge Citations
              </h2>
              <button
                type="button"
                onClick={() => navigate('knowledge')}
                className="text-xs hover:underline"
                style={{ color: TOKENS.brass }}
              >
                Library
              </button>
            </div>
            {citedDocs.length === 0 ? (
              <p className="text-xs" style={{ color: TOKENS.sage }}>
                No verified library sources matched directly; consult manufacturer manual.
              </p>
            ) : (
              <div className="space-y-2.5">
                {citedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border space-y-1"
                    style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                  >
                    <div className="text-xs font-semibold" style={{ color: TOKENS.bone }}>{doc.title}</div>
                    <div className="text-[11px]" style={{ color: TOKENS.brass }}>{doc.sectionRef}</div>
                    <div className="text-[11px]" style={{ color: TOKENS.sage }}>
                      {doc.publisher} · Verified {doc.verifiedDate}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('reports')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-medium"
              style={{
                backgroundColor: TOKENS.mossRaised,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              <FileText className="w-3.5 h-3.5" style={{ color: TOKENS.brass }} />
              View / Generate Service Report
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
