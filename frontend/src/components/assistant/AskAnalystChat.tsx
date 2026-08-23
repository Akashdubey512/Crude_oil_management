import { useState } from 'react';
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { api } from '../../api/client';
import type { AnalystQueryResponse } from '../../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'analyst';
  text: string;
  intent?: string;
  llmGenerated?: boolean;
  sourceData?: Record<string, any>;
  timestamp: string;
}

const SAMPLE_QUESTIONS = [
  'What is current Strait of Hormuz risk?',
  'Compare risks across all maritime corridors',
  'Why is risk elevated for Suez Canal?',
  'What is the strategic reserve drawdown recommendation?',
];

export default function AskAnalystChat() {
  const [query, setQuery] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'analyst',
      text: 'Hello! I am your AI Energy Resilience Analyst. Ask any question regarding corridor risk forecasts, SHAP drivers, supplier exposures, or drawdown schedules. All answers are strictly grounded in live XGBoost model telemetry.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setQuery('');
    setLoading(true);

    api.postAnalystQuery(q)
      .then((res: AnalystQueryResponse) => {
        const analystMsg: ChatMessage = {
          id: `analyst-${Date.now()}`,
          sender: 'analyst',
          text: res.answer,
          intent: res.intent,
          llmGenerated: res.llm_generated,
          sourceData: res.source_data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, analystMsg]);
        setLoading(false);
      })
      .catch((err) => {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          sender: 'analyst',
          text: `Error processing query: ${err.message || 'Failed to connect to analyst service.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
      });
  };

  const toggleSource = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div
      className="p-4 rounded-xl border space-y-4 font-geist select-none flex flex-col h-[520px]"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-xs font-bold uppercase font-space tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Ask the Analyst — GenAI Query Engine
            </h3>
            <p className="text-[10px] text-slate-400 font-inter mt-0.5">
              Constrained language layer backed by verified model & PPAC data streams.
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded border text-[9px] font-mono uppercase bg-blue-950/40 border-blue-500/40 text-blue-300">
          AUDITABLE GENAI
        </span>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-1.5">
        {SAMPLE_QUESTIONS.map((sq) => (
          <button
            key={sq}
            onClick={() => handleSend(sq)}
            disabled={loading}
            className="text-[10px] px-2.5 py-1 rounded-full border bg-slate-900/60 border-slate-800 text-slate-300 hover:border-blue-500/60 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'analyst' && (
              <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
            )}

            <div
              className={`max-w-[85%] p-3 rounded-xl border text-xs leading-relaxed space-y-2 font-inter ${
                msg.sender === 'user'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-100 rounded-tr-none'
                  : 'bg-slate-900/80 border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-bold font-mono text-slate-400">
                  {msg.sender === 'user' ? 'YOU' : 'ANALYST AGENT'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
              </div>

              <div className="whitespace-pre-line">{msg.text}</div>

              {msg.sender === 'analyst' && msg.intent && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-slate-950 border border-slate-800 text-slate-400">
                      INTENT: {msg.intent}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase border ${
                        msg.llmGenerated
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {msg.llmGenerated ? 'LLM PHRASED' : 'DETERMINISTIC'}
                    </span>
                  </div>

                  {msg.sourceData && (
                    <button
                      onClick={() => toggleSource(msg.id)}
                      className="text-[9px] font-mono text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Database className="w-3 h-3" />
                      {expandedSources[msg.id] ? 'Hide Source Data' : 'View Source Data'}
                      {expandedSources[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              )}

              {/* Source Data Json Drawer */}
              {msg.sourceData && expandedSources[msg.id] && (
                <div className="p-2.5 rounded border bg-[#04080e] border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40 scrollbar">
                  <pre>{JSON.stringify(msg.sourceData, null, 2)}</pre>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-inter py-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Analyst is retrieving telemetry & phrasing response...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about corridor risk, SHAP factors, GDP impact, or drawdown schedules..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg border text-xs bg-[#060b13] border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-inter"
        />
        <button
          onClick={() => handleSend()}
          disabled={!query.trim() || loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 font-space"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
}
