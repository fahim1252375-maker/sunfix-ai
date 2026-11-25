import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Box,
  Camera,
  Calculator,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from 'lucide-react';
import { t, type AppLanguage } from '../i18n/translations';
import { TOKENS } from '../theme/tokens';
import type {
  CopilotActionChip,
  CopilotFeedback,
  CopilotMessage,
  KnowledgeSource,
} from '../types/sunfix';
import { formatEvidenceStatusLabel } from '../utils/copilotLogic';

export interface CopilotMessageCardProps {
  message: CopilotMessage;
  knowledgeDocs: KnowledgeSource[];
  language: AppLanguage;
  onExecuteAction?: (action: CopilotActionChip) => void;
  onOpenSource?: (doc: KnowledgeSource) => void;
  onRateFeedback?: (messageId: string, feedback: CopilotFeedback) => void;
  onRetry?: () => void;
}

function inferenceLabel(source?: CopilotMessage['inferenceSource']): {
  label: string;
  color: string;
} {
  switch (source) {
    case 'on_device':
      return { label: 'LOCAL', color: TOKENS.mint };
    case 'in_cloud':
      return { label: 'CLOUD', color: TOKENS.sky };
    default:
      return { label: 'DEMO RULES', color: TOKENS.amberWarn };
  }
}

function actionIcon(type: CopilotActionChip['actionType']) {
  switch (type) {
    case 'highlight_3d':
      return <Box className="w-3.5 h-3.5 shrink-0" />;
    case 'open_wizard':
      return <Cpu className="w-3.5 h-3.5 shrink-0" />;
    case 'start_checklist':
      return <Wrench className="w-3.5 h-3.5 shrink-0" />;
    case 'add_fieldproof':
      return <Camera className="w-3.5 h-3.5 shrink-0" />;
    case 'open_calculator':
      return <Calculator className="w-3.5 h-3.5 shrink-0" />;
  }
}

