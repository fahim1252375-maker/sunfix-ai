import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  BookOpen,
  Bot,
  Download,
  Eye,
  FileText,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { CopilotMessageCard } from '../components/CopilotMessageCard';
import { useSunFix } from '../context/SunFixContext';
import { t } from '../i18n/translations';
import { TOKENS } from '../theme/tokens';
import type { KnowledgeSource } from '../types/sunfix';
import {
  buildCopilotPrompt,
  buildCopilotStarters,
  retrieveRelevantKnowledge,
  routeCopilotIntent,
} from '../utils/copilotLogic';

export const CopilotView: React.FC = () => {
  const {
    assets,
    cases,
    selectedAssetId,
    selectedTwinComponentId,
    activeCaseId,
    knowledgeDocs,
    deviceAvailability,
    effectiveOnline,
    language,
    copilotIncludeContext,
    setCopilotIncludeContext,
    copilotThreads,
    activeCopilotThreadId,
    setActiveCopilotThreadId,
    copilotBusy,
    copilotStreamingText,
    createCopilotThread,
    sendCopilotMessage,
    rateCopilotMessage,
    executeCopilotAction,
    navigate,
  } = useSunFix();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'cloud_chat' | 'on_device_single'>('cloud_chat');
  const [inspectPayload, setInspectPayload] = useState(false);
  const [focusedDoc, setFocusedDoc] = useState<KnowledgeSource | null>(null);

  const activeThread =
    copilotThreads.find((th) => th.id === activeCopilotThreadId) || copilotThreads[0];
  const activeAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];
  const openCase = cases.find((c) => c.id === activeCaseId);
  const compLabel =
    activeAsset?.components.find((c) => c.twinId === selectedTwinComponentId)?.name ||
    selectedTwinComponentId;

  const starters = useMemo(
    () =>
      buildCopilotStarters({
        asset: activeAsset,
        componentId: selectedTwinComponentId,
        activeCase: openCase,
        language,
      }),
    [activeAsset, language, openCase, selectedTwinComponentId],
  );

  const relevantDocs = useMemo(() => {
    const lastUser = [...(activeThread?.messages || [])].reverse().find((m) => m.role === 'user');
    return retrieveRelevantKnowledge(
      input.trim() || lastUser?.text || openCase?.faultCode || selectedTwinComponentId,
      knowledgeDocs,
      selectedTwinComponentId,
      openCase?.faultCode,
      5,
    );
  }, [activeThread?.messages, input, knowledgeDocs, openCase?.faultCode, selectedTwinComponentId]);

  const previewPromptText = useMemo(() => {
    const sampleQuestion = input.trim() || '(Your next question will appear here)';
    return buildCopilotPrompt({
      userMessage: sampleQuestion,
      context: {
        includeContext: copilotIncludeContext,
        assetId: activeAsset?.id,
        assetName: activeAsset?.name,
        componentId: selectedTwinComponentId,
        componentLabel: compLabel,
        openCaseId: openCase?.id,
        openCaseTitle: openCase?.title,
        faultCode: openCase?.faultCode,
        readingsSummary: openCase?.readings.map((r) => `${r.label}: ${r.value} ${r.unit}`).join('; '),
        language,
      },
      retrievedDocs: relevantDocs,
      intent: routeCopilotIntent(sampleQuestion),
    });
  }, [
    activeAsset,
    compLabel,
    copilotIncludeContext,
    input,
    language,
    openCase,
    relevantDocs,
    selectedTwinComponentId,
  ]);

  const handleSend = async (textOverride?: string) => {
    const q = (textOverride ?? input).trim();
    if (!q || copilotBusy) return;
    if (!textOverride) setInput('');
    await sendCopilotMessage(q, mode);
  };

  const exportMarkdown = () => {
    if (!activeThread) return;
    const lines: string[] = [
      `# SunFix Copilot Thread: ${activeThread.title}`,
      `Generated: ${new Date().toISOString()}`,
      `Asset Context: ${activeAsset?.name || 'None'} (${selectedTwinComponentId})`,
      '',
    ];
    for (const m of activeThread.messages) {
      lines.push(`## ${m.role === 'user' ? 'Technician' : `Copilot (${m.inferenceSource || 'demo_rules'})`}`);
      lines.push(m.text);
      if (m.citedSourceIds?.length) {
        lines.push(`Citations: ${m.citedSourceIds.map((id) => `[${id}]`).join(', ')}`);
      }
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeThread.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!activeThread) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 46;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`SunFix Copilot Thread — ${activeThread.title}`, 40, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Exported ${new Date().toLocaleString()} · Safety Guidance Only`, 40, y);
    y += 22;

    for (const m of activeThread.messages) {
      if (y > 760) {
        doc.addPage();
        y = 46;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const roleLabel =
        m.role === 'user' ? 'Technician' : `Copilot [${(m.inferenceSource || 'demo_rules').toUpperCase()}]`;
      doc.text(roleLabel, 40, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const wrapped = doc.splitTextToSize(m.text, 515);
      for (const line of wrapped) {
        if (y > 780) {
          doc.addPage();
          y = 46;
        }
        doc.text(line, 40, y);
        y += 13;
      }
      y += 10;
    }
    doc.save(`${activeThread.id}.pdf`);
  };

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Grounded Hybrid AI Assistant · /copilot
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            SunFix <em className="italic" style={{ color: TOKENS.brass }}>Copilot</em> workspace
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Cloud multi-turn sessions via Firebase AI Logic, single-shot on-device quick triage, and zero-bypass safety holds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportMarkdown}
            disabled={!activeThread?.messages.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium disabled:opacity-40"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Markdown
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={!activeThread?.messages.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium disabled:opacity-40"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Conversation List */}
        <aside
          className="lg:col-span-3 rounded-xl border p-3.5 space-y-3"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
              Threads ({copilotThreads.length})
            </span>
            <button
              type="button"
              onClick={() => createCopilotThread()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Thread
            </button>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {copilotThreads.map((th) => {
              const active = th.id === activeThread?.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setActiveCopilotThreadId(th.id)}
                  className="w-full text-left p-2.5 rounded-lg border text-xs space-y-1 transition-colors"
                  style={{
                    backgroundColor: active ? TOKENS.mossRaised : TOKENS.ink,
                    borderColor: active ? TOKENS.brass : TOKENS.hairline,
                  }}
                >
                  <div className="font-medium line-clamp-1" style={{ color: TOKENS.bone }}>
                    {th.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-tech" style={{ color: TOKENS.sage }}>
                    <span>{th.messages.length} msgs</span>
                    <span>{new Date(th.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center: Message Thread */}
        <section
          className="lg:col-span-6 rounded-xl border flex flex-col min-h-[560px]"
          style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong }}
        >
          {/* Context & Mode Bar */}
          <div
            className="p-3.5 border-b space-y-2.5 text-xs"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('cloud_chat')}
                  className="px-2.5 py-1 rounded border text-[11px] font-medium"
                  style={{
                    backgroundColor: mode === 'cloud_chat' ? TOKENS.brass : TOKENS.ink,
                    borderColor: mode === 'cloud_chat' ? TOKENS.brass : TOKENS.hairlineStrong,
                    color: mode === 'cloud_chat' ? TOKENS.ink : TOKENS.sage,
                  }}
                >
                  {t(language, 'copilot.cloudChat')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('on_device_single')}
                  className="px-2.5 py-1 rounded border text-[11px] font-medium"
                  style={{
                    backgroundColor: mode === 'on_device_single' ? TOKENS.brass : TOKENS.ink,
                    borderColor: mode === 'on_device_single' ? TOKENS.brass : TOKENS.hairlineStrong,
                    color: mode === 'on_device_single' ? TOKENS.ink : TOKENS.sage,
                  }}
                >
                  {t(language, 'copilot.quickTriage')}
                </button>
              </div>
              <span className="font-mono-tech text-[10px]" style={{ color: TOKENS.sage }}>
                {mode === 'cloud_chat'
                  ? effectiveOnline
                    ? 'Multi-turn cloud chat'
                    : 'Offline fallback'
                  : deviceAvailability === 'ready'
                    ? 'Single-shot Nano ready'
                    : 'On-device fallback'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="truncate" style={{ color: TOKENS.bone }}>
                <strong className="font-mono-tech text-[10px] uppercase mr-1.5" style={{ color: TOKENS.brass }}>
                  {t(language, 'copilot.contextBar')}:
                </strong>
                {copilotIncludeContext
                  ? `${activeAsset?.name?.replace(' [DEMO]', '')} · ${selectedTwinComponentId}${openCase?.faultCode ? ` · ${openCase.faultCode}` : ''}`
                  : 'Detached by user'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setInspectPayload((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono-tech hover:underline"
                  style={{ color: TOKENS.sky }}
                >
                  <Eye className="w-3 h-3" />
                  {inspectPayload ? 'Hide Prompt' : 'Inspect Prompt'}
                </button>
                <button
                  type="button"
                  onClick={() => setCopilotIncludeContext((v) => !v)}
                  className="text-[10px] font-mono-tech hover:underline"
                  style={{ color: TOKENS.brass }}
                >
                  {copilotIncludeContext
                    ? t(language, 'copilot.removeContext')
                    : t(language, 'copilot.restoreContext')}
                </button>
              </div>
            </div>

            {inspectPayload && (
              <pre
                className="text-[10px] font-mono-tech p-2.5 rounded border max-h-36 overflow-auto whitespace-pre-wrap"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline, color: TOKENS.sage }}
              >
                {previewPromptText}
              </pre>
            )}
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[520px]">
            {(!activeThread || activeThread.messages.length === 0) && (
              <div className="space-y-3">
                <div
                  className="rounded-xl border p-4 text-xs space-y-1.5"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
                >
                  <div className="flex items-center gap-1.5 font-medium" style={{ color: TOKENS.brass }}>
                    <Sparkles className="w-4 h-4" />
                    Ask SunFix Copilot
                  </div>
                  <p style={{ color: TOKENS.sage }}>
                    Try one of these site-aware prompts or describe fault codes, FieldProof symptoms, or 3D subsystems below.
                  </p>
                </div>
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="w-full text-left rounded-lg border p-3 text-xs hover:opacity-90"
                    style={{
                      backgroundColor: TOKENS.mossRaised,
                      borderColor: TOKENS.hairlineStrong,
                      color: TOKENS.bone,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {activeThread?.messages.map((msg) => (
              <CopilotMessageCard
                key={msg.id}
                message={msg}
                knowledgeDocs={knowledgeDocs}
                language={language}
                onExecuteAction={executeCopilotAction}
                onOpenSource={(doc) => setFocusedDoc(doc)}
                onRateFeedback={(mid, fb) => rateCopilotMessage(activeThread.id, mid, fb)}
              />
            ))}

            {copilotBusy && (
              <div
                className="rounded-xl border p-3.5 text-xs space-y-1"
                style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.brass }}
              >
                <div className="font-mono-tech uppercase text-[10px]" style={{ color: TOKENS.brass }}>
                  Generating grounded field response...
                </div>
                {copilotStreamingText && (
                  <p className="text-sm whitespace-pre-wrap" style={{ color: TOKENS.bone }}>
                    {copilotStreamingText}
                  </p>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3.5 border-t flex items-center gap-2"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <Bot className="w-4 h-4 shrink-0" style={{ color: TOKENS.brass }} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t(language, 'copilot.placeholder')}
              aria-label="Message SunFix Copilot"
              className="flex-1 rounded-lg border px-3 py-2 text-xs min-w-0"
              style={{
                backgroundColor: TOKENS.ink,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            />
            <button
              type="submit"
              disabled={copilotBusy || !input.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              <Send className="w-3.5 h-3.5" />
              {t(language, 'copilot.send')}
            </button>
          </form>
        </section>

        {/* Right: Retrieved Knowledge Sources & Citation Inspector */}
        <aside
          className="lg:col-span-3 rounded-xl border p-4 space-y-3"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
              Sources Panel ({relevantDocs.length})
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

          <div className="space-y-2">
            {relevantDocs.map((doc) => {
              const selected = focusedDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setFocusedDoc(doc)}
                  className="w-full text-left p-2.5 rounded-lg border text-xs space-y-1 transition-colors"
                  style={{
                    backgroundColor: selected ? TOKENS.mossRaised : TOKENS.ink,
                    borderColor: selected ? TOKENS.brass : TOKENS.hairline,
                  }}
                >
                  <div className="flex items-center gap-1.5 font-mono-tech text-[10px]" style={{ color: TOKENS.brass }}>
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span>[{doc.id}]</span>
                    {doc.faultCode && <span>· {doc.faultCode}</span>}
                  </div>
                  <div className="font-medium" style={{ color: TOKENS.bone }}>
                    {doc.title}
                  </div>
                  <div className="text-[11px] line-clamp-2" style={{ color: TOKENS.sage }}>
                    {doc.guidance}
                  </div>
                </button>
              );
            })}
          </div>

          {focusedDoc && (
            <div
              className="p-3 rounded-lg border text-xs space-y-1.5"
              style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.brass }}
            >
              <div className="font-mono-tech text-[10px]" style={{ color: TOKENS.brass }}>
                {focusedDoc.sectionRef}
              </div>
              <div className="font-semibold" style={{ color: TOKENS.bone }}>
                {focusedDoc.title}
              </div>
              <p style={{ color: TOKENS.sage }}>{focusedDoc.guidance}</p>
              <div className="text-[11px]" style={{ color: TOKENS.amberWarn }}>
                Safety: {focusedDoc.safetyNotice}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
