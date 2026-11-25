import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Eye,
  Maximize2,
  Mic,
  MicOff,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { t } from '../i18n/translations';
import { TOKENS } from '../theme/tokens';
import type { KnowledgeSource } from '../types/sunfix';
import { buildCopilotPrompt, buildCopilotStarters, retrieveRelevantKnowledge, routeCopilotIntent } from '../utils/copilotLogic';
import { CopilotMessageCard } from './CopilotMessageCard';

interface SpeechRecognitionCtor {
  new (): {
    lang: string;
    interimResults: boolean;
    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const CopilotDrawer: React.FC = () => {
  const {
    route,
    navigate,
    assets,
    cases,
    selectedAssetId,
    selectedTwinComponentId,
    activeCaseId,
    knowledgeDocs,
    deviceAvailability,
    effectiveOnline,
    language,
    copilotDrawerOpen,
    setCopilotDrawerOpen,
    copilotIncludeContext,
    setCopilotIncludeContext,
    copilotThreads,
    activeCopilotThreadId,
    copilotBusy,
    copilotStreamingText,
    createCopilotThread,
    sendCopilotMessage,
    rateCopilotMessage,
    executeCopilotAction,
  } = useSunFix();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'cloud_chat' | 'on_device_single'>('cloud_chat');
  const [inspectPayload, setInspectPayload] = useState(false);
  const [listening, setListening] = useState(false);
  const [selectedSourcePreview, setSelectedSourcePreview] = useState<KnowledgeSource | null>(null);

  const fabRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const speechCtor = useMemo(() => getSpeechRecognitionCtor(), []);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Preview exact prompt/context payload sent to the model
  const previewPromptText = useMemo(() => {
    const sampleQuestion = input.trim() || '(Your next question will appear here)';
    const intent = routeCopilotIntent(sampleQuestion);
    const docs = retrieveRelevantKnowledge(
      sampleQuestion,
      knowledgeDocs,
      selectedTwinComponentId,
      openCase?.faultCode,
      4,
    );
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
      retrievedDocs: docs,
      intent,
    });
  }, [
    activeAsset,
    compLabel,
    copilotIncludeContext,
    input,
    knowledgeDocs,
    language,
    openCase,
    selectedTwinComponentId,
  ]);

