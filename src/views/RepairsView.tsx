import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';
import type { WorkOrderStatus } from '../types/sunfix';

export const RepairsView: React.FC = () => {
  const {
    workOrders,
    activeWorkOrderId,
    setActiveWorkOrderId,
    evidence,
    updateWorkOrderTaskStatus,
    updateWorkOrderNotes,
    escalateWorkOrder,
    completeWorkOrder,
    generateServiceReport,
    navigate,
  } = useSunFix();

  const activeWo = workOrders.find((w) => w.id === activeWorkOrderId) || workOrders[0];
  const [techNotes, setTechNotes] = useState(activeWo?.technicianNotes || '');
  const [verifyNotes, setVerifyNotes] = useState(activeWo?.verificationNotes || '');
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateBox, setShowEscalateBox] = useState(false);

  useEffect(() => {
    if (activeWo) {
      setTechNotes(activeWo.technicianNotes);
      setVerifyNotes(activeWo.verificationNotes);
    }
  }, [activeWo]);

  if (!activeWo) {
    return (
      <div
        className="border rounded-xl p-8 text-center space-y-3"
        style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
      >
        <p className="text-sm" style={{ color: TOKENS.sage }}>No active repair work orders.</p>
        <button
          type="button"
          onClick={() => navigate('diagnostics')}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
        >
          Run AI Diagnosis First
        </button>
      </div>
    );
  }

  const linkedEvidence = evidence.filter(
    (e) => e.workOrderId === activeWo.id || e.caseId === activeWo.caseId,
  );

  const handleSaveNotes = () => {
    updateWorkOrderNotes(activeWo.id, techNotes, verifyNotes);
  };

  const handleEscalateSubmit = () => {
    if (!escalateReason.trim()) return;
    escalateWorkOrder(activeWo.id, escalateReason.trim());
    setShowEscalateBox(false);
    setEscalateReason('');
  };

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Offline-Ready Checklist · Twin Sync
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            Safety-gated <em className="italic" style={{ color: TOKENS.brass }}>repair</em> operations
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Step-by-step repair checklist with pre-work safety enforcement and FieldProof verification.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('fieldproof')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium"
            style={{
              backgroundColor: TOKENS.moss,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            <Camera className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Attach FieldProof Photo
          </button>

          <button
            type="button"
            onClick={() =>
              generateServiceReport({
                caseId: activeWo.caseId,
                workOrderId: activeWo.id,
                outstandingIssues:
                  activeWo.status === 'completed'
                    ? 'Verified nominal post-repair.'
                    : activeWo.escalatedReason || 'Repair verification in progress.',
              })
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium"
            style={{
              backgroundColor: TOKENS.mossRaised,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            <FileText className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Generate Service Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Work Order List */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: TOKENS.sage }}>
            Active Work Orders ({workOrders.length})
          </div>
          {workOrders.map((wo) => {
            const selected = wo.id === activeWo.id;
            return (
              <button
                key={wo.id}
                type="button"
                onClick={() => setActiveWorkOrderId(wo.id)}
                className="w-full text-left p-4 rounded-xl border transition-colors space-y-1.5"
                style={{
                  backgroundColor: selected ? TOKENS.mossRaised : TOKENS.moss,
                  borderColor: selected ? TOKENS.brass : TOKENS.hairline,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                    {wo.priority}
                  </span>
                  <span
                    className="font-mono-tech uppercase"
                    style={{
                      color:
                        wo.status === 'completed'
                          ? TOKENS.mint
                          : wo.status === 'blocked' || wo.status === 'escalated'
                            ? TOKENS.terracotta
                            : TOKENS.amberWarn,
                    }}
                  >
                    {wo.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm font-semibold" style={{ color: TOKENS.bone }}>
                  {wo.title}
                </div>
                <div className="text-xs" style={{ color: TOKENS.sage }}>
                  {wo.assetName}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Active Work Order Workspace */}
        <section className="lg:col-span-8 space-y-5">
          {!activeWo.safetyCleared && (
            <div
              role="alert"
              className="p-4 rounded-xl border flex items-start gap-3"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.terracotta }}
            >
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: TOKENS.terracotta }} />
              <div className="text-xs space-y-1" style={{ color: TOKENS.bone }}>
                <div className="font-bold" style={{ color: TOKENS.terracotta }}>
                  REPAIR PROGRESSION BLOCKED BY SAFETY GATE
                </div>
                <p>
                  This work order was generated under an active Stop-Work Hold. Standard repair tasks cannot be marked completed. Escalate the hazard record to a licensed supervisor.
                </p>
              </div>
            </div>
          )}

          <div
            className="border rounded-xl p-5 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl flex items-center gap-2" style={{ color: TOKENS.bone }}>
                  <Wrench className="w-4 h-4" style={{ color: TOKENS.brass }} />
                  {activeWo.title}
                </h2>
                <p className="text-xs mt-1" style={{ color: TOKENS.sage }}>
                  {activeWo.problemDescription}
                </p>
              </div>
              <span
                className="text-xs font-mono-tech px-2.5 py-1 rounded border"
                style={{
                  backgroundColor: TOKENS.ink,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.brass,
                }}
              >
                {activeWo.status.toUpperCase()}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-2.5">
              {activeWo.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border space-y-2"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <div className="text-sm font-medium" style={{ color: TOKENS.bone }}>
                        {task.title}
                      </div>
                      <div className="text-xs flex items-center gap-1.5" style={{ color: TOKENS.amberWarn }}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{task.safetyNote}</span>
                      </div>
                    </div>

                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      disabled={!activeWo.safetyCleared}
                      onChange={(e) =>
                        updateWorkOrderTaskStatus(
                          activeWo.id,
                          task.id,
                          e.target.value as WorkOrderStatus,
                        )
                      }
                      className="rounded-lg border px-2.5 py-2 text-xs disabled:opacity-50 min-h-[40px]"
                      style={{
                        backgroundColor: TOKENS.moss,
                        borderColor: TOKENS.hairlineStrong,
                        color: TOKENS.bone,
                      }}
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs mb-1" style={{ color: TOKENS.sage }}>
                  Technician Repair Notes
                </label>
                <textarea
                  rows={3}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: TOKENS.sage }}>
                  Post-Repair Verification Notes
                </label>
                <textarea
                  rows={3}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Record restored AC export kW, meter check, or after-service observations..."
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t"
              style={{ borderColor: TOKENS.hairline }}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3.5 py-2 rounded-lg border text-xs font-medium"
                  style={{
                    backgroundColor: TOKENS.mossRaised,
                    borderColor: TOKENS.hairlineStrong,
                    color: TOKENS.bone,
                  }}
                >
                  Save Notes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEscalateBox((s) => !s)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-medium"
                  style={{
                    backgroundColor: TOKENS.mossDeep,
                    borderColor: TOKENS.terracotta,
                    color: TOKENS.terracotta,
                  }}
                >
                  Escalate Issue
                </button>
              </div>

              <button
                type="button"
                disabled={!activeWo.safetyCleared || activeWo.status === 'completed'}
                onClick={() => {
                  handleSaveNotes();
                  completeWorkOrder(activeWo.id);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-45"
                style={{ backgroundColor: TOKENS.mint, color: TOKENS.ink }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {activeWo.status === 'completed'
                  ? 'Repair Completed & Twin Nominal'
                  : 'Complete Repair & Verify'}
              </button>
            </div>

            {showEscalateBox && (
              <div
                className="p-3 rounded-lg border space-y-2"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.terracotta }}
              >
                <label className="block text-xs font-medium" style={{ color: TOKENS.terracotta }}>
                  Escalation Reason (Licensed Electrician / Supervisor)
                </label>
                <input
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Feeder L2 voltage remains 196V; requires utility / master electrician inspection"
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                  style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
                <button
                  type="button"
                  onClick={handleEscalateSubmit}
                  className="px-3 py-1.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: TOKENS.terracotta, color: TOKENS.ink }}
                >
                  Confirm Escalation
                </button>
              </div>
            )}
          </div>

          {/* Linked FieldProof Evidence */}
          <div
            className="border rounded-xl p-5 space-y-3"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <h3 className="font-display text-base" style={{ color: TOKENS.bone }}>
              Linked FieldProof Evidence ({linkedEvidence.length})
            </h3>
            {linkedEvidence.length === 0 ? (
              <p className="text-xs" style={{ color: TOKENS.sage }}>
                No evidence records attached to this case yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border space-y-1.5"
                    style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                  >
                    <div className="text-[11px] font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                      {ev.evidenceType.replace('_', ' ')}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: TOKENS.bone }}>
                      {ev.caption}
                    </div>
                    <div className="text-xs" style={{ color: TOKENS.sage }}>
                      {ev.note}
                    </div>
                    {ev.imageDataUrl && (
                      <img
                        src={ev.imageDataUrl}
                        alt={ev.caption}
                        className="mt-2 max-h-32 rounded border object-cover"
                        style={{ borderColor: TOKENS.hairline }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
