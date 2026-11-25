import React from 'react';
import { TOKENS } from '../theme/tokens';
import type {
  AssetComponent,
  ComponentHealthStatus,
  DigitalTwinComponentId,
  SimulatedFaultScenario,
} from '../types/sunfix';
import { computeSimulatedTwinTelemetry, formatHourLabel } from '../utils/diagnosticsLogic';

export interface SolarTwinSvg2DProps {
  components: AssetComponent[];
  selectedComponentId: DigitalTwinComponentId;
  onSelectComponent?: (id: DigitalTwinComponentId) => void;
  recoveryPulse?: boolean;
  capacityKw?: number;
  hourDecimal?: number;
  onChangeHourDecimal?: (hour: number) => void;
  activeScenario?: SimulatedFaultScenario;
  scenarioOptions?: SimulatedFaultScenario[];
  activeScenarioId?: string;
  onChangeScenario?: (scenarioId: string) => void;
  onSwitchTo3D?: () => void;
  canSwitchTo3D?: boolean;
  compact?: boolean;
  showLabels?: boolean;
}

function getStatusColor(status: ComponentHealthStatus | undefined, recoveryPulse?: boolean): string {
  if (recoveryPulse) return TOKENS.mint;
  switch (status) {
    case 'fault':
      return TOKENS.terracotta;
    case 'warning':
    case 'investigating':
      return TOKENS.amberWarn;
    case 'resolved':
    case 'nominal':
      return TOKENS.mint;
    default:
      return TOKENS.sky;
  }
}

