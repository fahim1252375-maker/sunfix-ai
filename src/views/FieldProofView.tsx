import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Filter, Plus } from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';
import type { EvidenceOriginKind, EvidenceType } from '../types/sunfix';

const ORIGIN_LABELS: Record<EvidenceOriginKind, { label: string; color: string }> = {
  original_evidence: { label: 'Original Field Evidence', color: TOKENS.mint },
  simulated_demo_evidence: { label: 'Simulated Demo Evidence', color: TOKENS.amberWarn },
  ai_explanatory_text: { label: 'AI Explanatory Note', color: TOKENS.sky },
};

export const FieldProofView: React.FC = () => {
  const { assets, cases, evidence, addEvidenceRecord } = useSunFix();
  const [originFilter, setOriginFilter] = useState<'all' | EvidenceOriginKind>('all');

  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [caseId, setCaseId] = useState(cases[0]?.id || '');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('before_photo');
  const [caption, setCaption] = useState('');
  const [note, setNote] = useState('');
  const [readingValue, setReadingValue] = useState('');
  const [readingUnit, setReadingUnit] = useState('kW');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [savedBanner, setSavedBanner] = useState(false);

  const selectedAsset = assets.find((a) => a.id === assetId) || assets[0];

  const filteredEvidence = useMemo(() => {
    return evidence.filter((e) => originFilter === 'all' || e.originKind === originFilter);
  }, [evidence, originFilter]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
        if (!caption) setCaption(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || !selectedAsset) return;
    const comp = selectedAsset.components[0];
    addEvidenceRecord({
      caseId: caseId || cases[0]?.id || 'case-unassigned',
      assetId: selectedAsset.id,
      componentId: comp?.id || 'comp-general',
      componentName: comp?.name || 'System Component',
      evidenceType,
      originKind: 'original_evidence',
      caption: caption.trim(),
      note: note.trim() || 'Recorded via FieldProof Evidence Center.',
      readingValue: readingValue.trim() || undefined,
      readingUnit: readingValue.trim() ? readingUnit.trim() : undefined,
      imageDataUrl,
    });
    setCaption('');
    setNote('');
    setReadingValue('');
    setImageDataUrl(undefined);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b" style={{ borderColor: TOKENS.hairline }}>
        <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
          Tamper-Transparent Audit Log
        </span>
        <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
          <em className="italic" style={{ color: TOKENS.brass }}>FieldProof</em> evidence center
        </h1>
        <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
          Capture before/after photographs, observed readings, and tamper-evident notes separating original field evidence from simulated demo items.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload / Capture Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 border rounded-xl p-5 space-y-4 h-fit"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-lg flex items-center gap-2" style={{ color: TOKENS.bone }}>
            <Plus className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Log New FieldProof Record
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block mb-1" style={{ color: TOKENS.sage }}>Solar Asset</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                >
                  <option value="before_photo">Before Photo</option>
                  <option value="after_photo">After Photo</option>
                  <option value="condition_photo">Condition Photo</option>
                  <option value="observed_reading">Observed Reading</option>
                  <option value="inspection_note">Inspection Note</option>
                  <option value="completion_evidence">Completion Evidence</option>
                </select>
              </div>
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Linked Case</label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1" style={{ color: TOKENS.sage }}>Caption *</label>
              <input
                required
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Post-repair inverter display showing 41.2 kW export"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Observed Value (optional)</label>
                <input
                  value={readingValue}
                  onChange={(e) => setReadingValue(e.target.value)}
                  placeholder="e.g. 240.4"
                  className="w-full rounded-lg border px-3 py-2 text-sm font-mono-tech"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Unit</label>
                <input
                  value={readingUnit}
                  onChange={(e) => setReadingUnit(e.target.value)}
                  placeholder="V, A, kW, °C"
                  className="w-full rounded-lg border px-3 py-2 text-sm font-mono-tech"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
            </div>

            <div>
              <label className="block mb-1" style={{ color: TOKENS.sage }}>Verification Note</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              />
            </div>

            <label
              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer"
              style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
            >
              <Camera className="w-4 h-4" style={{ color: TOKENS.brass }} />
              <span>{imageDataUrl ? 'Photo Attached (Click to Replace)' : 'Attach JPEG / PNG Photo'}</span>
              <input type="file" accept="image/png,image/jpeg" onChange={handlePhotoSelect} className="hidden" />
            </label>

            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Preview"
                className="max-h-36 rounded-lg border object-contain"
                style={{ borderColor: TOKENS.hairline }}
              />
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              Save Original Evidence Record
            </button>

            {savedBanner && (
              <div className="flex items-center gap-2 text-xs" style={{ color: TOKENS.mint }}>
                <CheckCircle2 className="w-4 h-4" />
                Saved to FieldProof archive & queued for offline-first sync.
              </div>
            )}
          </div>
        </form>

        {/* Evidence Gallery */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs flex items-center gap-2" style={{ color: TOKENS.sage }}>
              <Filter className="w-3.5 h-3.5" />
              Origin Filter:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'original_evidence', 'simulated_demo_evidence', 'ai_explanatory_text'] as const).map(
                (kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setOriginFilter(kind)}
                    className="px-2.5 py-1.5 rounded-lg border text-xs"
                    style={{
                      backgroundColor: originFilter === kind ? TOKENS.mossRaised : TOKENS.moss,
                      borderColor: originFilter === kind ? TOKENS.brass : TOKENS.hairline,
                      color: originFilter === kind ? TOKENS.brass : TOKENS.sage,
                    }}
                  >
                    {kind === 'all' ? 'All Records' : ORIGIN_LABELS[kind].label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredEvidence.map((ev) => {
              const originMeta = ORIGIN_LABELS[ev.originKind];
              return (
                <article
                  key={ev.id}
                  className="border rounded-xl p-4 space-y-2.5"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tech">
                    <span className="uppercase" style={{ color: TOKENS.brass }}>
                      {ev.evidenceType.replace('_', ' ')}
                    </span>
                    <span style={{ color: originMeta.color }}>{originMeta.label}</span>
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: TOKENS.bone }}>{ev.caption}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: TOKENS.sage }}>{ev.note}</p>
                  {ev.readingValue && (
                    <div className="font-mono-tech text-sm tabular-nums" style={{ color: TOKENS.brass }}>
                      {ev.readingValue} {ev.readingUnit}
                    </div>
                  )}
                  {ev.imageDataUrl && (
                    <img
                      src={ev.imageDataUrl}
                      alt={ev.caption}
                      className="w-full max-h-44 rounded-lg border object-cover"
                      style={{ borderColor: TOKENS.hairline }}
                    />
                  )}
                  <div
                    className="text-[11px] font-mono-tech pt-1 border-t"
                    style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}
                  >
                    {ev.componentName} · {new Date(ev.timestamp).toLocaleString()}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
