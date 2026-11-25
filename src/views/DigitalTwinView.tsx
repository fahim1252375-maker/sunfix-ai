import React, { Suspense, useMemo } from 'react';
import { BookOpen, Cpu, Wrench } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SolarTwinSvg2D } from '../components/SolarTwinSvg2D';
import { useSunFix } from '../context/SunFixContext';
import { DEMO_FAULT_SCENARIOS, generateSimulatedDayCurve } from '../data/demoData';
import { TOKENS } from '../theme/tokens';
import { computeSimulatedTwinTelemetry, formatHourLabel } from '../utils/diagnosticsLogic';

const SolarDigitalTwin3D = React.lazy(() =>
  import('../components/SolarDigitalTwin3D').then((m) => ({ default: m.SolarDigitalTwin3D })),
);

export const DigitalTwinView: React.FC = () => {
  const {
    assets,
    cases,
    knowledgeDocs,
    selectedAssetId,
    setSelectedAssetId,
    selectedTwinComponentId,
    setSelectedTwinComponentId,
    activeFaultScenario,
    applyFaultScenario,
    twinRecoveryPulse,
    twinHourDecimal,
    setTwinHourDecimal,
    startDiagnosisForComponent,
    navigate,
  } = useSunFix();

  const asset = assets.find((a) => a.id === selectedAssetId) || assets[0];
  const selectedComp =
    asset.components.find((c) => c.twinId === selectedTwinComponentId) || asset.components[0];

  const relatedCases = cases.filter(
    (c) =>
      c.assetId === asset.id &&
      (c.twinComponentId === selectedTwinComponentId || c.componentId === selectedComp?.id),
  );

  const relatedKnowledge = knowledgeDocs.filter((k) => {
    if (selectedTwinComponentId === 'inverter') return k.category === 'inverter' || k.category === 'safety';
    if (selectedTwinComponentId === 'solar_panel') return k.category === 'solar_panel';
    if (selectedTwinComponentId === 'battery') return k.category === 'battery';
    if (selectedTwinComponentId === 'grid_meter' || selectedTwinComponentId === 'connection') {
      return k.category === 'grid_connection' || k.category === 'safety';
    }
    return k.category === 'safety';
  });

  const statusColor = (status?: string) => {
    if (status === 'fault') return TOKENS.terracotta;
    if (status === 'warning' || status === 'investigating') return TOKENS.amberWarn;
    if (status === 'resolved' || status === 'nominal') return TOKENS.mint;
    return TOKENS.sky;
  };

  const dayCurve = useMemo(
    () => generateSimulatedDayCurve(asset.capacityKw, activeFaultScenario),
    [asset.capacityKw, activeFaultScenario],
  );

  const simSnapshot = useMemo(() => {
    const inv = asset.components.find((c) => c.twinId === 'inverter');
    const grid = asset.components.find((c) => c.twinId === 'grid_meter');
    const pv = asset.components.find((c) => c.twinId === 'solar_panel');
    const bat = asset.components.find((c) => c.twinId === 'battery');
    return computeSimulatedTwinTelemetry({
      capacityKw: asset.capacityKw,
      hourDecimal: twinHourDecimal,
      inverterFault: !twinRecoveryPulse && (inv?.status === 'fault' || inv?.status === 'warning'),
      gridFault: !twinRecoveryPulse && (grid?.status === 'fault' || grid?.status === 'warning'),
      stringFault: !twinRecoveryPulse && (pv?.status === 'fault' || pv?.status === 'warning'),
      batteryFault: !twinRecoveryPulse && (bat?.status === 'fault' || bat?.status === 'warning'),
    });
  }, [asset.capacityKw, asset.components, twinHourDecimal, twinRecoveryPulse]);

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Interactive Rooftop Model · Simulated Telemetry
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            48 kWp Solar <em className="italic" style={{ color: TOKENS.brass }}>digital</em> twin
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Inspect subsystems, explode the hybrid inverter, inject fault scenarios, and adjust simulated solar hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="twin-asset-select" className="text-xs font-mono-tech" style={{ color: TOKENS.sage }}>
            ASSET:
          </label>
          <select
            id="twin-asset-select"
            value={asset.id}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-xs"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* 3D Viewport + Simulated Curve */}
        <div className="xl:col-span-8 space-y-5">
          <div className="h-[520px] sm:h-[580px]">
            <Suspense
              fallback={
                <SolarTwinSvg2D
                  components={asset.components}
                  selectedComponentId={selectedTwinComponentId}
                  onSelectComponent={setSelectedTwinComponentId}
                  recoveryPulse={twinRecoveryPulse}
                  capacityKw={asset.capacityKw}
                  hourDecimal={twinHourDecimal}
                  onChangeHourDecimal={setTwinHourDecimal}
                  activeScenario={activeFaultScenario}
                  scenarioOptions={DEMO_FAULT_SCENARIOS}
                  activeScenarioId={activeFaultScenario.id}
                  onChangeScenario={applyFaultScenario}
                />
              }
            >
              <SolarDigitalTwin3D
                components={asset.components}
                selectedComponentId={selectedTwinComponentId}
                onSelectComponent={setSelectedTwinComponentId}
                recoveryPulse={twinRecoveryPulse}
                scenarioOptions={DEMO_FAULT_SCENARIOS}
                activeScenarioId={activeFaultScenario.id}
                onChangeScenario={applyFaultScenario}
                capacityKw={asset.capacityKw}
                hourDecimal={twinHourDecimal}
                onChangeHourDecimal={setTwinHourDecimal}
              />
            </Suspense>
          </div>

          {/* Expected vs Observed Simulated Curve */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairline,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
                  Simulated Diurnal Production Profile [DEMO]
                </h2>
                <p className="text-xs" style={{ color: TOKENS.sage }}>
                  Calculated curve at {formatHourLabel(twinHourDecimal)}: Expected {simSnapshot.expectedKw} kW vs. Observed{' '}
                  {simSnapshot.observedKw} kW (Gap {simSnapshot.powerGapKw} kW · Simulated, not revenue metering).
                </p>
              </div>
              <span
                className="text-[11px] font-mono-tech uppercase px-2 py-1 rounded border"
                style={{
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.brass,
                  backgroundColor: TOKENS.brassSoft,
                }}
              >
                SIMULATED CURVE
              </span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayCurve} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.hairline} />
                  <XAxis dataKey="hour" stroke={TOKENS.sage} fontSize={11} />
                  <YAxis stroke={TOKENS.sage} fontSize={11} unit=" kW" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: TOKENS.mossDeep,
                      borderColor: TOKENS.hairlineStrong,
                      color: TOKENS.bone,
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expectedKw"
                    name="Expected (Simulated kW)"
                    stroke={TOKENS.brass}
                    fill={TOKENS.brassSoft}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="observedKw"
                    name="Observed (Simulated kW)"
                    stroke={TOKENS.sky}
                    fill="rgba(108, 196, 201, 0.14)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Dedicated Component Inspector Panel */}
        <aside
          aria-label="Selected component details"
          className="xl:col-span-4 rounded-xl border p-5 space-y-5"
          style={{
            backgroundColor: TOKENS.moss,
            borderColor: TOKENS.hairline,
          }}
        >
          <div className="border-b pb-4 flex items-start justify-between gap-3" style={{ borderColor: TOKENS.hairline }}>
            <div>
              <div className="text-xs font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                Selected Subsystem
              </div>
              <h2 className="font-display text-xl mt-1" style={{ color: TOKENS.bone }}>
                {selectedComp?.name || selectedTwinComponentId}
              </h2>
              <div className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                {selectedComp?.modelIdentifier || 'Standard Subsystem'} ·{' '}
                <span className="font-mono-tech">{selectedComp?.serialNumber || 'N/A'}</span>
              </div>
            </div>
            <span
              className="text-xs font-mono-tech font-semibold uppercase"
              style={{ color: statusColor(selectedComp?.status) }}
            >
              {selectedComp?.status || 'nominal'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Last Inspection</span>
              <span className="font-mono-tech tabular-nums" style={{ color: TOKENS.bone }}>
                {selectedComp?.lastInspectionAt
                  ? new Date(selectedComp.lastInspectionAt).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Simulated Irradiance</span>
              <span className="font-mono-tech tabular-nums" style={{ color: TOKENS.bone }}>
                {simSnapshot.irradianceWm2} W/m² ({formatHourLabel(twinHourDecimal)})
              </span>
            </div>
            <div className="py-1.5">
              <div className="mb-1" style={{ color: TOKENS.sage }}>
                Field Notes
              </div>
              <p className="leading-relaxed" style={{ color: TOKENS.bone }}>
                {selectedComp?.notes || 'No active component anomalies recorded.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => startDiagnosisForComponent(asset.id, selectedTwinComponentId)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: TOKENS.brass,
              color: TOKENS.ink,
            }}
          >
            <Cpu className="w-4 h-4" />
            Start Diagnosis for Component
          </button>

          {/* Associated Diagnostic Cases */}
          <div className="space-y-2 pt-3 border-t" style={{ borderColor: TOKENS.hairline }}>
            <span className="text-xs font-semibold block" style={{ color: TOKENS.bone }}>
              Associated Diagnostic Cases ({relatedCases.length})
            </span>
            {relatedCases.length === 0 ? (
              <p className="text-xs" style={{ color: TOKENS.sage }}>
                No open cases linked to this component.
              </p>
            ) : (
              <div className="space-y-2">
                {relatedCases.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate('diagnostic-results', { caseId: c.id })}
                    className="w-full text-left p-2.5 rounded-lg border text-xs space-y-1 transition-colors"
                    style={{
                      backgroundColor: TOKENS.mossRaised,
                      borderColor: TOKENS.hairline,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tech" style={{ color: TOKENS.brass }}>
                        {c.faultCode || c.status}
                      </span>
                      <span style={{ color: TOKENS.sage }}>{c.status}</span>
                    </div>
                    <div className="font-medium line-clamp-1" style={{ color: TOKENS.bone }}>
                      {c.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Relevant Knowledge References */}
          <div className="space-y-2 pt-3 border-t" style={{ borderColor: TOKENS.hairline }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: TOKENS.bone }}>
                Knowledge References
              </span>
              <button
                type="button"
                onClick={() => navigate('knowledge')}
                className="text-xs hover:underline"
                style={{ color: TOKENS.brass }}
              >
                Library
              </button>
            </div>
            <div className="space-y-1.5">
              {relatedKnowledge.slice(0, 2).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => navigate('knowledge')}
                  className="w-full text-left p-2.5 rounded-lg border flex items-start gap-2"
                  style={{
                    backgroundColor: TOKENS.mossRaised,
                    borderColor: TOKENS.hairline,
                  }}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: TOKENS.brass }} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium line-clamp-1" style={{ color: TOKENS.bone }}>
                      {k.title}
                    </div>
                    <div className="text-[11px]" style={{ color: TOKENS.sage }}>
                      {k.sectionRef}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('repairs')}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-medium transition-colors"
            style={{
              backgroundColor: TOKENS.mossRaised,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            <Wrench className="w-3.5 h-3.5" />
            Open Repair Operations
          </button>
        </aside>
      </div>
    </div>
  );
};
