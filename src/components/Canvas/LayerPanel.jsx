import { v4 as uuidv4 } from 'uuid';
import { Eye, EyeOff, Lock, Unlock, Trash2, X } from 'lucide-react';
import { useLayers } from '../../context/LayerContext';

const ICON = { size: 12, strokeWidth: 1.6 };

export default function LayerPanel({ onClose }) {
  const { layers, activeLayerId, dispatch } = useLayers();
  const sorted = [...layers].sort((a, b) => b.order - a.order);

  return (
    <div style={{
      position: 'absolute', top: 36, right: 0,
      width: 230, background: 'var(--bg-1)',
      border: '1px solid var(--bd-2)', borderRadius: 6,
      zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--tx-2)' }}>Layers</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', display: 'flex', padding: 2 }}>
          <X {...ICON} />
        </button>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {sorted.map(layer => (
          <div
            key={layer.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE', id: layer.id })}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
              background: activeLayerId === layer.id ? 'rgba(224,130,90,0.10)' : 'transparent',
              borderLeft: activeLayerId === layer.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
            }}>
            {/* visibility */}
            <button
              onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_VISIBLE', id: layer.id }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: layer.visible ? 'var(--tx-2)' : 'var(--tx-3)', display: 'flex' }}
              title="Toggle visibility">
              {layer.visible ? <Eye {...ICON} /> : <EyeOff {...ICON} />}
            </button>

            {/* lock */}
            <button
              onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LOCKED', id: layer.id }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: layer.locked ? 'var(--accent)' : 'var(--tx-3)', display: 'flex' }}
              title="Toggle lock">
              {layer.locked ? <Lock {...ICON} /> : <Unlock {...ICON} />}
            </button>

            {/* name */}
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
              style={{ width: 48, height: 4, accentColor: 'var(--accent)' }}
            />
          </div>
        ))}
      </div>

      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 4 }}>
        <button
          onClick={() => dispatch({ type: 'ADD_LAYER', id: uuidv4(), name: `Layer ${layers.length + 1}` })}
          style={{ flex: 1, padding: '4px 0', fontSize: 10, background: 'var(--bg-2)', border: '1px solid var(--bd-2)', borderRadius: 4, color: 'var(--tx-2)', cursor: 'pointer' }}>
          + New layer
        </button>
        {activeLayerId === 'furniture' ? (
          <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--tx-3)', fontSize: 9 }}>
            <Lock size={10} strokeWidth={1.6} /> top
          </div>
        ) : (
          <button
            onClick={() => {
              const active = layers.find(l => l.id === activeLayerId);
              if (!active || active.locked) return;
              dispatch({ type: 'REMOVE_LAYER', id: activeLayerId });
            }}
            style={{ padding: '4px 8px', background: 'rgba(229,138,122,0.12)', border: '1px solid rgba(229,138,122,0.25)', borderRadius: 4, color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={12} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  );
}
