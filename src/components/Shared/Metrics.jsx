import { useLayout } from '../../context/LayoutContext';
import { useBrief } from '../../context/BriefContext';
import { checkConstraints } from '../../lib/constraints';
import { BLOCK } from '../../lib/constants';

export default function Metrics() {
  const { rooms } = useLayout();
  const { state: brief } = useBrief();
  const warnings = checkConstraints(rooms, BLOCK);

  const builtRooms = rooms.filter(r => r.category !== 'outdoor' && r.category !== 'furniture');
  const totalM2 = builtRooms.reduce((a, r) => a + r.w * r.d, 0);
  const coveragePct = (totalM2 / BLOCK.maxFootprintM2) * 100;
  const overLimit = coveragePct > 100;

  // category breakdown
  const byCategory = {};
  rooms.filter(r => r.category !== 'furniture').forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + r.w * r.d;
  });

  // missing essential rooms
  const placedLabels = new Set(rooms.map(r => r.label.toLowerCase()));
  const missing = brief.programme.filter(p => p.checked && p.priority === 'essential' && !placedLabels.has(p.name.toLowerCase()));

  const coverageWarnings = warnings.filter(w => w.type === 'coverage');
  const setbackWarnings = warnings.filter(w => w.type === 'setback');
  const overlapWarnings = warnings.filter(w => w.type === 'overlap');

  return (
    <div style={{ padding: '8px', background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', fontSize: 11 }}>
      {/* footprint bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: 'var(--tx2)' }}>Footprint</span>
        <span style={{ color: overLimit ? 'var(--red)' : 'var(--tx)', fontWeight: 600 }}>
          {totalM2.toFixed(0)} / {BLOCK.maxFootprintM2} m²
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, coveragePct)}%`,
          background: overLimit ? 'var(--red)' : coveragePct > 80 ? '#f08020' : 'var(--green)',
          borderRadius: 3, transition: 'width 0.3s',
        }} />
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
            <span key={p.id} style={{ display: 'inline-block', background: 'rgba(226,75,74,0.15)', color: 'var(--red)', borderRadius: 3, padding: '1px 4px', fontSize: 9, marginRight: 3, marginBottom: 2 }}>
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* warnings */}
      {coverageWarnings.length > 0 && (
        <div style={{ color: 'var(--red)', fontSize: 10, marginBottom: 2 }}>⚠ {coverageWarnings[0].message}</div>
      )}
      {setbackWarnings.length > 0 && (
        <div style={{ color: '#f08020', fontSize: 10, marginBottom: 2 }}>⚠ {setbackWarnings.length} setback violation{setbackWarnings.length > 1 ? 's' : ''}</div>
      )}
      {overlapWarnings.length > 0 && (
        <div style={{ color: '#f0c040', fontSize: 10 }}>⚠ {overlapWarnings.length / 2} overlap{overlapWarnings.length / 2 > 1 ? 's' : ''}</div>
      )}
    </div>
  );
}
