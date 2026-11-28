import React, { useState } from 'react';
import { Download, FileText, Printer, ShieldAlert } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';

export const ReportsView: React.FC = () => {
  const {
    reports,
    activeReportId,
    setActiveReportId,
    cases,
    assets,
    workOrders,
    evidence,
    knowledgeDocs,
    generateServiceReport,
    navigate,
  } = useSunFix();

  const [selectedCaseForNew, setSelectedCaseForNew] = useState(cases[0]?.id || '');
  const [impactInput, setImpactInput] = useState('183.6');
  const [outstandingInput, setOutstandingInput] = useState('');

  const activeReport = reports.find((r) => r.id === activeReportId) || reports[0];
  const linkedCase = cases.find((c) => c.id === activeReport?.caseId) || cases[0];
  const linkedAsset = assets.find((a) => a.id === activeReport?.assetId) || assets[0];
  const linkedWo = workOrders.find(
    (w) => w.id === activeReport?.workOrderId || w.caseId === linkedCase?.id,
  );
  const linkedEvidence = evidence.filter(
    (e) => e.caseId === linkedCase?.id || (linkedWo && e.workOrderId === linkedWo.id),
  );
  const citedSources = knowledgeDocs.filter((d) =>
    (activeReport?.sourceIds || linkedCase?.assessment.sourceIds || []).includes(d.id),
  );

  const handleDownloadPdf = () => {
    if (!activeReport) return;
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    let y = 48;
    const addLine = (text: string, size = 10, bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(size);
      const wrapped = pdf.splitTextToSize(text, 510);
      pdf.text(wrapped, 48, y);
      y += wrapped.length * (size + 4) + 4;
      if (y > 730) {
        pdf.addPage();
        y = 48;
      }
    };

    addLine('SUNFIX FIELD — FIELDPROOF SERVICE REPORT', 15, true);
    addLine(`Report ID: ${activeReport.reportCode} | Generated: ${new Date(activeReport.createdAt).toLocaleString()}`, 10);
    addLine(`Status: ${activeReport.status.toUpperCase()} | Simulated/Demo Data: ${activeReport.isSimulated ? 'YES (DEMO)' : 'NO'}`, 10);
    y += 6;
    addLine(`Asset: ${linkedAsset?.name || 'N/A'} (${linkedAsset?.locationLabel || ''})`, 11, true);
    addLine(`Component: ${linkedCase?.componentName || 'N/A'} | Fault Code: ${linkedCase?.faultCode || 'None'}`, 10);
    addLine(`AI Runtime Source: ${linkedCase?.inferenceRecord.inferenceSource || 'demo_rules'} (${linkedCase?.inferenceRecord.modelName || 'N/A'})`, 10);
    y += 6;
    addLine('Diagnostic Summary', 12, true);
    addLine(activeReport.summary, 10);
    y += 4;
    addLine('Safety Gate Findings', 12, true);
    addLine(
      linkedCase?.stopWork
        ? `STOP-WORK HOLD: ${linkedCase.stopWorkReason}`
        : 'Pre-work safety hazard screening cleared for non-invasive inspection.',
      10,
    );
    y += 4;
    addLine('Repair Steps & Verification', 12, true);
    (linkedWo?.tasks || []).forEach((t, idx) => {
      addLine(`${idx + 1}. [${t.status.toUpperCase()}] ${t.title}`, 10);
    });
    y += 4;
    addLine(
      `Estimated Energy Impact: ${activeReport.estimatedImpactKwh !== undefined ? `${activeReport.estimatedImpactKwh} kWh (calculated estimate, not measured loss)` : 'Not attached'}`,
      10,
    );
    addLine(`Outstanding Issues: ${activeReport.outstandingIssues}`, 10);
    y += 4;
    addLine(
      'Notice: Unverified assumptions and demonstration telemetry are explicitly marked. All field repairs must comply with local electrical codes and LOTO.',
      9,
    );
    pdf.save(`${activeReport.reportCode}-sunfix-fieldproof.pdf`);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: TOKENS.mossDeep,
    borderColor: TOKENS.hairlineStrong,
    color: TOKENS.bone,
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            className="text-[11px] font-mono-tech uppercase tracking-[0.18em] mb-1"
            style={{ color: TOKENS.sage }}
          >
            Audit-Ready Provenance Record
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold" style={{ color: TOKENS.bone }}>
            Verifiable FieldProof <em className="italic font-normal" style={{ color: TOKENS.brass }}>Reports</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Printable 17-section report builder with client-side PDF export and provenance disclosure.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-colors"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            <Printer className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Print Report
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: TOKENS.brass, color: TOKENS.mossDeep }}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {cases.length === 0 && (
        <section className="rounded-xl border p-6 sm:p-8 space-y-3" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}>
          <div className="font-mono-tech text-xs uppercase tracking-wider" style={{ color: TOKENS.brass }}>Report workflow · Waiting for a case</div>
          <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>Create your first diagnostic record first</h2>
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
            Service reports are generated from a saved diagnostic case. Run an inspection for one of your installations; you can return here to create and export its FieldProof report.
          </p>
          <button type="button" onClick={() => navigate('diagnostics')} className="min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}>
            Start an AI diagnosis
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Report History + Quick Generator */}
        <aside className="no-print lg:col-span-4 space-y-4">
          <div
            className="border rounded-xl p-4 space-y-3 text-xs"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <h2 className="font-display text-sm font-semibold" style={{ color: TOKENS.bone }}>
              Create New Service Report
            </h2>
            <div>
              <label htmlFor="report-case-select" className="block mb-1" style={{ color: TOKENS.sage }}>
                Diagnostic Case
              </label>
              <select
                id="report-case-select"
                value={selectedCaseForNew}
                onChange={(e) => setSelectedCaseForNew(e.target.value)}
                className="w-full min-h-[42px] rounded-lg border px-3 py-2 text-xs"
                style={inputStyle}
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="report-impact-input" className="block mb-1" style={{ color: TOKENS.sage }}>
                Estimated Impact (kWh, optional)
              </label>
              <input
                id="report-impact-input"
                type="number"
                step="0.1"
                value={impactInput}
                onChange={(e) => setImpactInput(e.target.value)}
                className="w-full min-h-[42px] rounded-lg border px-3 py-2 text-xs font-mono-tech tabular-nums"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="report-outstanding-input" className="block mb-1" style={{ color: TOKENS.sage }}>
                Outstanding Issues
              </label>
              <input
                id="report-outstanding-input"
                value={outstandingInput}
                onChange={(e) => setOutstandingInput(e.target.value)}
                placeholder="e.g. Awaiting utility phase check"
                className="w-full min-h-[42px] rounded-lg border px-3 py-2 text-xs"
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              disabled={cases.length === 0}
              onClick={() =>
                generateServiceReport({
                  caseId: selectedCaseForNew,
                  estimatedImpactKwh: impactInput ? Number(impactInput) : undefined,
                  outstandingIssues: outstandingInput || 'None recorded.',
                })
              }
              className="w-full min-h-[44px] py-2 rounded-lg border text-xs font-semibold transition-colors"
              style={{
                backgroundColor: TOKENS.brassSoft,
                borderColor: TOKENS.brass,
                color: TOKENS.brass,
              }}
            >
              Generate FieldProof Report
            </button>
          </div>

          <div className="space-y-2">
            <div
              className="text-xs font-mono-tech font-semibold uppercase tracking-wider"
              style={{ color: TOKENS.sage }}
            >
              Saved Reports ({reports.length})
            </div>
            {reports.map((rep) => {
              const isSelected = rep.id === activeReport?.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setActiveReportId(rep.id)}
                  className="w-full text-left p-3.5 rounded-xl border transition-colors space-y-1"
                  style={{
                    backgroundColor: isSelected ? TOKENS.mossRaised : TOKENS.moss,
                    borderColor: isSelected ? TOKENS.brass : TOKENS.hairline,
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-mono-tech tabular-nums">
                    <span style={{ color: TOKENS.brass }}>{rep.reportCode}</span>
                    <span className="uppercase" style={{ color: TOKENS.mint }}>
                      {rep.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: TOKENS.bone }}>{rep.title}</div>
                  <div className="text-[11px] font-mono-tech tabular-nums" style={{ color: TOKENS.sage }}>
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Complete 17-Section Printable Report Sheet */}
        {activeReport && (
          <article
            className="lg:col-span-8 print-report border rounded-xl p-6 sm:p-8 space-y-6 text-sm"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline, color: TOKENS.bone }}
          >
            {/* 1-3: Branding, Report ID & Timestamp, Technician/Site */}
            <header
              className="pb-5 border-b flex flex-wrap items-start justify-between gap-4"
              style={{ borderColor: TOKENS.hairline }}
            >
              <div>
                <div className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
                  SunFix Field · FieldProof Verification Record
                </div>
                <h2 className="font-display text-xl font-semibold mt-1 flex items-center gap-2" style={{ color: TOKENS.bone }}>
                  <FileText className="w-5 h-5" style={{ color: TOKENS.brass }} />
                  {activeReport.title}
                </h2>
              </div>
              <div className="text-right text-xs font-mono-tech tabular-nums space-y-0.5" style={{ color: TOKENS.sage }}>
                <div style={{ color: TOKENS.bone }}>ID: {activeReport.reportCode}</div>
                <div>Generated: {new Date(activeReport.createdAt).toLocaleString()}</div>
                <div>Status: {activeReport.status.toUpperCase()}</div>
              </div>
            </header>

            {/* 4-5: Asset & Component Metadata */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div
                className="p-3.5 rounded-lg border space-y-1"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
              >
                <div className="uppercase font-mono-tech" style={{ color: TOKENS.sage }}>Asset Details</div>
                <div className="font-semibold text-sm" style={{ color: TOKENS.bone }}>{linkedAsset?.name}</div>
                <div style={{ color: TOKENS.sage }}>{linkedAsset?.locationLabel}</div>
                <div className="font-mono-tech tabular-nums" style={{ color: TOKENS.bone }}>
                  Capacity: {linkedAsset?.capacityKw} kW · {linkedAsset?.inverterModel}
                </div>
              </div>
              <div
                className="p-3.5 rounded-lg border space-y-1"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
              >
                <div className="uppercase font-mono-tech" style={{ color: TOKENS.sage }}>Affected Component & AI Mode</div>
                <div className="font-semibold text-sm" style={{ color: TOKENS.bone }}>
                  {linkedCase?.componentName || 'System Wide'}
                </div>
                <div style={{ color: TOKENS.sage }}>Fault Code: {linkedCase?.faultCode || 'None'}</div>
                <div className="font-mono-tech" style={{ color: TOKENS.bone }}>
                  Inference Source: {linkedCase?.inferenceRecord.inferenceSource || 'demo_rules'} (
                  {linkedCase?.inferenceRecord.modelName || 'N/A'})
                </div>
              </div>
            </section>

            {/* 6-7: Reported Symptoms & Diagnostic Summary */}
            <section className="space-y-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider" style={{ color: TOKENS.brass }}>
                Reported Symptoms & Diagnostic Summary
              </h3>
              <div className="text-xs" style={{ color: TOKENS.sage }}>
                Symptoms: {linkedCase?.symptoms.join(', ') || 'Preventive / general verification'}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: TOKENS.bone }}>{activeReport.summary}</p>
            </section>

            {/* 8-9: Safety Gate Findings & Readings */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="p-4 rounded-lg border space-y-1.5 text-xs"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
              >
                <div
                  className="font-semibold flex items-center gap-1.5"
                  style={{ color: linkedCase?.stopWork ? TOKENS.terracotta : TOKENS.brass }}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Safety Gate Findings
                </div>
                <p style={{ color: TOKENS.sage }}>
                  {linkedCase?.stopWork
                    ? linkedCase.stopWorkReason
                    : 'Pre-work safety screening cleared. No smoke, arcing, moisture ingress, or exposed conductors reported.'}
                </p>
              </div>
              <div
                className="p-4 rounded-lg border space-y-1.5 text-xs"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
              >
                <div className="font-semibold" style={{ color: TOKENS.mint }}>Measurements & Readings</div>
                {(linkedCase?.readings || []).length === 0 ? (
                  <p style={{ color: TOKENS.sage }}>No telemetry readings recorded.</p>
                ) : (
                  <ul className="space-y-1 font-mono-tech tabular-nums" style={{ color: TOKENS.bone }}>
                    {linkedCase.readings.map((r, i) => (
                      <li key={i}>
                        {r.label}: {r.value} {r.unit}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* 10-12: Evidence & Before/After Photos */}
            <section className="space-y-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider" style={{ color: TOKENS.brass }}>
                FieldProof Evidence & Before/After Records ({linkedEvidence.length})
              </h3>
              {linkedEvidence.length === 0 ? (
                <p className="text-xs" style={{ color: TOKENS.sage }}>No FieldProof items linked to this report.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {linkedEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border space-y-1"
                      style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
                    >
                      <div className="font-mono-tech text-[11px] uppercase" style={{ color: TOKENS.brass }}>
                        {ev.evidenceType.replace('_', ' ')} · {ev.originKind.replace(/_/g, ' ')}
                      </div>
                      <div className="font-semibold" style={{ color: TOKENS.bone }}>{ev.caption}</div>
                      <div style={{ color: TOKENS.sage }}>{ev.note}</div>
                      {ev.imageDataUrl && (
                        <img
                          src={ev.imageDataUrl}
                          alt={ev.caption}
                          className="mt-2 max-h-32 rounded object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 13-14: Repair Actions & Energy Impact */}
            <section className="space-y-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider" style={{ color: TOKENS.brass }}>
                Repair Checklist & Verification Status
              </h3>
              <ul className="space-y-1.5 text-xs">
                {(linkedWo?.tasks || []).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 py-1.5 border-b"
                    style={{ borderColor: TOKENS.hairline }}
                  >
                    <span style={{ color: TOKENS.bone }}>{t.title}</span>
                    <span className="font-mono-tech uppercase" style={{ color: TOKENS.mint }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="text-xs pt-2" style={{ color: TOKENS.bone }}>
                <strong>Energy Impact Estimate:</strong>{' '}
                {activeReport.estimatedImpactKwh !== undefined
                  ? `${activeReport.estimatedImpactKwh} kWh (calculated estimate based on user inputs, not revenue-grade meter measurement)`
                  : 'Not calculated'}
              </div>
              <div className="text-xs" style={{ color: TOKENS.bone }}>
                <strong>Outstanding Issues:</strong> {activeReport.outstandingIssues}
              </div>
            </section>

            {/* 15-17: Sources & Explicit Demo/Unverified Disclosure */}
            <footer className="pt-4 border-t space-y-2 text-xs" style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}>
              <div>
                <strong style={{ color: TOKENS.bone }}>Cited Knowledge Sources:</strong>{' '}
                {citedSources.length > 0
                  ? citedSources.map((s) => `${s.title} (${s.sectionRef})`).join('; ')
                  : 'None cited directly'}
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: TOKENS.brassSoft,
                  borderColor: TOKENS.brass,
                  color: TOKENS.brass,
                }}
              >
                <strong>Explicit Provenance Notice:</strong>{' '}
                {activeReport.isSimulated
                  ? 'This report includes pre-populated demonstration asset telemetry and/or simulated demo records labelled [DEMO].'
                  : 'Generated from technician-supplied field records.'}{' '}
                All AI-assisted summaries require verification against physical site conditions by qualified electrical personnel.
              </div>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
};
