import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Cloud,
  Cpu,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';
import { SAFETY_HAZARD_CHECKS, evaluateSafetyGate } from '../utils/diagnosticsLogic';

const SYMPTOM_OPTIONS = [
  'No power production',
  'Reduced output',
  'Inverter fault warning',
  'Battery not charging',
  'Unusual heating',
  'Physical damage',
  'Communication problem',
  'Other',
];

const STEPS = [
  { id: 1, label: 'Asset' },
  { id: 2, label: 'Component' },
  { id: 3, label: 'Symptoms' },
  { id: 4, label: 'Fault Code' },
  { id: 5, label: 'Readings' },
  { id: 6, label: 'Photo' },
  { id: 7, label: 'Safety Gate' },
  { id: 8, label: 'Run AI' },
];

export const DiagnosticWizardView: React.FC = () => {
  const {
    assets,
    wizardDraft,
    setWizardDraft,
    deviceAvailability,
    downloadProgress,
    deviceStatusDetail,
    browserSupport,
    prepareOnDeviceAI,
    submitDiagnosis,
    effectiveOnline,
    lastAiWarning,
  } = useSunFix();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newReadingLabel, setNewReadingLabel] = useState('');
  const [newReadingValue, setNewReadingValue] = useState('');
  const [newReadingUnit, setNewReadingUnit] = useState('V');

  const selectedAsset = assets.find((a) => a.id === wizardDraft.assetId) || assets[0];
  const safetyEval = evaluateSafetyGate(wizardDraft.safetyFlags);

  const handleSelectAsset = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const comp = asset.components[0];
    setWizardDraft((prev) => ({
      ...prev,
      assetId: asset.id,
      componentId: comp?.id || '',
      twinComponentId: comp?.twinId || 'inverter',
      componentType: comp?.type || 'inverter',
      componentName: comp?.name || 'Primary Component',
    }));
  };

  const handleSelectComponent = (componentId: string) => {
    const comp = selectedAsset.components.find((c) => c.id === componentId);
    if (!comp) return;
    setWizardDraft((prev) => ({
      ...prev,
      componentId: comp.id,
      twinComponentId: comp.twinId,
      componentType: comp.type,
      componentName: comp.name,
    }));
  };

  const toggleSymptom = (symptom: string) => {
    setWizardDraft((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const toggleSafetyFlag = (hazardId: string) => {
    setWizardDraft((prev) => ({
      ...prev,
      safetyFlags: prev.safetyFlags.includes(hazardId)
        ? prev.safetyFlags.filter((id) => id !== hazardId)
        : [...prev.safetyFlags, hazardId],
    }));
  };

  const addReadingRow = () => {
    if (!newReadingLabel.trim() || !newReadingValue.trim()) return;
    setWizardDraft((prev) => ({
      ...prev,
      readings: [
        ...prev.readings,
        {
          label: newReadingLabel.trim(),
          value: newReadingValue.trim(),
          unit: newReadingUnit.trim() || 'unit',
        },
      ],
    }));
    setNewReadingLabel('');
    setNewReadingValue('');
  };

  const removeReadingRow = (idx: number) => {
    setWizardDraft((prev) => ({
      ...prev,
      readings: prev.readings.filter((_, i) => i !== idx),
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setSubmitError('Please select a JPEG or PNG photo for FieldProof & AI intake.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSubmitError(null);
        setWizardDraft((prev) => ({
          ...prev,
          imageEvidenceName: file.name,
          imageEvidenceDataUrl: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunDiagnosis = async (forceCloudOnly = false) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitDiagnosis(forceCloudOnly);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Diagnostic submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div
        className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Evidence-First Intake · Safety Gated
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            8-step <em className="italic" style={{ color: TOKENS.brass }}>diagnostic</em> wizard
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Mandatory Safety Gate and Firebase AI Logic hybrid inference.
          </p>
        </div>
        <div className="text-xs font-mono-tech" style={{ color: TOKENS.brass }}>
          Step {step} of {STEPS.length} · {STEPS[step - 1].label}
        </div>
      </div>

      {/* Step Indicator */}
      <nav aria-label="Diagnostic steps" className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {STEPS.map((s) => {
          const isCurrent = s.id === step;
          const isCompleted = s.id < step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className="min-h-[44px] px-2 py-2 rounded-lg border text-left transition-colors"
              style={{
                backgroundColor: isCurrent ? TOKENS.mossRaised : TOKENS.moss,
                borderColor: isCurrent ? TOKENS.brass : isCompleted ? TOKENS.mint : TOKENS.hairline,
                color: isCurrent ? TOKENS.brass : isCompleted ? TOKENS.mint : TOKENS.sage,
              }}
            >
              <div className="font-mono-tech text-[11px]">0{s.id}</div>
              <div className="text-xs font-medium truncate">{s.label}</div>
            </button>
          );
        })}
      </nav>

      {/* Active Step Panel */}
      <section
        className="border rounded-xl p-5 sm:p-6 space-y-5"
        style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
      >
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                1. Select Solar Asset
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Choose the solar installation under inspection. Demo sites are clearly marked.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assets.map((asset) => {
                const selected = asset.id === wizardDraft.assetId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleSelectAsset(asset.id)}
                    className="p-4 rounded-xl border text-left transition-colors space-y-1.5 min-h-[44px]"
                    style={{
                      backgroundColor: selected ? TOKENS.mossRaised : TOKENS.ink,
                      borderColor: selected ? TOKENS.brass : TOKENS.hairline,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                        {asset.siteType} · {asset.capacityKw} kW
                      </span>
                      <span
                        className="text-xs font-mono-tech uppercase"
                        style={{
                          color:
                            asset.status === 'fault'
                              ? TOKENS.terracotta
                              : asset.status === 'warning'
                                ? TOKENS.amberWarn
                                : TOKENS.mint,
                        }}
                      >
                        {asset.status}
                      </span>
                    </div>
                    <div className="font-semibold text-sm" style={{ color: TOKENS.bone }}>
                      {asset.name}
                    </div>
                    <div className="text-xs" style={{ color: TOKENS.sage }}>
                      {asset.locationLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                2. Select Subsystem Component
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Target subsystem for {selectedAsset.name}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedAsset.components.map((comp) => {
                const selected = comp.id === wizardDraft.componentId;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => handleSelectComponent(comp.id)}
                    className="p-4 rounded-xl border text-left transition-colors space-y-1 min-h-[44px]"
                    style={{
                      backgroundColor: selected ? TOKENS.mossRaised : TOKENS.ink,
                      borderColor: selected ? TOKENS.brass : TOKENS.hairline,
                    }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                        {comp.type}
                      </span>
                      <span
                        className="font-mono-tech uppercase"
                        style={{
                          color:
                            comp.status === 'fault'
                              ? TOKENS.terracotta
                              : comp.status === 'warning'
                                ? TOKENS.amberWarn
                                : TOKENS.mint,
                        }}
                      >
                        {comp.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: TOKENS.bone }}>
                      {comp.name}
                    </div>
                    <div className="text-xs" style={{ color: TOKENS.sage }}>
                      {comp.modelIdentifier} · S/N {comp.serialNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                3. Observed Symptoms & Field Notes
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Select observed symptoms and record non-invasive inspection details.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SYMPTOM_OPTIONS.map((symptom) => {
                const checked = wizardDraft.symptoms.includes(symptom);
                return (
                  <label
                    key={symptom}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm min-h-[44px]"
                    style={{
                      backgroundColor: checked ? TOKENS.mossRaised : TOKENS.ink,
                      borderColor: checked ? TOKENS.brass : TOKENS.hairline,
                      color: checked ? TOKENS.bone : TOKENS.sage,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSymptom(symptom)}
                      className="w-4 h-4"
                      style={{ accentColor: TOKENS.brass }}
                    />
                    <span>{symptom}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <label htmlFor="symptom-notes" className="block text-xs mb-1.5" style={{ color: TOKENS.sage }}>
                Technician Observation Notes
              </label>
              <textarea
                id="symptom-notes"
                rows={3}
                value={wizardDraft.symptomNotes}
                onChange={(e) =>
                  setWizardDraft((prev) => ({ ...prev, symptomNotes: e.target.value }))
                }
                placeholder="Describe display state, ambient irradiance, audible relay behavior, or recent events..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: TOKENS.ink,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                4. Fault or Alarm Code
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Enter the inverter, BMS, or gateway fault code shown on the front panel (optional).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['G04-UV', 'BMS-12', 'STR-LOW', 'COM-09', 'ISO-DC'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWizardDraft((prev) => ({ ...prev, faultCode: preset }))}
                  className="px-3 py-2 rounded-lg border text-xs font-mono-tech min-h-[44px]"
                  style={{
                    backgroundColor: wizardDraft.faultCode === preset ? TOKENS.mossRaised : TOKENS.ink,
                    borderColor: wizardDraft.faultCode === preset ? TOKENS.brass : TOKENS.hairline,
                    color: wizardDraft.faultCode === preset ? TOKENS.brass : TOKENS.sage,
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="fault-code-input" className="block text-xs mb-1.5" style={{ color: TOKENS.sage }}>
                Reported Fault Code
              </label>
              <input
                id="fault-code-input"
                type="text"
                value={wizardDraft.faultCode}
                onChange={(e) =>
                  setWizardDraft((prev) => ({ ...prev, faultCode: e.target.value }))
                }
                placeholder="e.g. G04-UV"
                className="w-full max-w-sm rounded-lg border px-3 py-2.5 text-sm font-mono-tech focus:outline-none"
                style={{
                  backgroundColor: TOKENS.ink,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                5. Observed Field Readings
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Attach non-invasive display readouts or utility meter measurements.
              </p>
            </div>

            <div className="space-y-2">
              {wizardDraft.readings.map((r, idx) => (
                <div
                  key={`${r.label}-${idx}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                >
                  <div className="text-sm">
                    <span style={{ color: TOKENS.sage }}>{r.label}: </span>
                    <span className="font-mono-tech font-semibold tabular-nums" style={{ color: TOKENS.bone }}>
                      {r.value} {r.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReadingRow(idx)}
                    aria-label={`Remove reading ${r.label}`}
                    className="p-2"
                    style={{ color: TOKENS.sage }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2">
              <input
                type="text"
                value={newReadingLabel}
                onChange={(e) => setNewReadingLabel(e.target.value)}
                placeholder="Metric (e.g. DC String 1)"
                className="sm:col-span-5 rounded-lg border px-3 py-2.5 text-xs"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              />
              <input
                type="text"
                value={newReadingValue}
                onChange={(e) => setNewReadingValue(e.target.value)}
                placeholder="Value (e.g. 618.0)"
                className="sm:col-span-3 rounded-lg border px-3 py-2.5 text-xs font-mono-tech"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              />
              <input
                type="text"
                value={newReadingUnit}
                onChange={(e) => setNewReadingUnit(e.target.value)}
                placeholder="Unit (V, A, kW)"
                className="sm:col-span-2 rounded-lg border px-3 py-2.5 text-xs font-mono-tech"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              />
              <button
                type="button"
                onClick={addReadingRow}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-medium min-h-[44px]"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.brass,
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                6. Optional Inspection Photo
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Upload a JPEG or PNG photo of the inverter screen, exterior enclosure, or meter. Uploaded images are stored in FieldProof and included in multimodal Gemini requests.
              </p>
            </div>

            <label
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed cursor-pointer"
              style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong }}
            >
              <Camera className="w-6 h-6" style={{ color: TOKENS.brass }} />
              <span className="text-sm font-medium" style={{ color: TOKENS.bone }}>
                {wizardDraft.imageEvidenceName || 'Select JPEG / PNG Field Photo (Optional)'}
              </span>
              <span className="text-xs" style={{ color: TOKENS.sage }}>
                Stored locally offline and queued for FieldProof evidence archive
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {wizardDraft.imageEvidenceDataUrl && (
              <div className="space-y-2">
                <img
                  src={wizardDraft.imageEvidenceDataUrl}
                  alt="Field inspection preview"
                  className="max-h-56 rounded-lg border object-contain"
                  style={{ borderColor: TOKENS.hairlineStrong, backgroundColor: TOKENS.mossDeep }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setWizardDraft((prev) => ({
                      ...prev,
                      imageEvidenceName: undefined,
                      imageEvidenceDataUrl: undefined,
                    }))
                  }
                  className="text-xs hover:underline"
                  style={{ color: TOKENS.terracotta }}
                >
                  Remove attached photo
                </button>
              </div>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <div
              className="flex items-start gap-3 p-4 rounded-xl border"
              style={{ backgroundColor: TOKENS.brassSoft, borderColor: TOKENS.brass }}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: TOKENS.brass }} />
              <div className="text-xs leading-relaxed" style={{ color: TOKENS.bone }}>
                <strong>Mandatory Pre-Work Safety Gate:</strong> Never open energized electrical enclosures, touch bare DC/AC conductors, or bypass rapid-shutdown interlocks. Check ANY hazardous condition observed below.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAFETY_HAZARD_CHECKS.map((item) => {
                const checked = wizardDraft.safetyFlags.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px]"
                    style={{
                      backgroundColor: checked ? TOKENS.mossRaised : TOKENS.ink,
                      borderColor: checked ? TOKENS.terracotta : TOKENS.hairline,
                      color: checked ? TOKENS.bone : TOKENS.sage,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSafetyFlag(item.id)}
                      className="w-4 h-4 mt-0.5"
                      style={{ accentColor: TOKENS.terracotta }}
                    />
                    <div>
                      <div className="text-sm font-medium" style={{ color: TOKENS.bone }}>
                        {item.label}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                        {item.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {safetyEval.stopWork ? (
              <div
                role="alert"
                className="p-4 rounded-xl border space-y-2"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.terracotta }}
              >
                <div className="flex items-center gap-2 text-sm font-bold" style={{ color: TOKENS.terracotta }}>
                  <ShieldAlert className="w-5 h-5" />
                  IMMEDIATE STOP-WORK SAFETY HOLD ACTIVE
                </div>
                <p className="text-xs leading-relaxed" style={{ color: TOKENS.bone }}>
                  {safetyEval.stopWorkReason}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs" style={{ color: TOKENS.mint }}>
                <CheckCircle2 className="w-4 h-4" />
                No immediate emergency site hazards flagged. Non-invasive diagnostic screening cleared.
              </div>
            )}
          </div>
        )}

        {step === 8 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                8. Prepare AI Runtime & Submit Diagnosis
              </h2>
              <p className="text-xs mt-0.5" style={{ color: TOKENS.sage }}>
                Firebase AI Logic hybrid inference runs on-device first (PREFER_ON_DEVICE), falls back to Gemini Cloud when connected, or uses cached deterministic rules when offline.
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}>
                <div style={{ color: TOKENS.sage }}>Asset & Component</div>
                <div className="font-medium mt-1" style={{ color: TOKENS.bone }}>{selectedAsset.name}</div>
                <div className="mt-0.5" style={{ color: TOKENS.brass }}>{wizardDraft.componentName}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}>
                <div style={{ color: TOKENS.sage }}>Fault & Symptoms</div>
                <div className="font-mono-tech mt-1" style={{ color: TOKENS.amberWarn }}>
                  {wizardDraft.faultCode || 'No code'}
                </div>
                <div className="mt-0.5" style={{ color: TOKENS.sage }}>
                  {wizardDraft.symptoms.join(', ') || 'None selected'}
                </div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}>
                <div style={{ color: TOKENS.sage }}>Safety Gate</div>
                <div
                  className="font-semibold mt-1"
                  style={{ color: safetyEval.stopWork ? TOKENS.terracotta : TOKENS.mint }}
                >
                  {safetyEval.stopWork ? 'STOP-WORK HOLD' : 'Cleared (Non-Invasive)'}
                </div>
                <div className="mt-0.5" style={{ color: TOKENS.sage }}>
                  {wizardDraft.readings.length} readings · {wizardDraft.imageEvidenceDataUrl ? '1 photo' : '0 photos'}
                </div>
              </div>
            </div>

            {/* Prepare On-Device AI Control */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold flex items-center gap-2" style={{ color: TOKENS.bone }}>
                    <Cpu className="w-4 h-4" style={{ color: TOKENS.brass }} />
                    On-Device Model Readiness ({deviceAvailability})
                  </div>
                  <p className="text-xs" style={{ color: TOKENS.sage }}>{deviceStatusDetail}</p>
                  {!browserSupport.supported && (
                    <p className="text-[11px]" style={{ color: TOKENS.amberWarn }}>{browserSupport.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={prepareOnDeviceAI}
                  disabled={deviceAvailability === 'downloading' || deviceAvailability === 'ready'}
                  className="px-3.5 py-2 rounded-lg border text-xs font-medium disabled:opacity-50 whitespace-nowrap shrink-0 min-h-[44px]"
                  style={{
                    backgroundColor: TOKENS.mossRaised,
                    borderColor: TOKENS.hairlineStrong,
                    color: TOKENS.brass,
                  }}
                >
                  {deviceAvailability === 'ready'
                    ? 'On-device AI Ready'
                    : deviceAvailability === 'downloading'
                      ? `Downloading ${downloadProgress}%`
                      : 'Prepare On-device AI'}
                </button>
              </div>

              {deviceAvailability === 'downloading' && (
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: TOKENS.moss }}>
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%`, backgroundColor: TOKENS.brass }}
                  />
                </div>
              )}
            </div>

            {submitError && (
              <div
                className="p-3 rounded-lg border text-xs"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.terracotta, color: TOKENS.terracotta }}
              >
                {submitError}
              </div>
            )}

            {lastAiWarning && (
              <div
                className="p-3 rounded-lg border text-xs"
                style={{ backgroundColor: TOKENS.brassSoft, borderColor: TOKENS.amberWarn, color: TOKENS.amberWarn }}
              >
                {lastAiWarning}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleRunDiagnosis(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 min-h-[44px]"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                <Cpu className="w-4 h-4" />
                {submitting ? 'Running Hybrid Assessment...' : 'Submit Hybrid Diagnosis'}
              </button>

              {effectiveOnline && !safetyEval.stopWork && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRunDiagnosis(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium disabled:opacity-60 min-h-[44px]"
                  style={{
                    backgroundColor: TOKENS.mossRaised,
                    borderColor: TOKENS.sky,
                    color: TOKENS.sky,
                  }}
                >
                  <Cloud className="w-4 h-4" />
                  Force Cloud Gemini Analysis
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm disabled:opacity-40 min-h-[44px]"
          style={{
            backgroundColor: TOKENS.moss,
            borderColor: TOKENS.hairlineStrong,
            color: TOKENS.bone,
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        {step < STEPS.length && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium min-h-[44px]"
            style={{
              backgroundColor: TOKENS.mossRaised,
              borderColor: TOKENS.brass,
              color: TOKENS.brass,
            }}
          >
            Next Step
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
