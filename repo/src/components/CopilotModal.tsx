import React, { useState } from 'react';
import { api } from '../services/api';
import { Bot, Send, ShieldAlert, Sparkles, Terminal, X } from 'lucide-react';

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIncidentId?: string;
}

export const CopilotModal: React.FC<CopilotModalProps> = ({
  isOpen,
  onClose,
  activeIncidentId
}) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; citations?: string[] }>>([
    {
      sender: 'assistant',
      text: 'CYBERGUARD Grounded SOC Investigation Assistant active. I evaluate queries strictly against verified incident evidence, telemetry baselines, and institutional playbooks.\n\nQuick prompts:\n• "Why is the current incident critical?"\n• "What containment actions should the administrator authorize?"\n• "What sequence of events caused the risk to escalate?"'
    }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { sender: 'user' as const, text: q };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.queryCopilot(q, activeIncidentId);
      setMessages(prev => [...prev, { sender: 'assistant', text: res.answer, citations: res.citations }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error connecting to SOC investigation engine: ${err.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-2xl font-sans select-none">
      <div className="bg-[#0D1222]/95 border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-[28px] max-w-2xl w-full h-[88vh] sm:h-[600px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* iOS Drag Grabber */}
        <div className="pt-3 pb-1 sm:hidden shrink-0">
          <div className="ios-grabber" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] bg-black/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Bot className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                SOC Copilot & Forensic Assistant
              </h3>
              <p className="text-xs text-slate-400">
                Grounded strictly in incident evidence {activeIncidentId ? `(${activeIncidentId})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors ios-pressable"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-black/30">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-[22px] p-4 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-white text-black font-medium'
                    : 'bg-[#151B2E]/90 border border-white/10 text-slate-200 backdrop-blur-xl'
                }`}
              >
                <div>{m.text}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="text-slate-400 font-medium">Grounded Evidence:</span>
                    {m.citations.map((cite, cIdx) => (
                      <span key={cIdx} className="font-mono bg-black/40 px-2 py-0.5 rounded-md text-sky-300 border border-white/10 text-[10px]">
                        {cite}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#151B2E] border border-white/10 p-3 rounded-2xl text-xs text-slate-300 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Evaluating incident indicators against playbooks...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-3 bg-black/20 border-t border-white/[0.08] flex flex-wrap gap-1.5 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSend('Why is the current incident critical?')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition-colors text-left shrink-0 ios-pressable text-xs font-medium"
          >
            Why is incident critical?
          </button>
          <button
            onClick={() => handleSend('What containment actions should the administrator authorize?')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition-colors text-left shrink-0 ios-pressable text-xs font-medium"
          >
            Recommended containment actions?
          </button>
          <button
            onClick={() => handleSend('What sequence of events caused the risk to escalate?')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition-colors text-left shrink-0 ios-pressable text-xs font-medium"
          >
            Explain attack timeline
          </button>
          <button
            onClick={() => handleSend('Which domains and IP infrastructure are involved in this campaign?')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition-colors text-left shrink-0 ios-pressable text-xs font-medium"
          >
            Summarize malicious infrastructure
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 bg-black/40 border-t border-white/[0.08] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask questions grounded in verified evidence..."
            className="flex-1 px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white font-sans"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-white text-black hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[38px] shadow-md ios-pressable shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </div>
      </div>
    </div>
  );
};
