import React, { Suspense } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Cpu,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AIRuntimeIndicator, SyncStatusIndicator } from '../components/RuntimeStatusBadge';
import { SolarTwinSvg2D } from '../components/SolarTwinSvg2D';
import { useSunFix } from '../context/SunFixContext';
import { DEMO_TELEMETRY_SERIES } from '../data/demoData';
import { TOKENS } from '../theme/tokens';

const SolarDigitalTwin3D = React.lazy(() =>
  import('../components/SolarDigitalTwin3D').then((m) => ({ default: m.SolarDigitalTwin3D })),
);

export const DashboardView: React.FC = () => {
  const {
    assets,
    cases,
    workOrders,
    reports,
    selectedAssetId,
    selectedTwinComponentId,
    setSelectedTwinComponentId,
    navigate,
    effectiveOnline,
    syncStatus,
    syncQueue,
    processSyncQueue,
    deviceAvailability,
    downloadProgress,
    prepareOnDeviceAI,
    lastInferenceRecord,
    twinRecoveryPulse,
    twinHourDecimal,
    setTwinHourDecimal,
    startDiagnosisForComponent,
  } = useSunFix();

  const activeAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];
  const openCases = cases.filter((c) => c.status !== 'resolved');
  const resolvedCases = cases.filter((c) => c.status === 'resolved');
  const pendingRepairs = workOrders.filter((w) => w.status !== 'completed');
  const pendingSyncCount = syncQueue.filter((q) => q.status === 'pending' || q.status === 'failed').length;

  if (!activeAsset) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-4 rounded-2xl border p-7"
        style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}>
        <span className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>Workspace setup</span>
        <h1 className="font-display text-3xl" style={{ color: TOKENS.bone }}>Add your first solar installation</h1>
        <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
          Your workspace is empty. Add a site to start managing its equipment, diagnostics, service work, and reports.
        </p>
        <button type="button" onClick={() => navigate('assets')} className="rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}>
          Open site registry
        </button>
      </section>
    );
  }

  const statusDistribution = [
    { name: 'Nominal', count: assets.filter((a) => a.status === 'nominal').length, color: TOKENS.mint },
    { name: 'Warning', count: assets.filter((a) => a.status === 'warning').length, color: TOKENS.amberWarn },
    { name: 'Fault', count: assets.filter((a) => a.status === 'fault').length, color: TOKENS.terracotta },
    { name: 'Offline', count: assets.filter((a) => a.status === 'offline').length, color: TOKENS.sage },
  ];

  const prioritizedCases = [...openCases].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    return rank[a.priority] - rank[b.priority];
  });

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div
        className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Field Operations · Site Workspace
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            Operations <em className="italic" style={{ color: TOKENS.brass }}>command</em> center
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Illustrative telemetry preview & diagnostic queue · {activeAsset.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={prepareOnDeviceAI}
            disabled={deviceAvailability === 'downloading' || deviceAvailability === 'ready'}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-medium disabled:opacity-60 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            <Cpu className="w-4 h-4" style={{ color: TOKENS.brass }} />
            {deviceAvailability === 'ready'
              ? 'On-device AI Ready'
              : deviceAvailability === 'downloading'
                ? `Preparing (${downloadProgress}%)`
                : 'Prepare On-device AI'}
          </button>

          <button
            type="button"
            onClick={() => startDiagnosisForComponent(activeAsset.id, selectedTwinComponentId)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
          >
            New AI Diagnosis
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Operational metrics">
        {[
          {
            label: 'Registered Demo Assets',
            value: String(assets.length),
            valueColor: TOKENS.bone,
            sub: `${assets.filter((a) => a.status === 'nominal').length} nominal · ${assets.filter((a) => a.status !== 'nominal').length} attention`,
            subColor: TOKENS.mint,
          },
          {
            label: 'Open Diagnostic Cases',
            value: String(openCases.length),
            valueColor: TOKENS.brass,
            sub: `${openCases.filter((c) => c.priority === 'critical' || c.priority === 'high').length} high/critical priority`,
            subColor: TOKENS.sage,
          },
          {
            label: 'Pending Repair Tasks',
            value: String(pendingRepairs.length),
            valueColor: TOKENS.sky,
            sub: `${workOrders.reduce((acc, w) => acc + w.tasks.filter((t) => t.status !== 'completed').length, 0)} open steps`,
            subColor: TOKENS.sage,
          },
          {
            label: 'Resolved & Reported',
            value: `${resolvedCases.length} / ${reports.length}`,
            valueColor: TOKENS.mint,
            sub: 'Cases resolved · PDF Reports',
            subColor: TOKENS.sage,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="border rounded-xl p-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="text-xs" style={{ color: TOKENS.sage }}>
              {kpi.label}
            </div>
            <div
              className="font-mono-tech text-2xl font-semibold mt-1 tabular-nums"
              style={{ color: kpi.valueColor }}
            >
              {kpi.value}
            </div>
            <div className="text-xs mt-1" style={{ color: kpi.subColor }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </section>

      {/* Primary Split: 3D Digital Twin + AI & Sync Runtime */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div
          className="xl:col-span-8 border rounded-xl p-4 flex flex-col gap-3"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
                Digital Twin Model — {activeAsset.name}
              </h2>
              <p className="text-xs" style={{ color: TOKENS.sage }}>
                Click any 3D subsystem to inspect health status or start a diagnostic workflow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('digital-twin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
              style={{
                backgroundColor: TOKENS.mossRaised,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.brass,
              }}
            >
              <Box className="w-3.5 h-3.5" />
              Open Full 3D Twin
            </button>
          </div>

          <div className="h-[360px] w-full">
            <Suspense
              fallback={
                <SolarTwinSvg2D
                  components={activeAsset.components}
                  selectedComponentId={selectedTwinComponentId}
                  onSelectComponent={setSelectedTwinComponentId}
                  recoveryPulse={twinRecoveryPulse}
                  capacityKw={activeAsset.capacityKw}
                  hourDecimal={twinHourDecimal}
                  onChangeHourDecimal={setTwinHourDecimal}
                  compact
                />
              }
            >
              <SolarDigitalTwin3D
                components={activeAsset.components}
                selectedComponentId={selectedTwinComponentId}
                onSelectComponent={setSelectedTwinComponentId}
                recoveryPulse={twinRecoveryPulse}
                capacityKw={activeAsset.capacityKw}
                hourDecimal={twinHourDecimal}
                onChangeHourDecimal={setTwinHourDecimal}
                compact
              />
            </Suspense>
          </div>
        </div>

        {/* Right Panel: AI Runtime + Prioritized Alerts */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div
            className="border rounded-xl p-5 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base" style={{ color: TOKENS.bone }}>
                Hybrid AI & Sync Status
              </h2>
              <SyncStatusIndicator status={syncStatus} pendingCount={pendingSyncCount} />
            </div>

            <div className="space-y-2 text-xs">
              <div
                className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: TOKENS.hairline }}
              >
                <span style={{ color: TOKENS.sage }}>Last Inference Source</span>
                <AIRuntimeIndicator
                  source={lastInferenceRecord?.inferenceSource || 'demo_rules'}
                  compact
                />
              </div>
              <div
                className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: TOKENS.hairline }}
              >
                <span style={{ color: TOKENS.sage }}>On-device Availability</span>
                <span className="font-mono-tech" style={{ color: TOKENS.bone }}>
                  {deviceAvailability}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span style={{ color: TOKENS.sage }}>Connection Mode</span>
                <span className="font-mono-tech" style={{ color: TOKENS.bone }}>
                  {effectiveOnline ? 'Connected' : 'Offline Local-First'}
                </span>
              </div>
            </div>

            {pendingSyncCount > 0 && effectiveOnline && (
              <button
                type="button"
                onClick={processSyncQueue}
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.brass,
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync {pendingSyncCount} Pending Record(s)
              </button>
            )}
          </div>

          <div
            className="border rounded-xl p-5 flex-1 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base" style={{ color: TOKENS.bone }}>
                Prioritized Fault Alerts
              </h2>
              <button
                type="button"
                onClick={() => navigate('repairs')}
                className="text-xs hover:underline"
                style={{ color: TOKENS.brass }}
              >
                View Queue
              </button>
            </div>

            {prioritizedCases.length === 0 ? (
              <p className="text-xs py-4" style={{ color: TOKENS.mint }}>
                All demonstration diagnostic cases are currently resolved.
              </p>
            ) : (
              <div className="space-y-2.5">
                {prioritizedCases.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate('diagnostic-results', { caseId: c.id })}
                    className="w-full text-left p-3 rounded-lg border transition-colors space-y-1"
                    style={{
                      backgroundColor: TOKENS.mossRaised,
                      borderColor: TOKENS.hairline,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className="font-mono-tech font-semibold uppercase"
                        style={{
                          color:
                            c.priority === 'critical' || c.priority === 'high'
                              ? TOKENS.terracotta
                              : TOKENS.amberWarn,
                        }}
                      >
                        {c.priority} · {c.faultCode || c.componentType}
                      </span>
                      {c.stopWork && (
                        <span
                          className="inline-flex items-center gap-1 font-mono-tech"
                          style={{ color: TOKENS.terracotta }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          HOLD
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium line-clamp-1" style={{ color: TOKENS.bone }}>
                      {c.title}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: TOKENS.sage }}>
                      {c.assetName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Telemetry & Status Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          className="lg:col-span-8 border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
                Simulated Production Trend (Expected vs. Observed kW)
              </h2>
              <p className="text-xs" style={{ color: TOKENS.sage }}>
                Explicitly labelled demonstration telemetry illustrating G04-UV midday drop.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('calculator')}
              className="text-xs font-medium hover:underline"
              style={{ color: TOKENS.brass }}
            >
              Open Energy Impact Calculator
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO_TELEMETRY_SERIES} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={TOKENS.hairline} vertical={false} />
                <XAxis dataKey="hour" stroke={TOKENS.sage} fontSize={11} />
                <YAxis stroke={TOKENS.sage} fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: TOKENS.mossDeep,
                    border: `1px solid ${TOKENS.hairlineStrong}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: TOKENS.bone,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="expectedKw"
                  name="Expected (Demo)"
                  stroke={TOKENS.sky}
                  fill={TOKENS.sky}
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="observedKw"
                  name="Observed (Demo)"
                  stroke={TOKENS.brass}
                  fill={TOKENS.brass}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="lg:col-span-4 border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <div>
            <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
              Asset Health Distribution
            </h2>
            <p className="text-xs" style={{ color: TOKENS.sage }}>
              Live count across registered sites
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={TOKENS.hairline} vertical={false} />
                <XAxis dataKey="name" stroke={TOKENS.sage} fontSize={11} />
                <YAxis allowDecimals={false} stroke={TOKENS.sage} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: TOKENS.mossDeep,
                    border: `1px solid ${TOKENS.hairlineStrong}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: TOKENS.bone,
                  }}
                />
                <Bar dataKey="count" name="Assets" radius={[6, 6, 0, 0]}>
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Service Activity */}
      <section
        className="border rounded-xl p-5 space-y-3"
        style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
            Recent Diagnostic & Repair Activity
          </h2>
          <button
            type="button"
            onClick={() => navigate('reports')}
            className="text-xs hover:underline"
            style={{ color: TOKENS.brass }}
          >
            Service Reports
          </button>
        </div>

        <div className="divide-y" style={{ borderColor: TOKENS.hairline }}>
          {workOrders.slice(0, 4).map((wo) => (
            <div
              key={wo.id}
              className="py-3 flex flex-wrap items-center justify-between gap-4 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                {wo.status === 'blocked' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: TOKENS.terracotta }} />
                ) : (
                  <Wrench className="w-4 h-4 shrink-0" style={{ color: TOKENS.brass }} />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: TOKENS.bone }}>
                    {wo.title}
                  </div>
                  <div className="text-xs" style={{ color: TOKENS.sage }}>
                    {wo.assetName} · {wo.tasks.filter((t) => t.status === 'completed').length}/
                    {wo.tasks.length} steps
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('repairs', { workOrderId: wo.id })}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                Open Workflow
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
