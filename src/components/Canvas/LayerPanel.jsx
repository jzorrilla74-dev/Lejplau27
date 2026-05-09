import { v4 as uuidv4 } from 'uuid';
import { useLayers } from '../../context/LayerContext';

export default function LayerPanel({ onClose }) {
  const { layers, activeLayerId, dispatch } = useLayers();
  const sorted = [...layers].sort((a, b) => b.order - a.order);

  return (
    <div style={{
      position: 'absolute', top: 36, right: 0,
      width: 220, background: 'var(--bg2)',
      border: '1px solid var(--bd2)', borderRadius: 4,
      zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)' }}>Layers</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {sorted.map(layer => (
          <div
            key={layer.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE', id: layer.id })}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
              background: activeLayerId === layer.id ? 'rgba(83,74,183,0.15)' : 'transparent',
              borderLeft: activeLayerId === layer.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
            }}>
            {/* eye toggle */}
            <button onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_VISIBLE', id: layer.id }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: layer.visible ? 1 : 0.3, padding: 0 }}
              title="Toggle visibility">
              👁
            </button>

            {/* lock toggle */}
            <button onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LOCKED', id: layer.id }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: layer.locked ? 1 : 0.3, padding: 0 }}
              title="Toggle lock">
              🔒
            </button>

            {/* name — double-click to rename */}
            <span
              style={{ flex: 1, fontSize: 11, color: 'var(--tx)' }}
              onDoubleClick={e => {
                e.stopPropagation();
                const name = prompt('Layer name:', layer.name);
                if (name) dispatch({ type: 'RENAME_LAYER', id: layer.id, name });
              }}>
              {layer.name}
            </span>

            {/* opacity */}
            <input
              type="range" min={0} max={100} step={5}
              value={Math.round(layer.opacity * 100)}
              onClick={e => e.stopPropagation()}
              onChange={e => dispatch({ type: 'SET_OPACITY', id: layer.id, opacity: e.target.value / 100 })}
              style={{ width: 50 }}
            />
          </div>
        ))}
      </div>

      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 4 }}>
        <button
          onClick={() => dispatch({ type: 'ADD_LAYER', id: uuidv4(), name: `Layer ${layers.length + 1}` })}
          style={{ flex: 1, padding: '4px 0', fontSize: 10, background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 3, color: 'var(--tx)', cursor: 'pointer' }}>
          + New layer
        </button>
        <button
          onClick={() => {
            const active = layers.find(l => l.id === activeLayerId);
            if (!active || active.locked) return;
            dispatch({ type: 'REMOVE_LAYER', id: activeLayerId });
          }}
          style={{ padding: '4px 8px', fontSize: 10, background: 'rgba(226,75,74,0.15)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 3, color: 'var(--red)', cursor: 'pointer' }}>
          🗑
        </button>
      </div>
    </div>
  );
}
