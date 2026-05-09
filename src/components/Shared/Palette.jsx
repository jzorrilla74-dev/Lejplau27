import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ROOM_GROUPS, CAT_STYLES } from '../../lib/roomDefaults';
import { BLOCK } from '../../lib/constants';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { useBrief } from '../../context/BriefContext';

// Initial placement point inside buildable envelope
const PLACE_X = BLOCK.setbacks.north + 0.5;
const PLACE_Y = BLOCK.setbacks.front + 0.5;

export default function Palette() {
  const [openGroup, setOpenGroup] = useState('sleeping');
  const [search, setSearch] = useState('');
  const { dispatch } = useLayout();
  const { activeLayerId } = useLayers();
  const { state: brief } = useBrief();

  const essentialNames = new Set(
    brief.programme.filter(p => p.checked && p.priority === 'essential').map(p => p.name.toLowerCase())
  );

  function addRoom(def) {
    dispatch({
      type: 'ADD_ROOM',
      room: {
        uid: uuidv4(),
        defId: def.defId,
        label: def.label,
        x: PLACE_X,
        y: PLACE_Y,
        w: def.w,
        d: def.d,
        rotation: 0,
        category: def.category,
        locked: false,
        notes: '',
        layerId: def.category === 'furniture' ? 'furniture' : activeLayerId,
      },
    });
  }

  const lowerSearch = search.toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--bd)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search rooms…"
          style={{ width: '100%', padding: '4px 6px', fontSize: 11 }}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {ROOM_GROUPS.map(group => {
          const filtered = search
            ? group.defs.filter(d => d.label.toLowerCase().includes(lowerSearch))
            : group.defs;
          if (search && filtered.length === 0) return null;

          const catStyle = CAT_STYLES[group.id];
          const isOpen = search ? true : openGroup === group.id;

          return (
            <div key={group.id}>
              <button
                onClick={() => setOpenGroup(isOpen ? null : group.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 8px', background: 'var(--bg2)', border: 'none',
                  borderBottom: '1px solid var(--bd)', cursor: 'pointer',
                  color: 'var(--tx)', fontSize: 11, fontWeight: 600,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 2, background: catStyle.stroke, flexShrink: 0 }} />
                {group.label}
                <span style={{ marginLeft: 'auto', color: 'var(--tx3)', fontSize: 10 }}>{filtered.length}</span>
              </button>

              {isOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, padding: '4px 6px', background: 'var(--bg)' }}>
                  {filtered.map(def => {
                    const isRequired = essentialNames.has(def.label.toLowerCase());
                    return (
                      <button
                        key={def.defId}
                        onClick={() => addRoom(def)}
                        title={isRequired ? 'Required by brief' : `${def.w}×${def.d}m`}
                        style={{
                          padding: '4px 3px',
                          background: catStyle.fill,
                          border: `1px solid ${isRequired ? catStyle.stroke : 'rgba(0,0,0,0.1)'}`,
                          borderRadius: 3,
                          cursor: 'pointer',
                          fontSize: 9,
                          color: '#1a1a18',
                          textAlign: 'center',
                          lineHeight: 1.3,
                          outline: isRequired ? `2px solid ${catStyle.stroke}` : 'none',
                          outlineOffset: -2,
                        }}
                      >
                        <div style={{ fontWeight: isRequired ? 700 : 400 }}>{def.label}</div>
                        <div style={{ color: '#888', fontSize: 8 }}>{def.w}×{def.d}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
