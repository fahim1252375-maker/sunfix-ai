import React, { useMemo, useState } from 'react';
import { BookOpen, Cloud, ExternalLink, FileUp, Search, ShieldAlert, X } from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { analyzePdfManualCloudOnly } from '../services/hybridAI';
import { TOKENS } from '../theme/tokens';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'inverter', label: 'Inverters' },
  { id: 'solar_panel', label: 'PV Panels' },
  { id: 'battery', label: 'Battery Storage' },
  { id: 'grid_connection', label: 'Grid & Telemetry' },
  { id: 'safety', label: 'Safety & LOTO' },
];

export const KnowledgeLibraryView: React.FC = () => {
  const { knowledgeDocs, addKnowledgeSource, effectiveOnline } = useSunFix();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);

  const [pdfFileName, setPdfFileName] = useState('');
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftPublisher, setDraftPublisher] = useState('');
  const [draftCategory, setDraftCategory] = useState<
    'inverter' | 'solar_panel' | 'battery' | 'grid_connection' | 'safety'
  >('inverter');
  const [draftFaultCode, setDraftFaultCode] = useState('');
  const [draftGuidance, setDraftGuidance] = useState('');
  const [draftSafety, setDraftSafety] = useState(
    'Follow manufacturer LOTO and qualified electrical personnel procedures.',
  );
  const [draftSection, setDraftSection] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return knowledgeDocs.filter((doc) => {
      const catOk = category === 'all' || doc.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        (doc.faultCode || '').toLowerCase().includes(q) ||
        doc.guidance.toLowerCase().includes(q) ||
        doc.symptoms.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [category, knowledgeDocs, query]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    setPdfError(null);
    setAnalyzingPdf(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = String(reader.result || '');
        const base64 = result.split(',')[1] || '';
        const res = await analyzePdfManualCloudOnly({
          fileName: file.name,
          base64Pdf: base64,
        });
        if (!res.ok || !res.extracted) {
          setPdfError(res.error || 'Cloud PDF extraction unavailable. Enter details manually below.');
          setDraftTitle(file.name.replace(/\.pdf$/i, ''));
        } else {
          setDraftTitle(res.extracted.title);
          setDraftPublisher(res.extracted.publisher);
          setDraftCategory(res.extracted.category);
          setDraftFaultCode(res.extracted.faultCode);
          setDraftGuidance(res.extracted.guidance);
          setDraftSafety(res.extracted.safetyNotice);
          setDraftSection(res.extracted.sectionRef);
        }
      } catch (err) {
        setPdfError(err instanceof Error ? err.message : 'PDF processing failed.');
      } finally {
        setAnalyzingPdf(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftGuidance.trim()) return;
    addKnowledgeSource({
      title: draftTitle.trim(),
      publisher: draftPublisher.trim() || 'User Imported Reference',
      category: draftCategory,
      faultCode: draftFaultCode.trim() || undefined,
      symptoms: [],
      guidance: draftGuidance.trim(),
      safetyNotice: draftSafety.trim(),
      documentUrl: 'https://standards.ieee.org/ieee/1547/5915/',
      sectionRef: draftSection.trim() || 'Imported Manual Excerpt',
      verifiedDate: new Date().toISOString().slice(0, 10),
    });
    setShowImportModal(false);
    setDraftTitle('');
    setDraftGuidance('');
    setPdfFileName('');
  };

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Offline Cached Reference Pack
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            Verified solar <em className="italic" style={{ color: TOKENS.brass }}>knowledge</em> library
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Pre-cached offline demonstration reference pack + user-imported technical manuals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
        >
          <FileUp className="w-4 h-4" />
          Import Technical Reference / PDF
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TOKENS.sage }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fault code (G04-UV, BMS-12), symptom, or guidance..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className="px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap"
              style={{
                backgroundColor: category === cat.id ? TOKENS.mossRaised : TOKENS.moss,
                borderColor: category === cat.id ? TOKENS.brass : TOKENS.hairline,
                color: category === cat.id ? TOKENS.brass : TOKENS.sage,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <section className="lg:col-span-2 rounded-xl border p-6 sm:p-8 space-y-3" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <div className="font-mono-tech text-xs uppercase tracking-wider" style={{ color: TOKENS.brass }}>Reference library</div>
            <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
              {knowledgeDocs.length === 0 ? 'No technical references added yet' : 'No references match this search'}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              {knowledgeDocs.length === 0
                ? 'Import a manufacturer manual or add a verified reference before using it to support a diagnosis. SunFix does not invent manuals or claim unverified sources.'
                : 'Try another fault code, symptom, or category, or add a technical reference to your library.'}
            </p>
            <button type="button" onClick={() => setShowImportModal(true)} className="min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}>
              Import Technical Reference
            </button>
          </section>
        )}
        {filtered.map((doc) => (
          <article
            key={doc.id}
            className="border rounded-xl p-5 flex flex-col justify-between gap-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                  {doc.category} {doc.faultCode ? `· ${doc.faultCode}` : ''}
                </span>
                <span className="font-mono-tech" style={{ color: TOKENS.sage }}>
                  {doc.isDemoPack ? 'Demo Pack (Offline Cached)' : 'User Imported'}
                </span>
              </div>

              <h2 className="font-display text-lg flex items-start gap-2" style={{ color: TOKENS.bone }}>
                <BookOpen className="w-4 h-4 shrink-0 mt-1" style={{ color: TOKENS.brass }} />
                <span>{doc.title}</span>
              </h2>

              <p className="text-xs leading-relaxed" style={{ color: TOKENS.bone }}>
                {doc.guidance}
              </p>

              <div
                className="p-3 rounded-lg border flex items-start gap-2 text-xs"
                style={{
                  backgroundColor: TOKENS.mossDeep,
                  borderColor: TOKENS.terracotta,
                  color: TOKENS.bone,
                }}
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOKENS.terracotta }} />
                <span>{doc.safetyNotice}</span>
              </div>
            </div>

            <div
              className="pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]"
              style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}
            >
              <span>
                {doc.publisher} · {doc.sectionRef} · Verified {doc.verifiedDate}
              </span>
              <a
                href={doc.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
                style={{ color: TOKENS.brass }}
              >
                Reference
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            className="w-full max-w-lg border rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl" style={{ color: TOKENS.bone }}>
                Import Technical Reference
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: TOKENS.ink, color: TOKENS.sage }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-3 rounded-lg border text-xs space-y-2"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.sky, color: TOKENS.bone }}
            >
              <div className="flex items-center gap-2 font-semibold" style={{ color: TOKENS.sky }}>
                <Cloud className="w-4 h-4" />
                Cloud-Only Multimodal PDF Extraction (InferenceMode.ONLY_IN_CLOUD)
              </div>
              <p style={{ color: TOKENS.sage }}>
                {effectiveOnline
                  ? 'Upload an OEM service bulletin PDF to extract fault codes and safety rules via Gemini Cloud, or fill in fields manually offline.'
                  : 'Device is offline. Cloud PDF extraction is unavailable; enter reference fields manually for offline IndexedDB storage.'}
              </p>
              {effectiveOnline && (
                <label
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong }}
                >
                  <FileUp className="w-3.5 h-3.5" style={{ color: TOKENS.sky }} />
                  <span>{analyzingPdf ? 'Analyzing PDF in Cloud...' : pdfFileName || 'Choose PDF Manual'}</span>
                  <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                </label>
              )}
              {pdfError && <div style={{ color: TOKENS.amberWarn }}>{pdfError}</div>}
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Title *</label>
                <input
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ color: TOKENS.sage }}>Category</label>
                  <select
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value as typeof draftCategory)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                  >
                    <option value="inverter">Inverter</option>
                    <option value="solar_panel">Solar Panel</option>
                    <option value="battery">Battery</option>
                    <option value="grid_connection">Grid Connection</option>
                    <option value="safety">Safety</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1" style={{ color: TOKENS.sage }}>Fault Code</label>
                  <input
                    value={draftFaultCode}
                    onChange={(e) => setDraftFaultCode(e.target.value)}
                    placeholder="e.g. G04-UV"
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono-tech"
                    style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Technical Guidance *</label>
                <textarea
                  required
                  rows={3}
                  value={draftGuidance}
                  onChange={(e) => setDraftGuidance(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Safety Notice</label>
                <input
                  value={draftSafety}
                  onChange={(e) => setDraftSafety(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
                >
                  Save to Offline Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