export const SolarTwinSvg2D: React.FC<SolarTwinSvg2DProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
  recoveryPulse = false,
  capacityKw = 48,
  hourDecimal = 12.5,
  onChangeHourDecimal,
  activeScenario,
  scenarioOptions,
  activeScenarioId,
  onChangeScenario,
  onSwitchTo3D,
  canSwitchTo3D = false,
  compact = false,
  showLabels = true,
}) => {
  const statusOf = (id: DigitalTwinComponentId): ComponentHealthStatus => {
    if (recoveryPulse) return 'resolved';
    const found = components.find((c) => c.twinId === id);
    if (found) return found.status;
    if (activeScenario && activeScenario.id !== 'scenario-normal' && activeScenario.componentId === id) {
      return activeScenario.severity;
    }
    return 'nominal';
  };

  const pvStatus = statusOf('solar_panel');
  const invStatus = statusOf('inverter');
  const batStatus = statusOf('battery');
  const connStatus = statusOf('connection');
  const gridStatus = statusOf('grid_meter');
  const loadStatus = statusOf('site_load');

  const simTelemetry = computeSimulatedTwinTelemetry({
    capacityKw,
    hourDecimal,
    inverterFault: !recoveryPulse && (invStatus === 'fault' || invStatus === 'warning'),
    gridFault: !recoveryPulse && (gridStatus === 'fault' || gridStatus === 'warning'),
    stringFault: !recoveryPulse && (pvStatus === 'fault' || pvStatus === 'warning'),
    batteryFault: !recoveryPulse && (batStatus === 'fault' || batStatus === 'warning'),
  });

  const downstreamHalted = !recoveryPulse && (invStatus === 'fault' || gridStatus === 'fault');

  const boxLabel = (id: DigitalTwinComponentId, fallback: string) => {
    const found = components.find((c) => c.twinId === id);
    return found ? found.name : fallback;
  };

  return (
    <div
      data-testid="digital-twin-2d-fallback"
      data-selected-component={selectedComponentId}
      className="w-full h-full min-h-[340px] flex flex-col justify-between p-4 sm:p-5 rounded-xl border"
      style={{
        backgroundColor: TOKENS.mossDeep,
        borderColor: TOKENS.hairlineStrong,
        color: TOKENS.bone,
      }}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: TOKENS.hairline }}>
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            <span>Mesa Ridge 48 kWp</span>
            <span aria-hidden="true">·</span>
            <span>2D Isometric Schematic</span>
          </div>
          <div className="text-xs mt-1 font-mono-tech tabular-nums" style={{ color: TOKENS.sage }}>
            SIMULATED IRRADIANCE ({formatHourLabel(hourDecimal)}): {simTelemetry.irradianceWm2} W/m² · EXP {simTelemetry.expectedKw} kW · OBS{' '}
            <span style={{ color: simTelemetry.observedKw < simTelemetry.expectedKw ? TOKENS.terracotta : TOKENS.mint }}>
              {simTelemetry.observedKw} kW
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSwitchTo3D && onSwitchTo3D && (
            <button
              type="button"
              onClick={onSwitchTo3D}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              style={{
                backgroundColor: TOKENS.mossRaised,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              Switch to 3D View
            </button>
          )}
        </div>
      </div>

      {/* Isometric Architectural Rooftop SVG */}
      <div className="relative flex-1 min-h-[220px] flex items-center justify-center py-2">
        <svg
          viewBox="0 0 760 390"
          className="w-full h-full max-h-[360px] select-none"
          role="img"
          aria-label="Mesa Ridge 48 kWp 2D isometric solar rooftop schematic"
        >
          {/* Rooftop Deck 34x22m Isometric Polygon */}
          <polygon
            points="70,185 380,45 690,185 380,335"
            fill={TOKENS.moss}
            stroke={TOKENS.hairlineStrong}
            strokeWidth="2"
          />
          {/* Parapet Shadow Rim */}
          <polygon
            points="70,185 380,335 380,352 70,202"
            fill={TOKENS.scene.parapetConcrete}
            opacity="0.7"
          />
          <polygon
            points="380,335 690,185 690,202 380,352"
            fill={TOKENS.scene.equipmentPad}
            opacity="0.8"
          />

          {/* 6 PV Strings (3 rows × 2 strings = 120 modules) */}
          <g
            onClick={() => onSelectComponent?.('solar_panel')}
            className="cursor-pointer"
          >
            {[0, 1, 2].map((rowIdx) =>
              [0, 1].map((colIdx) => {
                const stringNum = rowIdx * 2 + colIdx + 1;
                const isString4Fault =
                  !recoveryPulse && stringNum === 4 && (pvStatus === 'warning' || pvStatus === 'fault');
                const cx = 175 + colIdx * 102 + rowIdx * 48;
                const cy = 148 + rowIdx * 32 - colIdx * 42;
                const strokeColor =
                  selectedComponentId === 'solar_panel'
                    ? TOKENS.brass
                    : isString4Fault
                      ? TOKENS.terracotta
                      : getStatusColor(pvStatus, recoveryPulse);
                const fillColor = isString4Fault ? TOKENS.scene.conduitFault : TOKENS.scene.cellBaseDark;
                return (
                  <g key={`str-${stringNum}`}>
                    <polygon
                      points={`${cx},${cy} ${cx + 80},${cy - 34} ${cx + 104},${cy - 22} ${cx + 24},${cy + 12}`}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={selectedComponentId === 'solar_panel' || isString4Fault ? 2 : 1.1}
                    />
                    {showLabels && (
                      <text
                        x={cx + 50}
                        y={cy - 9}
                        textAnchor="middle"
                        fill={isString4Fault ? TOKENS.terracotta : TOKENS.sage}
                        fontSize="9"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        S{stringNum}
                      </text>
                    )}
                  </g>
                );
              }),
            )}
          </g>

          {/* DC Combiner & Conduit Raceway */}
          <g onClick={() => onSelectComponent?.('connection')} className="cursor-pointer">
            <polyline
              points="325,180 415,222 455,204"
              fill="none"
              stroke={
                selectedComponentId === 'connection'
                  ? TOKENS.brass
                  : getStatusColor(connStatus, recoveryPulse)
              }
              strokeWidth="3"
              strokeDasharray="6 4"
            />
            <rect
              x="398"
              y="212"
              width="24"
              height="18"
              rx="2"
              fill={TOKENS.mossRaised}
              stroke={
                selectedComponentId === 'connection'
                  ? TOKENS.brass
                  : getStatusColor(connStatus, recoveryPulse)
              }
              strokeWidth="1.5"
            />
            {showLabels && (
              <text x="410" y="244" textAnchor="middle" fill={TOKENS.sage} fontSize="10" fontFamily="IBM Plex Mono, monospace">
                DC BUS
              </text>
            )}
          </g>

          {/* Hybrid Inverter (40 kW AC Class) */}
          <g onClick={() => onSelectComponent?.('inverter')} className="cursor-pointer">
            <rect
              x="445"
              y="175"
              width="52"
              height="44"
              rx="4"
              fill={TOKENS.mossRaised}
              stroke={
                selectedComponentId === 'inverter'
                  ? TOKENS.brass
                  : getStatusColor(invStatus, recoveryPulse)
              }
              strokeWidth={selectedComponentId === 'inverter' ? 2.5 : 1.8}
            />
            <rect
              x="453"
              y="183"
              width="36"
              height="16"
              rx="2"
              fill={TOKENS.ink}
              stroke={getStatusColor(invStatus, recoveryPulse)}
              strokeWidth="1"
            />
            <text
              x="471"
              y="194"
              textAnchor="middle"
              fill={getStatusColor(invStatus, recoveryPulse)}
              fontSize="8.5"
              fontFamily="IBM Plex Mono, monospace"
            >
              {recoveryPulse ? 'NOMINAL' : activeScenario?.faultCode || `${simTelemetry.observedKw}kW`}
            </text>
            {showLabels && (
              <text x="471" y="233" textAnchor="middle" fill={TOKENS.bone} fontSize="10" fontFamily="IBM Plex Mono, monospace">
                INVERTER
              </text>
            )}
          </g>

          {/* LFP Battery Rack */}
          <g onClick={() => onSelectComponent?.('battery')} className="cursor-pointer">
            <path
              d="M471,175 L471,148 L518,148"
              fill="none"
              stroke={getStatusColor(batStatus, recoveryPulse)}
              strokeWidth="2"
              strokeDasharray={batStatus !== 'nominal' && !recoveryPulse ? '4 4' : undefined}
            />
            <rect
              x="518"
              y="128"
              width="48"
              height="40"
              rx="4"
              fill={TOKENS.mossRaised}
              stroke={
                selectedComponentId === 'battery'
                  ? TOKENS.brass
                  : getStatusColor(batStatus, recoveryPulse)
              }
              strokeWidth={selectedComponentId === 'battery' ? 2.5 : 1.8}
            />
            {showLabels && (
              <text x="542" y="182" textAnchor="middle" fill={TOKENS.sage} fontSize="10" fontFamily="IBM Plex Mono, monospace">
                LFP 60kWh
              </text>
            )}
          </g>

          {/* AC Path to Grid Tie & HVAC Site Load */}
          <line
            x1="497"
            y1="197"
            x2="585"
            y2="232"
            stroke={downstreamHalted ? TOKENS.terracotta : TOKENS.sky}
            strokeWidth="2.5"
            strokeDasharray={downstreamHalted ? '5 5' : undefined}
          />
          <line
            x1="471"
            y1="219"
            x2="345"
            y2="274"
            stroke={downstreamHalted ? TOKENS.terracotta : TOKENS.sky}
            strokeWidth="2"
            strokeDasharray={downstreamHalted ? '5 5' : undefined}
          />

          {/* Utility Grid Tie + Pole */}
          <g onClick={() => onSelectComponent?.('grid_meter')} className="cursor-pointer">
            <rect
              x="585"
              y="214"
              width="44"
              height="36"
              rx="4"
              fill={TOKENS.mossRaised}
              stroke={
                selectedComponentId === 'grid_meter'
                  ? TOKENS.brass
                  : getStatusColor(gridStatus, recoveryPulse)
              }
              strokeWidth={selectedComponentId === 'grid_meter' ? 2.5 : 1.8}
            />
            <line x1="652" y1="150" x2="652" y2="245" stroke={TOKENS.sage} strokeWidth="2.5" />
            <line x1="636" y1="164" x2="668" y2="164" stroke={TOKENS.sage} strokeWidth="2" />
            {showLabels && (
              <text x="607" y="264" textAnchor="middle" fill={TOKENS.sage} fontSize="10" fontFamily="IBM Plex Mono, monospace">
                GRID TIE
              </text>
            )}
          </g>

          {/* HVAC Site Load */}
          <g onClick={() => onSelectComponent?.('site_load')} className="cursor-pointer">
            <rect
              x="295"
              y="258"
              width="52"
              height="34"
              rx="4"
              fill={TOKENS.mossRaised}
              stroke={
                selectedComponentId === 'site_load'
                  ? TOKENS.brass
                  : getStatusColor(loadStatus, recoveryPulse)
              }
              strokeWidth={selectedComponentId === 'site_load' ? 2.5 : 1.8}
            />
            <circle cx="321" cy="275" r="10" fill={TOKENS.ink} stroke={TOKENS.sage} strokeWidth="1.2" />
            {showLabels && (
              <text x="321" y="306" textAnchor="middle" fill={TOKENS.sage} fontSize="10" fontFamily="IBM Plex Mono, monospace">
                HVAC LOAD
              </text>
            )}
          </g>
        </svg>
      </div>

      {/* Bottom Interactive Controls & Subsystem Pills */}
      {!compact && (
        <div className="space-y-3 pt-3 border-t" style={{ borderColor: TOKENS.hairline }}>
          {onChangeHourDecimal && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label htmlFor="svg-irradiance-slider" className="font-mono-tech uppercase" style={{ color: TOKENS.sage }}>
                Simulated Time (06:00–18:00): <span style={{ color: TOKENS.brass }}>{formatHourLabel(hourDecimal)}</span>
              </label>
              <input
                id="svg-irradiance-slider"
                type="range"
                min={6}
                max={18}
                step={0.5}
                value={hourDecimal}
                onChange={(e) => onChangeHourDecimal(Number.parseFloat(e.target.value))}
                className="flex-1 min-w-[140px]"
                style={{ accentColor: TOKENS.brass }}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'site_load'] as DigitalTwinComponentId[]).map(
                (id) => {
                  const status = statusOf(id);
                  const active = selectedComponentId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectComponent?.(id)}
                      className="px-2.5 py-1.5 rounded-md border text-xs font-mono-tech transition-colors"
                      style={{
                        backgroundColor: active ? TOKENS.brass : TOKENS.moss,
                        borderColor: active ? TOKENS.brass : TOKENS.hairlineStrong,
                        color: active ? TOKENS.ink : TOKENS.bone,
                      }}
                    >
                      {boxLabel(id, id).split(' ')[0]} · {status.toUpperCase()}
                    </button>
                  );
                },
              )}
            </div>

            {scenarioOptions && onChangeScenario && (
              <select
                aria-label="Fault scenario"
                value={activeScenarioId}
                onChange={(e) => onChangeScenario(e.target.value)}
                className="rounded-md px-2.5 py-1.5 text-xs border"
                style={{
                  backgroundColor: TOKENS.moss,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                {scenarioOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
