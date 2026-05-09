import { useState, useRef, useEffect } from 'react';
import { useCritic } from '../../context/CriticContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { useBrief } from '../../context/BriefContext';
import { callCritic } from '../../lib/criticAPI';
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
        // bold
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
  const threadRef = useRef(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  function buildConversationHistory() {
    return messages.map(m => ({ role: m.role === 'critic' ? 'assistant' : 'user', content: m.content }));
  }

  function startCall(requestType, questionText) {
    if (!apiKey) { setShowKeyModal(true); return; }
    if (loading) return;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* header */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', background: 'var(--bg3)' }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--tx)' }}>Design Critic</span>
        <button onClick={() => dispatch({ type: 'CLEAR_MESSAGES' })} style={{ fontSize: 9, color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 6 }}>Clear</button>
        <button onClick={() => setShowKeyModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 14 }} title="API settings">⚙</button>
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
            background: loading ? 'var(--bg3)' : 'var(--bg3)',
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
          style={{ padding: '4px 8px', background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'white', fontSize: 11, cursor: 'pointer' }}>
          →
        </button>
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
                <button style={{ background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--tx3)' }} title="Helpful">👍</button>
                <button style={{ background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--tx3)' }} title="Not helpful">👎</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} />}
    </div>
  );
}
