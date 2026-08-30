import { useState } from 'react';
import { useLayout } from '../../context/LayoutContext';
import { useBrief } from '../../context/BriefContext';
import { checkConstraints } from '../../lib/constraints';
import { checkMelbourneCompliance } from '../../lib/melbourneRegs';
import { BLOCK } from '../../lib/constants';

export default function Metrics() {
  const [open, setOpen] = useState(false);
  const { rooms, partyWallStartM } = useLayout();
  const { state: brief } = useBrief();
  const warnings = checkConstraints(rooms, BLOCK);
  const compliance = checkMelbourneCompliance(rooms, BLOCK);

  const builtRooms = rooms.filter(r => r.category !== 'outdoor' && r.category !== 'furniture');

  // Footprint = bounding box of all built rooms, not the sum of individual areas.
  // Room coordinates (x, y, w, d) are already in metres.
  let footprintM2 = 0;
  if (builtRooms.length > 0) {
    const minX = Math.min(...builtRooms.map(r => r.x));
    const maxX = Math.max(...builtRooms.map(r => r.x + r.w));
    const minY = Math.min(...builtRooms.map(r => r.y));
    const maxY = Math.max(...builtRooms.map(r => r.y + r.d));
    footprintM2 = (maxX - minX) * (maxY - minY);
  }
  const coveragePct = (footprintM2 / BLOCK.maxFootprintM2) * 100;
  const overLimit = coveragePct > 100;

  const byCategory = {};
  rooms.filter(r => r.category !== 'furniture').forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + r.w * r.d;
  });

  const placedLabels = new Set(rooms.map(r => r.label.toLowerCase()));
  const missing = brief.programme.filter(p => p.checked && p.priority === 'essential' && !placedLabels.has(p.name.toLowerCase()));

  const coverageWarnings = warnings.filter(w => w.type === 'coverage');
  const setbackWarnings  = warnings.filter(w => w.type === 'setback');
  const overlapWarnings  = warnings.filter(w => w.type === 'overlap');
  const compErrors   = compliance.filter(w => w.severity === 'error');
  const compWarnings = compliance.filter(w => w.severity === 'warning');

  return (
    <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', fontSize: 11 }}>
      {/* collapse header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--tx2)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase',
        }}
      >
        <span>Metrics</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && <div style={{ padding: '0 8px 8px' }}>
      {/* footprint bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: 'var(--tx2)' }}>Footprint</span>
        <span style={{ color: overLimit ? 'var(--red)' : 'var(--tx)', fontWeight: 600 }}>
          {footprintM2.toFixed(1)} / {BLOCK.maxFootprintM2} m²
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, coveragePct)}%`,
          background: overLimit ? 'var(--red)' : coveragePct > 80 ? 'var(--amber)' : 'var(--green)',
          borderRadius: 3, transition: 'width 0.3s',
        }} />
      </div>

      {/* party wall position */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10 }}>
        <span style={{ color: 'var(--tx2)' }}>Party wall</span>
        <span style={{ color: 'var(--tx3)', fontFamily: 'var(--font-mono)' }}>
          {partyWallStartM.toFixed(2)}m from street
        </span>
      </div>

      {/* category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: 10 }}>
          <tbody>
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, m2]) => (
              <tr key={cat}>
                <td style={{ color: 'var(--tx2)', paddingRight: 4 }}>{cat}</td>
                <td style={{ color: 'var(--tx)', textAlign: 'right' }}>{m2.toFixed(0)} m²</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* missing essentials */}
      {missing.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ color: 'var(--tx2)', fontSize: 10, marginBottom: 2 }}>Missing essentials:</div>
          {missing.map(p => (
            <span key={p.id} style={{ display: 'inline-block', background: 'rgba(196,123,107,0.15)', color: 'var(--red)', borderRadius: 3, padding: '1px 4px', fontSize: 9, marginRight: 3, marginBottom: 2 }}>
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* constraint warnings */}
      {coverageWarnings.length > 0 && (
        <div style={{ color: 'var(--red)', fontSize: 10, marginBottom: 2 }}>⚠ {coverageWarnings[0].message}</div>
      )}
      {setbackWarnings.length > 0 && (
        <div style={{ color: 'var(--amber)', fontSize: 10, marginBottom: 2 }}>⚠ {setbackWarnings.length} setback violation{setbackWarnings.length > 1 ? 's' : ''}</div>
      )}
      {overlapWarnings.length > 0 && (
        <div style={{ color: '#f0c040', fontSize: 10, marginBottom: 4 }}>⚠ {overlapWarnings.length / 2} overlap{overlapWarnings.length / 2 > 1 ? 's' : ''}</div>
      )}

      {/* Melbourne compliance */}
      {compliance.length > 0 && (
        <div style={{ marginTop: 4, borderTop: '1px solid var(--bd)', paddingTop: 6 }}>
          <div style={{ color: 'var(--tx2)', fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Clause 54
          </div>
          {compErrors.map((w, i) => (
            <div key={i} style={{ color: 'var(--red)', fontSize: 10, marginBottom: 2, lineHeight: 1.4 }}>
              ✕ [{w.type}] {w.message}
            </div>
          ))}
          {compWarnings.map((w, i) => (
            <div key={i} style={{ color: 'var(--amber)', fontSize: 10, marginBottom: 2, lineHeight: 1.4 }}>
              ▲ [{w.type}] {w.message}
            </div>
          ))}
        </div>
      )}
      </div>}
    </div>
  );
}
