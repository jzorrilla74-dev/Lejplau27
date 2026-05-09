import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { CAT_STYLES } from '../../lib/roomDefaults';

const CATEGORIES = Object.keys(CAT_STYLES);

export default function Inspector() {
  const { selectedUid, dispatch: cDispatch } = useCanvas();
  const { rooms, dispatch: lDispatch } = useLayout();
  const { layers } = useLayers();

  if (!selectedUid) return null;
  const room = rooms.find(r => r.uid === selectedUid);
  if (!room) return null;

  function update(patch) {
    lDispatch({ type: 'UPDATE_ROOM', uid: room.uid, patch });
  }

  const area = (room.w * room.d).toFixed(1);

  const fieldStyle = {
    width: '100%', padding: '3px 5px', marginBottom: 4,
    background: 'var(--bg3)', border: '1px solid var(--bd2)',
    borderRadius: 3, color: 'var(--tx)', fontSize: 11,
  };
  const labelStyle = { fontSize: 10, color: 'var(--tx2)', marginBottom: 2, display: 'block' };

  return (
    <div style={{ padding: 8, borderTop: '1px solid var(--bd)', background: 'var(--bg2)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--tx)' }}>Inspector</div>

      <label style={labelStyle}>Label</label>
      <input style={fieldStyle} value={room.label} onChange={e => update({ label: e.target.value })} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <div>
          <label style={labelStyle}>Width (m)</label>
          <input style={fieldStyle} type="number" step="0.5" min="0.5" value={room.w}
            onChange={e => update({ w: Math.max(0.5, parseFloat(e.target.value) || 0.5) })} />
        </div>
        <div>
          <label style={labelStyle}>Depth (m)</label>
          <input style={fieldStyle} type="number" step="0.5" min="0.5" value={room.d}
            onChange={e => update({ d: Math.max(0.5, parseFloat(e.target.value) || 0.5) })} />
        </div>
      </div>

      <label style={labelStyle}>Area: <span style={{ color: 'var(--tx)' }}>{area} m²</span></label>

      <label style={labelStyle}>Rotation</label>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0, 90, 180, 270].map(deg => (
          <button key={deg}
            onClick={() => update({ rotation: deg })}
            style={{
              flex: 1, padding: '3px 0', fontSize: 10,
              background: room.rotation === deg ? 'var(--accent)' : 'var(--bg3)',
              border: '1px solid var(--bd2)', borderRadius: 3, color: 'var(--tx)', cursor: 'pointer',
            }}>
            {deg}°
          </button>
        ))}
      </div>

      <label style={labelStyle}>Category</label>
      <select style={fieldStyle} value={room.category} onChange={e => update({ category: e.target.value })}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label style={labelStyle}>Layer</label>
      <select style={fieldStyle} value={room.layerId} onChange={e => update({ layerId: e.target.value })}>
        {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <button
          onClick={() => update({ locked: !room.locked })}
          style={{
            flex: 1, padding: '4px 0', fontSize: 10,
            background: room.locked ? 'var(--accent)' : 'var(--bg3)',
            border: '1px solid var(--bd2)', borderRadius: 3, color: 'var(--tx)', cursor: 'pointer',
          }}>
          {room.locked ? '🔒 Locked' : '🔓 Unlocked'}
        </button>
      </div>

      <label style={labelStyle}>Notes</label>
      <textarea style={{ ...fieldStyle, resize: 'vertical', minHeight: 40 }}
        value={room.notes} onChange={e => update({ notes: e.target.value })} />

      <button
        onClick={() => {
          lDispatch({ type: 'REMOVE_ROOM', uid: room.uid });
          cDispatch({ type: 'DESELECT' });
        }}
        style={{
          width: '100%', padding: '5px 0', fontSize: 11,
          background: 'var(--red)', border: 'none', borderRadius: 3,
          color: 'white', cursor: 'pointer', marginTop: 4,
        }}>
        Remove Room
      </button>
    </div>
  );
}
