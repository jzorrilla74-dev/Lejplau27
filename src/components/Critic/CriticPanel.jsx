import { useState, useRef, useEffect } from 'react';
import { Settings, ThumbsUp, ThumbsDown, SendHorizontal, RefreshCw } from 'lucide-react';
import { useCritic } from '../../context/CriticContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { useBrief } from '../../context/BriefContext';
import { callCritic } from '../../lib/criticAPI';
import { generateBriefSummary } from '../../lib/briefSummary';
import ApiKeyModal from './ApiKeyModal';

function SimpleMarkdown({ text }) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <div key={i} style={{ fontWeight: 700, fontSize: 12, marginTop: 8, marginBottom: 2, color: 'var(--tx)' }}>{line.slice(3)}</div>;
        if (line.startsWith('# '))  return <div key={i} style={{ fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2, color: 'var(--tx)' }}>{line.slice(2)}</div>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ paddingLeft: 10, color: 'var(--tx)', lineHeight: 1.5 }}>• {line.slice(2)}</div>;
        if (/^\d+\. /.test(line)) return <div key={i} style={{ paddingLeft: 10, color: 'var(--tx)', lineHeight: 1.5 }}>{line}</div>;
        if (line === '') return <div key={i} style={{ height: 4 }} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ color: 'var(--tx)', lineHeight: 1.5 }}>
            {parts.map((p, j) => p.startsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}
          </div>
        );
      })}
    </div>
  );
}

export default function CriticPanel() {
  const { messages, loading, apiKey, dispatch } = useCritic();
  const { rooms, partyWallStartM } = useLayout();
  const { layers } = useLayers();
  const { state: brief } = useBrief();
  const [question, setQuestion] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(!apiKey);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [autoReview, setAutoReview] = useState(false);
  const threadRef = useRef(null);
  const lastChangeRef = useRef(Date.now());
  const loadingRef = useRef(loading);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    lastChangeRef.current = Date.now();
  }, [rooms]);

  useEffect(() => {
    if (!autoReview) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastChangeRef.current;
      if (elapsed > 45000 && !loadingRef.current && rooms.length > 0) {
        lastChangeRef.current = Date.now();
        startCall('layout_review');
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [autoReview, rooms.length]); // eslint-disable-line

  function buildConversationHistory() {
    return messages.map(m => ({ role: m.role === 'critic' ? 'assistant' : 'user', content: m.content }));
  }

  function startCall(requestType, questionText) {
    if (!apiKey) { setShowKeyModal(true); return; }
    if (loadingRef.current) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: requestType === 'question' ? questionText : requestType === 'layout_review' ? 'Review the current layout' : 'Review the design brief',
      ts: new Date().toLocaleTimeString(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now() + 1, role: 'critic', content: '', ts: new Date().toLocaleTimeString() } });
    dispatch({ type: 'SET_LOADING', loading: true });

    callCritic({
      brief,
      layout: { rooms, partyWallStartM },
      layers,
      requestType,
      question: questionText || null,
      conversationHistory: buildConversationHistory(),
      apiKey,
      onChunk: (chunk) => dispatch({ type: 'APPEND_LAST', chunk }),
      onDone: () => dispatch({ type: 'SET_LOADING', loading: false }),
      onError: (err) => {
        dispatch({ type: 'APPEND_LAST', chunk: `\n\n**Error:** ${err}` });
        dispatch({ type: 'SET_LOADING', loading: false });
      },
    });
  }

  function handleSend() {
    if (!question.trim()) return;
    startCall('question', question.trim());
    setQuestion('');
  }

  const briefSummary = generateBriefSummary(brief);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* header */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', background: 'var(--bg3)' }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--tx)' }}>Design Critic</span>
        <button
          onClick={() => setAutoReview(v => !v)}
          title={autoReview ? 'Auto-review on (click to disable)' : 'Auto-review off (click to enable)'}
          style={{
            fontSize: 9, background: autoReview ? 'rgba(123,158,135,0.15)' : 'none',
            border: autoReview ? '1px solid var(--accent)' : '1px solid transparent',
            borderRadius: 3, padding: '2px 5px',
            color: autoReview ? 'var(--accent)' : 'var(--tx3)', cursor: 'pointer', marginRight: 4,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
          <RefreshCw size={10} strokeWidth={1.6} />
          Auto
        </button>
        <button onClick={() => dispatch({ type: 'CLEAR_MESSAGES' })} style={{ fontSize: 9, color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 6 }}>Clear</button>
        <button onClick={() => setShowKeyModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', display: 'flex' }} title="API settings"><Settings size={14} strokeWidth={1.6} /></button>
      </div>

      {/* action buttons */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--bd)' }}>
        <button
          onClick={() => startCall('layout_review')}
          disabled={loading || rooms.length === 0}
          style={{
            flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600,
            background: rooms.length === 0 ? 'var(--bg3)' : 'var(--accent)',
            border: 'none', borderRadius: 4, color: rooms.length === 0 ? 'var(--tx3)' : 'white',
            cursor: rooms.length === 0 || loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '…' : 'Review Layout'}
        </button>
        <button
          onClick={() => startCall('brief_review')}
          disabled={loading}
          style={{
            flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600,
            background: 'var(--bg3)',
            border: '1px solid var(--bd2)', borderRadius: 4, color: 'var(--tx)', cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          Review Brief
        </button>
      </div>

      {/* question input */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid var(--bd)' }}>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question…"
          style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
        />
        <button onClick={handleSend} disabled={loading || !question.trim()}
          style={{ padding: '4px 8px', background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <SendHorizontal size={14} strokeWidth={1.6} />
        </button>
      </div>

      {/* brief context card */}
      <div style={{ borderBottom: '1px solid var(--bd)', background: 'var(--bg2)' }}>
        <button
          onClick={() => setBriefExpanded(v => !v)}
          style={{
            width: '100%', padding: '5px 8px', fontSize: 10, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--tx2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
          <span>Brief context</span>
          <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{briefExpanded ? '▲' : '▼'}</span>
        </button>
        {briefExpanded && (
          <div style={{ padding: '0 8px 8px', fontSize: 10, color: 'var(--tx2)', lineHeight: 1.6 }}>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: 6 }}>{briefSummary}</div>
            {brief.priorities && brief.priorities.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--tx3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 9 }}>Ranked priorities</div>
                {brief.priorities.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                    <span style={{ color: 'var(--tx3)', minWidth: 14 }}>{i + 1}.</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* message thread */}
      <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--tx3)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            Place some rooms, then ask for a layout review.
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            marginBottom: 8, padding: '6px 8px', borderRadius: 4,
            background: msg.role === 'user' ? 'var(--bg3)' : 'var(--bg2)',
            border: '1px solid var(--bd)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: msg.role === 'critic' ? 'var(--accent)' : 'var(--tx2)' }}>
                {msg.role === 'critic' ? 'CRITIC' : 'YOU'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{msg.ts}</span>
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              {msg.role === 'critic' ? <SimpleMarkdown text={msg.content || '…'} /> : <div style={{ color: 'var(--tx)' }}>{msg.content}</div>}
            </div>
            {msg.role === 'critic' && msg.content && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', display: 'flex', padding: 2 }} title="Helpful"><ThumbsUp size={12} strokeWidth={1.6} /></button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', display: 'flex', padding: 2 }} title="Not helpful"><ThumbsDown size={12} strokeWidth={1.6} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} />}
    </div>
  );
}
