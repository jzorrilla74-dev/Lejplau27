import { Lock, Unlock } from 'lucide-react';
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

  const field = {
    width: '100%', padding: '0 10px', marginBottom: 4, height: 34,
    background: 'var(--bg-1)', border: '1px solid var(--bd-2)',
    borderRadius: 'var(--radius)', color: 'var(--tx)', fontSize: 13,
  };
  const lbl = { fontSize: 11, color: 'var(--tx-3)', marginBottom: 3, display: 'block',
    fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' };

  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bd)', background: 'var(--bg-1)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tx-2)', marginBottom: 8 }}>Inspector</div>

      <label style={lbl}>Label</label>
      <input style={field} value={room.label} onChange={e => update({ label: e.target.value })} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
        <div>
          <label style={lbl}>W (m)</label>
          <input style={{ ...field, marginBottom: 0 }} type="number" step="0.5" min="0.5" value={room.w}
            onChange={e => update({ w: Math.max(0.5, parseFloat(e.target.value) || 0.5) })} />
        </div>
        <div>
          <label style={lbl}>D (m)</label>
          <input style={{ ...field, marginBottom: 0 }} type="number" step="0.5" min="0.5" value={room.d}
            onChange={e => update({ d: Math.max(0.5, parseFloat(e.target.value) || 0.5) })} />
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
        {room.w} × {room.d} m · <span style={{ color: 'var(--accent)' }}>{area} m²</span>
      </div>

      <label style={lbl}>Rotation</label>
      <div style={{ display: 'flex', gap: 2, marginBottom: 8, background: 'var(--bg-2)', borderRadius: 6, padding: 2 }}>
        {[0, 90, 180, 270].map(deg => (
          <button key={deg}
            onClick={() => update({ rotation: deg })}
            style={{
              flex: 1, padding: '4px 0', fontSize: 10,
              background: room.rotation === deg ? 'var(--bg-1)' : 'transparent',
              boxShadow: room.rotation === deg ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              border: 'none', borderRadius: 4, color: room.rotation === deg ? 'var(--tx)' : 'var(--tx-3)', cursor: 'pointer',
            }}>
            {deg}°
          </button>
        ))}
      </div>

      <label style={lbl}>Category</label>
      <select style={{ ...field, marginBottom: 8 }} value={room.category} onChange={e => update({ category: e.target.value })}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label style={lbl}>Layer</label>
      <select style={{ ...field, marginBottom: 8 }} value={room.layerId} onChange={e => update({ layerId: e.target.value })}>
        {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <button
        onClick={() => update({ locked: !room.locked })}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', fontSize: 11, marginBottom: 8,
          background: room.locked ? 'rgba(224,130,90,0.12)' : 'var(--bg-2)',
          border: `1px solid ${room.locked ? 'var(--accent)' : 'var(--bd-2)'}`,
          borderRadius: 4, color: room.locked ? 'var(--accent)' : 'var(--tx-2)', cursor: 'pointer',
        }}>
        {room.locked
          ? <><Lock size={12} strokeWidth={1.6} /> Locked</>
          : <><Unlock size={12} strokeWidth={1.6} /> Unlocked</>}
      </button>

      <label style={lbl}>Notes</label>
      <textarea style={{ ...field, height: 'auto', minHeight: 48, padding: '8px 10px', resize: 'vertical', marginBottom: 10 }}
        value={room.notes} onChange={e => update({ notes: e.target.value })} />

      {/* Ghost remove button */}
      <button
        onClick={() => {
          lDispatch({ type: 'REMOVE_ROOM', uid: room.uid });
          cDispatch({ type: 'DESELECT' });
        }}
        style={{
          width: '100%', padding: '6px 0', fontSize: 11,
          background: 'transparent', border: '1px solid var(--bd-2)',
          borderRadius: 4, color: 'var(--tx-2)', cursor: 'pointer',
          transition: 'color .15s, border-color .15s, background .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--red)';
          e.currentTarget.style.borderColor = 'var(--red)';
          e.currentTarget.style.background = 'rgba(229,138,122,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--tx-2)';
          e.currentTarget.style.borderColor = 'var(--bd-2)';
          e.currentTarget.style.background = 'transparent';
        }}>
        Remove room
      </button>
    </div>
  );
}
