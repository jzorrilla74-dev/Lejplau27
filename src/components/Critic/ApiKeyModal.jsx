import { useState } from 'react';
import { useCritic } from '../../context/CriticContext';

export default function ApiKeyModal({ onClose }) {
  const { apiKey, dispatch } = useCritic();
  const [val, setVal] = useState(apiKey || '');

  function save() {
    dispatch({ type: 'SET_API_KEY', key: val.trim() });
    onClose();
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 6, padding: 20, width: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tx)' }}>OpenRouter API Key</div>
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 12 }}>
          Key is stored locally in your browser only and never sent anywhere except OpenRouter.
        </div>
        <input
          autoFocus
          type="password"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="sk-or-..."
          style={{ width: '100%', padding: '6px 8px', marginBottom: 10, background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 4, color: 'var(--tx)', fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} style={{ flex: 1, padding: '6px 0', background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Save
          </button>
          <button onClick={onClose} style={{ padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 4, color: 'var(--tx2)', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