export const CopilotMessageCard: React.FC<CopilotMessageCardProps> = ({
  message,
  knowledgeDocs,
  language,
  onExecuteAction,
  onOpenSource,
  onRateFeedback,
  onRetry,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reasonDraft, setReasonDraft] = useState(message.feedback?.reason || '');

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[88%] rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            backgroundColor: TOKENS.mossRaised,
            borderColor: TOKENS.hairlineStrong,
            color: TOKENS.bone,
          }}
        >
          <div className="text-[10px] font-mono-tech uppercase mb-1" style={{ color: TOKENS.brass }}>
            Technician
          </div>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </div>
    );
  }

  const isLong = message.text.length > 480;
  const displayText = isLong && !expanded ? `${message.text.slice(0, 440).trim()}…` : message.text;
  const badge = inferenceLabel(message.inferenceSource);
  const citedDocs = (message.citedSourceIds || [])
    .map((id) => knowledgeDocs.find((k) => k.id === id))
    .filter((d): d is KnowledgeSource => Boolean(d));

  const evidenceColor =
    message.evidenceStatus === 'requires_inspection'
      ? TOKENS.terracotta
      : message.evidenceStatus === 'evidence_available'
        ? TOKENS.mint
        : TOKENS.amberWarn;

  return (
    <article
      data-testid={message.stopWorkHold ? 'copilot-stop-work-card' : 'copilot-assistant-card'}
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: message.stopWorkHold ? TOKENS.mossDeep : TOKENS.moss,
        borderColor: message.stopWorkHold ? TOKENS.terracotta : TOKENS.hairlineStrong,
      }}
    >
      {/* Top Provenance & Evidence Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-mono-tech uppercase font-semibold px-1.5 py-0.5 rounded border"
            style={{
              borderColor: badge.color,
              color: badge.color,
              backgroundColor: TOKENS.ink,
            }}
          >
            {badge.label}
          </span>
          {message.evidenceStatus && (
            <span className="font-mono-tech uppercase" style={{ color: evidenceColor }}>
              {formatEvidenceStatusLabel(message.evidenceStatus)}
            </span>
          )}
          {typeof message.latencyMs === 'number' && (
            <span className="font-mono-tech tabular-nums" style={{ color: TOKENS.sage }}>
              {message.latencyMs} ms
            </span>
          )}
        </div>
        {message.modelName && (
          <span className="text-[10px] font-mono-tech truncate max-w-[210px]" style={{ color: TOKENS.sage }}>
            {message.modelName}
          </span>
        )}
      </div>

      {/* Stop-Work Hold Alert Header */}
      {message.stopWorkHold && (
        <div
          className="rounded-lg border px-3 py-2 flex items-start gap-2 text-xs"
          style={{
            backgroundColor: TOKENS.ink,
            borderColor: TOKENS.terracotta,
            color: TOKENS.terracotta,
          }}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold uppercase tracking-wide">
              {t(language, 'copilot.stopWorkTitle')}
            </div>
            <div className="mt-0.5" style={{ color: TOKENS.bone }}>
              Deterministic Safety Gate blocked generative repair guidance. Zero model call made.
            </div>
          </div>
        </div>
      )}

      {/* Safety Filter Notice */}
      {message.safetyFiltered && !message.stopWorkHold && (
        <div
          className="rounded-lg border px-3 py-2 flex items-start gap-2 text-xs"
          style={{
            backgroundColor: TOKENS.ink,
            borderColor: TOKENS.amberWarn,
            color: TOKENS.amberWarn,
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Safety output filter intervened to withhold unsafe electrical steps.</span>
        </div>
      )}

      {/* Main Message Text */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: TOKENS.bone }}>
        {displayText}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
          style={{ color: TOKENS.brass }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show concise summary
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show full answer
            </>
          )}
        </button>
      )}

      {/* Citations (Strictly Grounded Knowledge Docs) */}
      {citedDocs.length > 0 && (
        <div className="pt-2 border-t space-y-1.5" style={{ borderColor: TOKENS.hairline }}>
          <div className="text-[10px] font-mono-tech uppercase" style={{ color: TOKENS.sage }}>
            Grounded Knowledge Citations ({citedDocs.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {citedDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onOpenSource?.(doc)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono-tech transition-colors hover:opacity-90"
                style={{
                  backgroundColor: TOKENS.ink,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.brass,
                }}
              >
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[200px]">
                  [{doc.id}] {doc.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explicit Action Chips (User-Triggered Only — Zero Auto-Execution) */}
      {message.actions && message.actions.length > 0 && (
        <div className="pt-2 border-t space-y-1.5" style={{ borderColor: TOKENS.hairline }}>
          <div className="text-[10px] font-mono-tech uppercase" style={{ color: TOKENS.sage }}>
            Suggested Actions (Tap to Open)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => onExecuteAction?.(act)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                style={{
                  backgroundColor: TOKENS.brassSoft,
                  borderColor: TOKENS.brass,
                  color: TOKENS.bone,
                }}
              >
                <span style={{ color: TOKENS.brass }}>{actionIcon(act.actionType)}</span>
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recoverable Error + Retry */}
      {message.error && (
        <div
          className="rounded-lg border px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{
            backgroundColor: TOKENS.ink,
            borderColor: TOKENS.amberWarn,
            color: TOKENS.amberWarn,
          }}
        >
          <span className="flex-1 min-w-0">{message.error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border font-medium shrink-0"
              style={{ borderColor: TOKENS.amberWarn, color: TOKENS.bone }}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Transparency & Feedback Footer */}
      <div
        className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]"
        style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}
      >
        <div className="flex items-center gap-2">
          {onRateFeedback && (
            <>
              <button
                type="button"
                aria-label="Helpful answer"
                onClick={() => onRateFeedback(message.id, { rating: 'helpful' })}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px]"
                style={{
                  borderColor:
                    message.feedback?.rating === 'helpful' ? TOKENS.mint : TOKENS.hairline,
                  color: message.feedback?.rating === 'helpful' ? TOKENS.mint : TOKENS.sage,
                  backgroundColor: TOKENS.ink,
                }}
              >
                <ThumbsUp className="w-3 h-3" />
                Helpful
              </button>
              <button
                type="button"
                aria-label="Not helpful answer"
                onClick={() => {
                  setShowReasonInput(true);
                  onRateFeedback(message.id, { rating: 'not_helpful', reason: reasonDraft });
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px]"
                style={{
                  borderColor:
                    message.feedback?.rating === 'not_helpful'
                      ? TOKENS.terracotta
                      : TOKENS.hairline,
                  color:
                    message.feedback?.rating === 'not_helpful' ? TOKENS.terracotta : TOKENS.sage,
                  backgroundColor: TOKENS.ink,
                }}
              >
                <ThumbsDown className="w-3 h-3" />
                Needs Fix
              </button>
            </>
          )}
        </div>

        {message.payloadSentPreview && (
          <button
            type="button"
            onClick={() => setShowPayload((p) => !p)}
            className="text-[10px] font-mono-tech hover:underline"
            style={{ color: TOKENS.sage }}
          >
            {showPayload ? 'Hide Prompt Sent' : 'Inspect Prompt Sent'}
          </button>
        )}
      </div>

      {showReasonInput && onRateFeedback && (
        <div className="flex gap-2">
          <input
            type="text"
            value={reasonDraft}
            onChange={(e) => setReasonDraft(e.target.value)}
            placeholder="Optional note: what was missing or inaccurate?"
            className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs"
            style={{
              backgroundColor: TOKENS.ink,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          />
          <button
            type="button"
            onClick={() => {
              onRateFeedback(message.id, { rating: 'not_helpful', reason: reasonDraft });
              setShowReasonInput(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
          >
            Save
          </button>
        </div>
      )}

      {showPayload && message.payloadSentPreview && (
        <pre
          className="text-[10px] font-mono-tech p-2.5 rounded-lg border overflow-x-auto max-h-40 whitespace-pre-wrap"
          style={{
            backgroundColor: TOKENS.ink,
            borderColor: TOKENS.hairline,
            color: TOKENS.sage,
          }}
        >
          {message.payloadSentPreview}
        </pre>
      )}

      {/* Fixed Safety Disclaimer Footer */}
      <div className="text-[10px] leading-snug pt-1" style={{ color: TOKENS.sage }}>
        {t(language, 'copilot.disclaimer')}
      </div>
    </article>
  );
};
