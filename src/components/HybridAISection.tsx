import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  RefreshCw,
  ShieldCheck,
  Terminal,
  WifiOff,
} from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';
import { MALFORMED_DEMO_RAW_OUTPUT, runMalformedSchemaDemo } from '../utils/diagnosticsLogic';
import { EditorialHeadline } from './EditorialHeadline';
import { AIRuntimeIndicator } from './RuntimeStatusBadge';

export const HybridAISection: React.FC = () => {
  const {
    runtimeCapabilities,
    refreshRuntimeCapabilities,
    deviceAvailability,
    downloadProgress,
    deviceStatusDetail,
    prepareOnDeviceAI,
    lastInferenceRecord,
    inferenceHistory,
    knowledgeDocs,
    cases,
    comparisons,
    runComparisonForCase,
    appCheckStatus,
    effectiveOnline,
  } = useSunFix();

  const reducedMotion = useReducedMotion();
  const [probing, setProbing] = useState(false);
  const [malformedResult, setMalformedResult] = useState<ReturnType<typeof runMalformedSchemaDemo> | null>(
    null,
  );
  const [selectedCompareCaseId, setSelectedCompareCaseId] = useState(cases[0]?.id || 'case-demo-g04');
  const [comparingMode, setComparingMode] = useState<'prefer_on_device' | 'only_in_cloud' | null>(null);

  const validIds = useMemo(() => knowledgeDocs.map((k) => k.id), [knowledgeDocs]);
  const activeSource = lastInferenceRecord?.inferenceSource || 'demo_rules';

  const activeComparison = comparisons.find((c) => c.caseId === selectedCompareCaseId);

  const handleRefreshProbe = async () => {
    setProbing(true);
    try {
      await refreshRuntimeCapabilities();
    } finally {
      setProbing(false);
    }
  };

  const handleRunMalformedDemo = () => {
    setMalformedResult(runMalformedSchemaDemo(validIds));
  };

  const handleCompareRun = async (mode: 'prefer_on_device' | 'only_in_cloud') => {
    setComparingMode(mode);
    try {
      await runComparisonForCase(selectedCompareCaseId, mode);
    } finally {
      setComparingMode(null);
    }
  };

  return (
    <section
      id="hybrid-ai"
      className="py-16 sm:py-24 border-t"
      style={{ borderColor: TOKENS.hairline }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 space-y-14">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8 space-y-3">
            <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
              03 · Honest Hybrid Inference Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-[1.08]" style={{ color: TOKENS.bone }}>
              <EditorialHeadline text="Every inference source is *verified*, never simulated." />
            </h2>
          </div>
          <div className="lg:col-span-4 text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
            SunFix reads <span className="font-mono-tech" style={{ color: TOKENS.bone }}>result.response.inferenceSource</span> directly from the Firebase AI Logic Web SDK—distinguishing local Gemini Nano, Cloud Gemini, and offline rules honestly.
          </div>
        </div>

        {/* 5.1 Live Runtime Capability Panel + 5.2 Animated Request Routing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t" style={{ borderColor: TOKENS.hairline }}>
          {/* 5.1 Probe Panel */}
          <div
            className="lg:col-span-6 rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                  5.1 · Live Browser Runtime Probe
                </div>
                <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                  Current Environment Capabilities
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRefreshProbe}
                disabled={probing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
                Refresh Probe
              </button>
            </div>

            <div className="divide-y text-xs" style={{ borderColor: TOKENS.hairline }}>
              {[
                { label: 'Detected Browser', value: runtimeCapabilities.browserLabel, ok: true },
                {
                  label: 'Chrome Desktop ≥139 Eligibility',
                  value: runtimeCapabilities.chromeDesktopEligible
                    ? `Eligible (v${runtimeCapabilities.chromeVersion})`
                    : 'Not eligible in current runtime',
                  ok: runtimeCapabilities.chromeDesktopEligible,
                },
                {
                  label: 'WebGPU Hardware Adapter',
                  value: runtimeCapabilities.webGpuDetail,
                  ok: runtimeCapabilities.webGpuAvailable,
                },
                {
                  label: 'Browser Storage Quota',
                  value:
                    runtimeCapabilities.storageQuotaMb !== null
                      ? `${runtimeCapabilities.storageUsageMb ?? 0} MB used / ${runtimeCapabilities.storageQuotaMb} MB`
                      : 'Storage estimate unavailable',
                  ok: runtimeCapabilities.storageQuotaMb !== null,
                },
                {
                  label: 'SDK LanguageModel.availability()',
                  value: runtimeCapabilities.sdkLanguageModelStatus,
                  ok: runtimeCapabilities.sdkLanguageModelStatus === 'available' || runtimeCapabilities.sdkLanguageModelStatus === 'readily',
                },
                {
                  label: 'Network & Effective Mode',
                  value: effectiveOnline ? 'Online (Cloud fallback reachable)' : 'Offline Mode Active',
                  ok: effectiveOnline,
                },
              ].map((row) => (
                <div key={row.label} className="py-2.5 flex items-center justify-between gap-4">
                  <span style={{ color: TOKENS.sage }}>{row.label}</span>
                  <span
                    className="font-mono-tech text-right"
                    style={{ color: row.ok ? TOKENS.mint : TOKENS.amberWarn }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5.2 Request Routing Diagram */}
          <div
            className="lg:col-span-6 rounded-xl border p-6 space-y-5"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                  5.2 · Active Request Routing
                </div>
                <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                  Last Verified Path
                </h3>
              </div>
              <AIRuntimeIndicator source={activeSource} compact />
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'on_device',
                  title: '1. On-Device Gemini Nano',
                  detail: 'PREFER_ON_DEVICE -> InferenceSource.ON_DEVICE',
                  icon: Cpu,
                  accent: TOKENS.mint,
                },
                {
                  id: 'in_cloud',
                  title: '2. Cloud Gemini (App Check Gated)',
                  detail: 'Automatic cloud fallback or ONLY_IN_CLOUD for PDFs & deep correlation',
                  icon: Cloud,
                  accent: TOKENS.sky,
                },
                {
                  id: 'demo_rules',
                  title: '3. Deterministic Offline Rules (Non-Generative)',
                  detail: 'Runs locally when offline or AI Logic API is unconfigured',
                  icon: WifiOff,
                  accent: TOKENS.amberWarn,
                },
              ].map((step) => {
                const Icon = step.icon;
                const isActive = activeSource === step.id;
                return (
                  <motion.div
                    key={step.id}
                    className="rounded-lg border p-3.5 flex items-start justify-between gap-3"
                    style={{
                      backgroundColor: isActive ? TOKENS.mossRaised : TOKENS.mossDeep,
                      borderColor: isActive ? step.accent : TOKENS.hairline,
                    }}
                    animate={
                      isActive && !reducedMotion
                        ? { borderColor: [TOKENS.hairlineStrong, step.accent, TOKENS.hairlineStrong] }
                        : undefined
                    }
                    transition={{ duration: 2.8, repeat: Infinity }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: step.accent }} />
                      <div>
                        <div className="text-xs font-semibold" style={{ color: TOKENS.bone }}>
                          {step.title}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: TOKENS.sage }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border shrink-0"
                      style={{
                        borderColor: isActive ? step.accent : TOKENS.hairline,
                        color: isActive ? step.accent : TOKENS.sage,
                      }}
                    >
                      {isActive ? 'ACTIVE' : 'STANDBY'}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5.3 Input Capability Matrix + 5.4 Model Lifecycle Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t" style={{ borderColor: TOKENS.hairline }}>
          {/* 5.3 Matrix */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                5.3 · Input Capability Matrix
              </div>
              <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                Modality Support by Execution Mode
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: TOKENS.hairline, backgroundColor: TOKENS.moss }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-mono-tech" style={{ borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}>
                    <th className="py-3 px-4">Input / Feature</th>
                    <th className="py-3 px-3">On-Device</th>
                    <th className="py-3 px-3">Cloud-Only</th>
                    <th className="py-3 px-3">Offline Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: TOKENS.hairline }}>
                  {[
                    ['Structured Symptoms + Readings', 'Supported', 'Supported', 'Deterministic'],
                    ['JPEG / PNG Field Photo', 'Prompt-dependent', 'Supported', 'Logged locally'],
                    ['Complex PDF OEM Manual', 'Cloud-only', 'Supported', 'Queued'],
                    ['Multi-turn Correlation', 'Short context', 'Supported', 'N/A'],
                    ['Zero-Network Operation', 'When cached', 'Unavailable', 'Always Ready'],
                    ['Deterministic Safety Gate', 'Enforced pre-AI', 'Enforced pre-AI', 'Enforced'],
                  ].map(([feature, onDev, cloud, rules]) => (
                    <tr key={feature}>
                      <td className="py-2.5 px-4 font-medium" style={{ color: TOKENS.bone }}>
                        {feature}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tech" style={{ color: TOKENS.mint }}>
                        {onDev}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tech" style={{ color: TOKENS.sky }}>
                        {cloud}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tech" style={{ color: TOKENS.amberWarn }}>
                        {rules}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5.4 Model Lifecycle Timeline */}
          <div
            className="lg:col-span-5 rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div>
              <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                5.4 · On-Device Model Lifecycle
              </div>
              <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                Explicit User Activation Flow
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: '1. Check Browser & Prompt API', done: runtimeCapabilities.chromeDesktopEligible },
                { label: '2. Explicit User Activation Click', done: deviceAvailability !== 'unchecked' },
                { label: `3. Download Progress (${downloadProgress}%)`, done: deviceAvailability === 'ready' },
                { label: '4. Initialize & Persist Ready State', done: deviceAvailability === 'ready' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: TOKENS.mossDeep,
                    borderColor: s.done ? TOKENS.mint : TOKENS.hairline,
                  }}
                >
                  <span style={{ color: TOKENS.bone }}>{s.label}</span>
                  <span className="font-mono-tech text-[11px]" style={{ color: s.done ? TOKENS.mint : TOKENS.sage }}>
                    {s.done ? 'COMPLETE' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: TOKENS.sage }}>
              {deviceStatusDetail}
            </p>

            <button
              type="button"
              onClick={prepareOnDeviceAI}
              disabled={deviceAvailability === 'downloading'}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors"
              style={{
                backgroundColor: TOKENS.brass,
                color: TOKENS.ink,
              }}
            >
              {deviceAvailability === 'downloading'
                ? `Downloading Model (${downloadProgress}%)...`
                : 'Prepare On-device AI'}
            </button>
          </div>
        </div>

        {/* 5.5 Schema Validation Pipeline + 5.6 Same Prompt, Two Sources Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t" style={{ borderColor: TOKENS.hairline }}>
          {/* 5.5 Interactive Schema Validation */}
          <div
            className="lg:col-span-6 rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                  5.5 · Zod Validation & Citation Gate
                </div>
                <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                  Reject Malformed & Unverified Claims
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRunMalformedDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: TOKENS.brass,
                  color: TOKENS.ink,
                }}
              >
                <Terminal className="w-3.5 h-3.5" />
                Run Malformed Demo Sample
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: TOKENS.sage }}>
              Every model output runs through <span className="font-mono-tech" style={{ color: TOKENS.bone }}>parseAndValidateAssessment()</span>—rejecting invalid severities, empty titles, missing causes, and stripping hallucinated Knowledge Library IDs.
            </p>

            <pre
              className="rounded-lg border p-3 text-[11px] font-mono-tech overflow-x-auto max-h-36"
              style={{
                backgroundColor: TOKENS.mossDeep,
                borderColor: TOKENS.hairline,
                color: TOKENS.sage,
              }}
            >
              {MALFORMED_DEMO_RAW_OUTPUT}
            </pre>

            {malformedResult && !malformedResult.ok && (
              <div
                data-testid="malformed-schema-output"
                className="rounded-lg border p-3.5 space-y-2 text-xs"
                style={{
                  backgroundColor: TOKENS.mossDeep,
                  borderColor: TOKENS.terracotta,
                }}
              >
                <div className="flex items-center gap-2 font-semibold" style={{ color: TOKENS.terracotta }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Validation Blocked Unverified Output
                </div>
                <div className="font-mono-tech text-[11px]" style={{ color: TOKENS.bone }}>
                  {malformedResult.error}
                </div>
                <div className="font-mono-tech text-[11px]" style={{ color: TOKENS.amberWarn }}>
                  Stripped unverified sourceIds: {malformedResult.droppedSourceIds.join(', ') || 'None'}
                </div>
              </div>
            )}
          </div>

          {/* 5.6 Same Prompt, Two Sources Comparison */}
          <div
            className="lg:col-span-6 rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div>
              <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                5.6 · Same Prompt, Two Sources
              </div>
              <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                Persisted Hybrid vs. Cloud Comparison
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select diagnostic case for hybrid comparison"
                value={selectedCompareCaseId}
                onChange={(e) => setSelectedCompareCaseId(e.target.value)}
                className="flex-1 min-w-[180px] rounded-lg border px-3 py-2 text-xs"
                style={{
                  backgroundColor: TOKENS.mossDeep,
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

              <button
                type="button"
                disabled={comparingMode !== null}
                onClick={() => handleCompareRun('prefer_on_device')}
                className="px-3 py-2 rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                {comparingMode === 'prefer_on_device' ? 'Running...' : 'Run Hybrid'}
              </button>

              <button
                type="button"
                disabled={comparingMode !== null}
                onClick={() => handleCompareRun('only_in_cloud')}
                className="px-3 py-2 rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.sky,
                }}
              >
                {comparingMode === 'only_in_cloud' ? 'Running...' : 'Run Cloud-Only'}
              </button>
            </div>

            {activeComparison ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  className="rounded-lg border p-3 space-y-2"
                  style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-[11px]" style={{ color: TOKENS.sage }}>
                      PREFER ON-DEVICE
                    </span>
                    {activeComparison.primaryRecord && (
                      <AIRuntimeIndicator source={activeComparison.primaryRecord.inferenceSource} compact />
                    )}
                  </div>
                  <div className="leading-relaxed line-clamp-3" style={{ color: TOKENS.bone }}>
                    {activeComparison.primaryAssessment?.summary || 'Run comparison to record live result.'}
                  </div>
                  {activeComparison.primaryRecord && (
                    <div className="font-mono-tech text-[11px]" style={{ color: TOKENS.sage }}>
                      {activeComparison.primaryRecord.latencyMs} ms · {activeComparison.primaryRecord.modelName}
                    </div>
                  )}
                </div>

                <div
                  className="rounded-lg border p-3 space-y-2"
                  style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-[11px]" style={{ color: TOKENS.sage }}>
                      ONLY IN CLOUD
                    </span>
                    {activeComparison.secondaryRecord && (
                      <AIRuntimeIndicator source={activeComparison.secondaryRecord.inferenceSource} compact />
                    )}
                  </div>
                  <div className="leading-relaxed line-clamp-3" style={{ color: TOKENS.bone }}>
                    {activeComparison.secondaryUnavailableReason ||
                      activeComparison.secondaryAssessment?.summary ||
                      'Click Run Cloud-Only to execute live cloud comparison.'}
                  </div>
                  {activeComparison.secondaryRecord && (
                    <div className="font-mono-tech text-[11px]" style={{ color: TOKENS.sage }}>
                      {activeComparison.secondaryRecord.latencyMs} ms · {activeComparison.secondaryRecord.modelName}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="rounded-lg border p-4 text-xs"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline, color: TOKENS.sage }}
              >
                No comparison run stored yet in IndexedDB for this case. Run either path above to persist an honest side-by-side trace (fallback rules or unavailable states are never disguised).
              </div>
            )}
          </div>
        </div>

        {/* 5.7 Privacy Diagram + 5.8 App Check + 5.9 Session Inference Log + 5.10 Limitations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t" style={{ borderColor: TOKENS.hairline }}>
          {/* 5.7 Privacy + 5.8 App Check + 5.10 Limitations */}
          <div className="lg:col-span-5 space-y-5">
            <div
              className="rounded-xl border p-5 space-y-3"
              style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
            >
              <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                <Database className="w-3.5 h-3.5" />
                5.7 · Privacy & Local-First Boundary
              </div>
              <p className="text-xs leading-relaxed" style={{ color: TOKENS.bone }}>
                On-device inference keeps prompts inside Chromium. Cloud inference sends diagnostic snapshots only when network is active and App Check validates the client. Offline mode blocks network calls completely and reads local IndexedDB.
              </p>
            </div>

            <div
              className="rounded-xl border p-5 space-y-2.5"
              style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
            >
              <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.mint }}>
                <ShieldCheck className="w-3.5 h-3.5" />
                5.8 · Firebase App Check Guard
              </div>
              <div className="text-xs font-mono-tech" style={{ color: TOKENS.bone }}>
                State: {appCheckStatus.state}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: TOKENS.sage }}>
                {appCheckStatus.detail} Debug tokens are strictly read from environment variables and never exposed in UI.
              </p>
            </div>

            <div
              className="rounded-xl border p-5 space-y-2"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong }}
            >
              <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.amberWarn }}>
                5.10 · Honest Limitations
              </div>
              <ul className="space-y-1.5 text-xs leading-relaxed" style={{ color: TOKENS.sage }}>
                <li>• Web on-device Gemini Nano requires Chrome Desktop ≥139 with Prompt API & sufficient storage.</li>
                <li>• PDF equipment manual parsing requires ONLY_IN_CLOUD connectivity.</li>
                <li>• Offline deterministic rules are non-generative and never substitute for live metering.</li>
              </ul>
            </div>
          </div>

          {/* 5.9 Session Inference Log Timeline */}
          <div
            className="lg:col-span-7 rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                  5.9 · Session Inference Log Timeline
                </div>
                <h3 className="font-display text-xl mt-0.5" style={{ color: TOKENS.bone }}>
                  Audited Calls ({inferenceHistory.length})
                </h3>
              </div>
              <CheckCircle2 className="w-4 h-4" style={{ color: TOKENS.mint }} />
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {inferenceHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-lg border p-3.5 space-y-1.5 text-xs"
                  style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <AIRuntimeIndicator source={rec.inferenceSource} compact />
                    <span className="font-mono-tech text-[11px] tabular-nums" style={{ color: TOKENS.sage }}>
                      {rec.latencyMs} ms · {new Date(rec.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-medium" style={{ color: TOKENS.bone }}>
                    {rec.modelName}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
                    <span>Mode: {rec.modeRequested}</span>
                    <span>Schema: {rec.validationPassed === false ? 'Failed' : 'Verified'}</span>
                    {rec.supportingCount !== undefined && (
                      <span>
                        Evidence: {rec.supportingCount} supporting / {rec.missingCount ?? 0} missing
                      </span>
                    )}
                    {rec.droppedSourceIds && rec.droppedSourceIds.length > 0 && (
                      <span style={{ color: TOKENS.amberWarn }}>
                        Stripped IDs: {rec.droppedSourceIds.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
