import React, { useMemo, useState } from 'react';
import { Calculator, FileText, Info } from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { calculateEnergyImpact } from '../utils/diagnosticsLogic';
import { TOKENS } from '../theme/tokens';

export const CalculatorView: React.FC = () => {
  const { assets, cases, selectedAssetId, generateServiceReport } = useSunFix();
  const activeAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const [expectedKw, setExpectedKw] = useState(activeAsset?.capacityKw ? activeAsset.capacityKw * 0.85 : 40.8);
  const [observedKw, setObservedKw] = useState(0);
  const [durationHours, setDurationHours] = useState(4.5);
  const [irradianceDeratePct, setIrradianceDeratePct] = useState(95);

  const result = useMemo(
    () =>
      calculateEnergyImpact({
        expectedKw,
        observedKw,
        durationHours,
        irradianceDeratePct,
      }),
    [expectedKw, observedKw, durationHours, irradianceDeratePct],
  );

  const presets = [
    { label: 'G04-UV Total Inverter Halt (Demo)', exp: 48, obs: 0, hrs: 4.5, derate: 90 },
    { label: 'Partial PV String Loss 35% (Demo)', exp: 48, obs: 31.2, hrs: 6, derate: 95 },
    { label: 'Residential 12.4 kW Curtailed (Demo)', exp: 12.4, obs: 4.1, hrs: 3, derate: 85 },
  ];

  const inputStyle: React.CSSProperties = {
    backgroundColor: TOKENS.mossDeep,
    borderColor: TOKENS.hairlineStrong,
    color: TOKENS.bone,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div
          className="text-[11px] font-mono-tech uppercase tracking-[0.18em] mb-1"
          style={{ color: TOKENS.sage }}
        >
          Engineering Estimate · Labelled Assumptions
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold" style={{ color: TOKENS.bone }}>
          Energy Loss Impact <em className="italic font-normal" style={{ color: TOKENS.brass }}>Calculator</em>
        </h1>
        <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
          Transparent engineering estimate comparing expected site output against observed generation.
        </p>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setExpectedKw(p.exp);
              setObservedKw(p.obs);
              setDurationHours(p.hrs);
              setIrradianceDeratePct(p.derate);
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border text-xs transition-colors"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairline,
              color: TOKENS.sage,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inputs */}
        <section
          className="lg:col-span-6 border rounded-xl p-6 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-base font-semibold flex items-center gap-2" style={{ color: TOKENS.bone }}>
            <Calculator className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Site Parameters
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="calc-expected" className="block mb-1" style={{ color: TOKENS.sage }}>
                Nameplate / Expected Power (kW)
              </label>
              <input
                id="calc-expected"
                type="number"
                min={0}
                step="0.1"
                value={expectedKw}
                onChange={(e) => setExpectedKw(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-lg border px-3 py-2 text-sm font-mono-tech tabular-nums"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="calc-observed" className="block mb-1" style={{ color: TOKENS.sage }}>
                Observed Active Output (kW)
              </label>
              <input
                id="calc-observed"
                type="number"
                min={0}
                step="0.1"
                value={observedKw}
                onChange={(e) => setObservedKw(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-lg border px-3 py-2 text-sm font-mono-tech tabular-nums"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="calc-duration" className="block mb-1" style={{ color: TOKENS.sage }}>
                  Outage / Fault Duration (Hours)
                </label>
                <input
                  id="calc-duration"
                  type="number"
                  min={0}
                  step="0.25"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-lg border px-3 py-2 text-sm font-mono-tech tabular-nums"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="calc-derate" className="block mb-1" style={{ color: TOKENS.sage }}>
                  Irradiance / Site Derate (%)
                </label>
                <input
                  id="calc-derate"
                  type="number"
                  min={10}
                  max={100}
                  value={irradianceDeratePct}
                  onChange={(e) => setIrradianceDeratePct(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-lg border px-3 py-2 text-sm font-mono-tech tabular-nums"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Outputs & Mandatory Assumptions */}
        <section className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="border rounded-xl p-5"
              style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
            >
              <div className="text-xs" style={{ color: TOKENS.sage }}>Calculated Power Gap</div>
              <div className="font-mono-tech tabular-nums text-3xl font-bold mt-1" style={{ color: TOKENS.brass }}>
                {result.powerGapKw} kW
              </div>
              <div className="text-xs font-mono-tech tabular-nums mt-1" style={{ color: TOKENS.sage }}>
                Adjusted Expected: {result.expectedKw} kW
              </div>
            </div>

            <div
              className="border rounded-xl p-5"
              style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
            >
              <div className="text-xs" style={{ color: TOKENS.sage }}>Estimated Energy Difference</div>
              <div className="font-mono-tech tabular-nums text-3xl font-bold mt-1" style={{ color: TOKENS.sky }}>
                {result.estimatedEnergyGapKwh} kWh
              </div>
              <div className="text-xs font-mono-tech tabular-nums mt-1" style={{ color: TOKENS.sage }}>
                Over {result.durationHours} hours
              </div>
            </div>
          </div>

          <div
            className="border rounded-xl p-5 space-y-3 text-xs"
            style={{
              backgroundColor: TOKENS.mossRaised,
              borderColor: TOKENS.brass,
            }}
          >
            <div className="flex items-center gap-2 font-semibold" style={{ color: TOKENS.brass }}>
              <Info className="w-4 h-4 shrink-0" />
              Explicit Assumptions & Measurement Limitations
            </div>
            <div>
              <div className="font-medium mb-1" style={{ color: TOKENS.bone }}>Calculation Formula</div>
              <ul className="list-disc pl-4 space-y-1" style={{ color: TOKENS.sage }}>
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1" style={{ color: TOKENS.bone }}>Important Limitations</div>
              <ul className="list-disc pl-4 space-y-1" style={{ color: TOKENS.sage }}>
                {result.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              generateServiceReport({
                caseId: cases[0]?.id || '',
                estimatedImpactKwh: result.estimatedEnergyGapKwh,
                outstandingIssues: 'Energy impact calculation attached for FieldProof reporting.',
              })
            }
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: TOKENS.brass, color: TOKENS.mossDeep }}
          >
            <FileText className="w-4 h-4" />
            Attach Estimate ({result.estimatedEnergyGapKwh} kWh) to New Service Report
          </button>
        </section>
      </div>
    </div>
  );
};