  // Global keyboard shortcut: Ctrl/Cmd+K toggles drawer, Escape closes and returns focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCopilotDrawerOpen((open) => !open);
      } else if (e.key === 'Escape' && copilotDrawerOpen) {
        e.preventDefault();
        setCopilotDrawerOpen(false);
        setTimeout(() => fabRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copilotDrawerOpen, setCopilotDrawerOpen]);

  useEffect(() => {
    if (copilotDrawerOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [copilotDrawerOpen]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [activeThread?.messages.length, copilotStreamingText, prefersReducedMotion]);

  if (route === 'copilot') {
    return null;
  }

  const handleSend = async (textOverride?: string) => {
    const q = (textOverride ?? input).trim();
    if (!q || copilotBusy) return;
    if (!textOverride) setInput('');
    await sendCopilotMessage(q, mode);
  };

  const toggleVoice = () => {
    if (!speechCtor) return;
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new speechCtor();
    rec.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <>
      {/* Persistent Floating Action Button on every workspace route */}
      <button
        ref={fabRef}
        type="button"
        data-testid="copilot-fab"
        aria-label="Open SunFix Copilot (Ctrl+K)"
        aria-expanded={copilotDrawerOpen}
        onClick={() => setCopilotDrawerOpen((o) => !o)}
        className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg transition-colors"
        style={{
          backgroundColor: TOKENS.brass,
          borderColor: TOKENS.hairlineStrong,
          color: TOKENS.ink,
        }}
      >
        <Bot className="w-4 h-4" />
        <span>{t(language, 'copilot.title')}</span>
        <span className="hidden sm:inline font-mono-tech text-[10px] opacity-75">Ctrl+K</span>
      </button>

      {/* Right-Side Drawer (Desktop) / Full-Height Sheet (Mobile) */}
      {copilotDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => {
              setCopilotDrawerOpen(false);
              setTimeout(() => fabRef.current?.focus(), 0);
            }}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="SunFix Copilot Assistant"
            data-testid="copilot-drawer"
            className="relative z-10 w-full sm:w-[460px] max-w-full h-full border-l flex flex-col"
            style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong }}
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 border-b flex items-center justify-between gap-2"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 shrink-0" style={{ color: TOKENS.brass }} />
                  <h2 className="font-display text-base truncate" style={{ color: TOKENS.bone }}>
                    {t(language, 'copilot.title')}
                  </h2>
                </div>
                <p className="text-[11px] truncate" style={{ color: TOKENS.sage }}>
                  {mode === 'cloud_chat'
                    ? effectiveOnline
                      ? 'Cloud multi-turn streaming (Firebase AI Logic)'
                      : 'Offline — deterministic grounded fallback active'
                    : deviceAvailability === 'ready'
                      ? 'On-device single-shot quick triage'
                      : 'On-device model not prepared — falls back honestly'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => createCopilotThread()}
                  title="New Copilot thread"
                  aria-label="Start new Copilot thread"
                  className="p-1.5 rounded-lg border"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCopilotDrawerOpen(false);
                    navigate('copilot');
                  }}
                  title="Open full-page Copilot (/copilot)"
                  aria-label="Open full-page Copilot"
                  className="p-1.5 rounded-lg border"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCopilotDrawerOpen(false);
                    setTimeout(() => fabRef.current?.focus(), 0);
                  }}
                  aria-label="Close SunFix Copilot"
                  className="p-1.5 rounded-lg border"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Switch + Transparent Removable Context Bar */}
            <div
              className="px-4 py-2.5 border-b space-y-2 text-xs"
              style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('cloud_chat')}
                  className="flex-1 py-1 px-2 rounded-md border text-[11px] font-medium"
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
                  className="flex-1 py-1 px-2 rounded-md border text-[11px] font-medium"
                  style={{
                    backgroundColor: mode === 'on_device_single' ? TOKENS.brass : TOKENS.ink,
                    borderColor: mode === 'on_device_single' ? TOKENS.brass : TOKENS.hairlineStrong,
                    color: mode === 'on_device_single' ? TOKENS.ink : TOKENS.sage,
                  }}
                >
                  {t(language, 'copilot.quickTriage')}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono-tech text-[10px] uppercase" style={{ color: TOKENS.brass }}>
                    {t(language, 'copilot.contextBar')}:
                  </span>
                  {copilotIncludeContext ? (
                    <span className="truncate text-[11px]" style={{ color: TOKENS.bone }}>
                      {activeAsset?.name?.replace(' [DEMO]', '')} · {selectedTwinComponentId}
                      {openCase?.faultCode ? ` · ${openCase.faultCode}` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: TOKENS.sage }}>
                      Detached
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setInspectPayload((v) => !v)}
                    className="inline-flex items-center gap-1 text-[10px] font-mono-tech hover:underline"
                    style={{ color: TOKENS.sky }}
                  >
                    <Eye className="w-3 h-3" />
                    {inspectPayload ? 'Hide Sent' : 'Inspect'}
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
                  className="text-[10px] font-mono-tech p-2 rounded border max-h-32 overflow-auto whitespace-pre-wrap"
                  style={{
                    backgroundColor: TOKENS.ink,
                    borderColor: TOKENS.hairline,
                    color: TOKENS.sage,
                  }}
                >
                  {previewPromptText}
                </pre>
              )}
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(!activeThread || activeThread.messages.length === 0) && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl border p-3.5 text-xs space-y-1.5"
                    style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
                  >
                    <div className="flex items-center gap-1.5 font-medium" style={{ color: TOKENS.brass }}>
                      <Sparkles className="w-3.5 h-3.5" />
                      Suggested Field Prompts
                    </div>
                    <p style={{ color: TOKENS.sage }}>
                      Answers retrieve only verified Knowledge Library entries, run deterministic safety checks first, and never execute workspace changes without your tap.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {starters.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="w-full text-left rounded-lg border px-3 py-2.5 text-xs transition-colors hover:opacity-90"
                        style={{
                          backgroundColor: TOKENS.mossRaised,
                          borderColor: TOKENS.hairlineStrong,
                          color: TOKENS.bone,
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeThread?.messages.map((msg) => (
                <CopilotMessageCard
                  key={msg.id}
                  message={msg}
                  knowledgeDocs={knowledgeDocs}
                  language={language}
                  onExecuteAction={executeCopilotAction}
                  onOpenSource={(doc) => setSelectedSourcePreview(doc)}
                  onRateFeedback={(mid, fb) => rateCopilotMessage(activeThread.id, mid, fb)}
                  onRetry={
                    msg.error
                      ? () => {
                          const lastUser = [...activeThread.messages]
                            .reverse()
                            .find((m) => m.role === 'user');
                          if (lastUser) handleSend(lastUser.text);
                        }
                      : undefined
                  }
                />
              ))}

              {copilotBusy && (
                <div
                  className="rounded-xl border p-3.5 text-xs space-y-1.5"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.brass }}
                >
                  <div className="font-mono-tech uppercase text-[10px]" style={{ color: TOKENS.brass }}>
                    {prefersReducedMotion ? 'Processing grounded guidance...' : 'Streaming grounded response...'}
                  </div>
                  {copilotStreamingText && (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: TOKENS.bone }}>
                      {copilotStreamingText}
                    </p>
                  )}
                </div>
              )}

              {selectedSourcePreview && (
                <div
                  className="rounded-xl border p-3 text-xs space-y-1.5"
                  style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.brass }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech" style={{ color: TOKENS.brass }}>
                      [{selectedSourcePreview.id}] · {selectedSourcePreview.sectionRef}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSourcePreview(null)}
                      aria-label="Close citation preview"
                      style={{ color: TOKENS.sage }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-semibold" style={{ color: TOKENS.bone }}>
                    {selectedSourcePreview.title}
                  </div>
                  <p style={{ color: TOKENS.sage }}>{selectedSourcePreview.guidance}</p>
                  <div className="text-[11px]" style={{ color: TOKENS.amberWarn }}>
                    Safety: {selectedSourcePreview.safetyNotice}
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t space-y-2"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t(language, 'copilot.placeholder')}
                  aria-label="Ask SunFix Copilot"
                  className="flex-1 rounded-lg border px-3 py-2 text-xs min-w-0"
                  style={{
                    backgroundColor: TOKENS.ink,
                    borderColor: TOKENS.hairlineStrong,
                    color: TOKENS.bone,
                  }}
                />
                {speechCtor && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}
                    className="p-2 rounded-lg border shrink-0"
                    style={{
                      backgroundColor: listening ? TOKENS.terracotta : TOKENS.moss,
                      borderColor: TOKENS.hairlineStrong,
                      color: listening ? TOKENS.ink : TOKENS.bone,
                    }}
                  >
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={copilotBusy || !input.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 disabled:opacity-40"
                  style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t(language, 'copilot.send')}</span>
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
};
