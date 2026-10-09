import React, { useState } from 'react';
import { ResponseActionDefinition, AuditLogEntry } from '../types';
import { ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: ResponseActionDefinition | null;
  incidentId: string;
  onConfirmApprove: (actionId: string, actor: string, reason: string) => Promise<void>;
  auditHistory?: AuditLogEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  action,
  incidentId,
  onConfirmApprove,
  auditHistory = []
}) => {
  const [actor, setActor] = useState('SOC Security Analyst (pratikmohanty730)');
  const [reason, setReason] = useState(
    'Correlated multi-vector attack detected across human and technology layers. Urgent containment required.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setIsSubmitting(true);
    try {
      await onConfirmApprove(action.action_id, actor, reason);
      onClose();
    } catch (err) {
      console.error('Error approving action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-2xl font-sans select-none">
      <div className="bg-[#0D1222]/95 border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-[28px] max-w-xl w-full p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* iOS Drag Grabber */}
        <div className="sm:hidden mb-2">
          <div className="ios-grabber" />
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Human-in-the-Loop Authorization
              </h3>
              <p className="text-[11px] text-slate-400">Institutional Governance & SOC Sign-off</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-sm ios-pressable">
            ✕
          </button>
        </div>

        {action ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-1">
                Target Action & Criticality Gate
              </div>
              <div className="text-sm font-bold text-white mb-1">
                {action.title}
              </div>
              <div className="text-xs text-slate-300 mb-2.5 leading-relaxed">
                {action.description}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[11px] font-mono">
                  {action.criticality} CONTAINMENT GATE
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Incident: {incidentId}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong className="text-amber-300">Simulation Mode:</strong> In this operational demonstration, response actions are safely dispatched and write verifiable immutable audit log records to institutional governance logs.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authorizing Security Officer / Actor:
              </label>
              <input
                type="text"
                value={actor}
                onChange={e => setActor(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Containment Justification / Reason:
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="w-full p-3.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white leading-relaxed font-sans"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl min-h-[40px] transition-colors ios-pressable"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-black bg-white hover:bg-slate-200 rounded-xl flex items-center justify-center gap-2 min-h-[40px] shadow-md transition-all disabled:opacity-50 ios-pressable"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isSubmitting ? 'Authorizing Action...' : 'Confirm & Authorize Containment'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-xs text-slate-400">No action selected.</div>
        )}
      </div>
    </div>
  );
};
