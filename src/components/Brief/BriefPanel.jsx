import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBrief } from '../../context/BriefContext';
import { generateBriefSummary } from '../../lib/briefSummary';

const PRIORITIES = ['essential', 'desired', 'optional'];
const AESTHETICS = ['Japanese minimal', 'Persian courtyard', 'Japanese/Persian courtyard', 'Other'];

function Section({ title, open, onToggle, children }) {
  return (
    <div style={{ borderBottom: '1px solid var(--bd)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 10px', background: 'var(--bg2)', border: 'none', cursor: 'pointer',
          color: 'var(--tx)', fontSize: 11, fontWeight: 600,
        }}>
        {title}
        <span style={{ color: 'var(--tx3)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '8px 10px', background: 'var(--bg)' }}>{children}</div>}
    </div>
  );
}

const fieldStyle = {
  width: '100%', padding: '4px 6px', marginBottom: 4,
  background: 'var(--bg3)', border: '1px solid var(--bd2)',
  borderRadius: 3, color: 'var(--tx)', fontSize: 11,
};
const labelStyle = { fontSize: 10, color: 'var(--tx2)', marginBottom: 2, display: 'block' };

export default function BriefPanel({ open = true, onToggle }) {
  const { state, dispatch } = useBrief();
  const [openSection, setOpenSection] = useState('household');

  function toggle(s) { setOpenSection(o => o === s ? null : s); }

  const summary = generateBriefSummary(state);

  if (!open) {
    return (
      <div
        onClick={onToggle}
        title="Expand Brief panel"
        style={{
          width: 40, height: '100%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRight: '1px solid var(--bd)', background: 'var(--bg-1)',
          cursor: 'pointer',
        }}>
        <span style={{
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
          textTransform: 'uppercase', color: 'var(--tx-3)',
        }}>BRIEF</span>
      </div>
    );
  }

  return (
    <div style={{ width: 280, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--bd)', overflow: 'hidden', background: 'var(--bg2)' }}>
      {/* header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--bd)', background: 'var(--bg3)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 2 }}>BRIEF</div>
        <input
          value={state.projectName}
          onChange={e => dispatch({ type: 'SET_PROJECT_NAME', value: e.target.value })}
          style={{ ...fieldStyle, marginBottom: 0, fontWeight: 600, fontSize: 12 }}
        />
        </div>
        <button onClick={onToggle} title="Collapse" style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', padding: 2, fontSize: 12, marginTop: 2 }}>‹</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Household */}
        <Section title="Household" open={openSection === 'household'} onToggle={() => toggle('household')}>
          <label style={labelStyle}>Occupants</label>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button onClick={() => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { occupants: Math.max(1, state.household.occupants - 1) } })}
              style={{ ...btnStyle }}>−</button>
            <span style={{ flex: 1, textAlign: 'center', lineHeight: '28px', fontSize: 13, color: 'var(--tx)' }}>{state.household.occupants}</span>
            <button onClick={() => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { occupants: state.household.occupants + 1 } })}
              style={{ ...btnStyle }}>+</button>
          </div>

          <label style={labelStyle}>Children</label>
          <ToggleButton
            value={state.household.children}
            onChange={v => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { children: v } })}
            labels={['No', 'Yes']}
          />

          <label style={{ ...labelStyle, marginTop: 6 }}>Pets</label>
          <input style={fieldStyle} value={state.household.pets}
            onChange={e => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { pets: e.target.value } })} />

          <label style={labelStyle}>Work from home</label>
          <ToggleButton
            value={state.household.workFromHome}
            onChange={v => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { workFromHome: v } })}
            labels={['No', 'Yes']}
          />
          {state.household.workFromHome && (
            <>
              <label style={{ ...labelStyle, marginTop: 6 }}>WFH description</label>
              <input style={fieldStyle} value={state.household.whfDescription}
                onChange={e => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { whfDescription: e.target.value } })} />
            </>
          )}

          <label style={{ ...labelStyle, marginTop: 4 }}>Accessibility needs</label>
          <input style={fieldStyle} value={state.household.accessibility}
            onChange={e => dispatch({ type: 'UPDATE_HOUSEHOLD', patch: { accessibility: e.target.value } })}
            placeholder="e.g. step-free access" />
        </Section>

        {/* Programme */}
        <Section title="Programme" open={openSection === 'programme'} onToggle={() => toggle('programme')}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr>
                {['', 'Room', 'm²', 'Priority'].map(h => (
                  <th key={h} style={{ color: 'var(--tx3)', fontWeight: 500, textAlign: 'left', paddingBottom: 4, fontSize: 9 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.programme.map(p => (
                <tr key={p.id}>
                  <td style={{ paddingRight: 4 }}>
                    <input type="checkbox" checked={p.checked}
                      onChange={e => dispatch({ type: 'UPDATE_PROGRAMME_ITEM', id: p.id, patch: { checked: e.target.checked } })} />
                  </td>
                  <td style={{ paddingRight: 4 }}>
                    <input
                      value={p.name}
                      onChange={e => dispatch({ type: 'UPDATE_PROGRAMME_ITEM', id: p.id, patch: { name: e.target.value } })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--tx)', fontSize: 10, padding: '1px 0' }}
                    />
                  </td>
                  <td style={{ paddingRight: 4 }}>
                    <input type="number" value={p.targetM2} min={1}
                      onChange={e => dispatch({ type: 'UPDATE_PROGRAMME_ITEM', id: p.id, patch: { targetM2: parseFloat(e.target.value) || 0 } })}
                      style={{ width: 32, background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 2, color: 'var(--tx)', fontSize: 10, padding: '1px 2px' }}
                    />
                  </td>
                  <td>
                    <select
                      value={p.priority}
                      onChange={e => dispatch({ type: 'UPDATE_PROGRAMME_ITEM', id: p.id, patch: { priority: e.target.value } })}
                      style={{ background: 'var(--bg3)', border: 'none', color: 'var(--tx2)', fontSize: 9, width: '100%' }}>
                      {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => dispatch({ type: 'ADD_PROGRAMME_ITEM', item: { id: uuidv4(), name: 'Room', targetM2: 10, priority: 'optional', checked: true } })}
            style={{ marginTop: 6, padding: '3px 8px', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 3, color: 'var(--tx2)', fontSize: 10, cursor: 'pointer' }}>
            + Add row
          </button>
        </Section>

        {/* Design Priorities */}
        <Section title="Design Priorities" open={openSection === 'priorities'} onToggle={() => toggle('priorities')}>
          <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 4 }}>Drag to reorder</div>
          {state.priorities.map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, padding: '3px 6px', background: 'var(--bg2)', borderRadius: 3, fontSize: 11 }}>
              <span style={{ color: 'var(--tx3)', fontSize: 10, width: 14 }}>{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--tx)' }}>{p}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {i > 0 && <button onClick={() => {
                  const arr = [...state.priorities];
                  [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                  dispatch({ type: 'REORDER_PRIORITIES', priorities: arr });
                }} style={{ ...microBtn }}>↑</button>}
                {i < state.priorities.length - 1 && <button onClick={() => {
                  const arr = [...state.priorities];
                  [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                  dispatch({ type: 'REORDER_PRIORITIES', priorities: arr });
                }} style={{ ...microBtn }}>↓</button>}
              </div>
            </div>
          ))}
        </Section>

        {/* Style */}
        <Section title="Style" open={openSection === 'style'} onToggle={() => toggle('style')}>
          <label style={labelStyle}>Aesthetic</label>
          <select style={fieldStyle} value={state.style.aesthetic}
            onChange={e => dispatch({ type: 'UPDATE_STYLE', patch: { aesthetic: e.target.value } })}>
            {AESTHETICS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <label style={labelStyle}>Materials</label>
          <textarea style={{ ...fieldStyle, resize: 'vertical', minHeight: 40 }} value={state.style.materials}
            onChange={e => dispatch({ type: 'UPDATE_STYLE', patch: { materials: e.target.value } })} />

          <label style={labelStyle}>References / inspirations</label>
          <textarea style={{ ...fieldStyle, resize: 'vertical', minHeight: 40 }} value={state.style.references}
            onChange={e => dispatch({ type: 'UPDATE_STYLE', patch: { references: e.target.value } })} />

          <label style={labelStyle}>Avoid</label>
          <textarea style={{ ...fieldStyle, resize: 'vertical', minHeight: 40 }} value={state.style.avoid}
            onChange={e => dispatch({ type: 'UPDATE_STYLE', patch: { avoid: e.target.value } })} />
        </Section>

        {/* Site Notes */}
        <Section title="Site Notes" open={openSection === 'siteNotes'} onToggle={() => toggle('siteNotes')}>
          <textarea style={{ ...fieldStyle, resize: 'vertical', minHeight: 80 }} value={state.siteNotes}
            onChange={e => dispatch({ type: 'UPDATE_SITE_NOTES', value: e.target.value })} />
        </Section>

        {/* Summary */}
        <div style={{ padding: 10, background: 'var(--bg2)', margin: '8px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx2)', marginBottom: 4 }}>BRIEF SUMMARY</div>
          <div style={{ fontSize: 10, color: 'var(--tx)', lineHeight: 1.5, fontStyle: 'italic' }}>{summary}</div>
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ value, onChange, labels }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
      {[false, true].map((v, i) => (
        <button key={i} onClick={() => onChange(v)}
          style={{
            flex: 1, padding: '3px 0', fontSize: 10,
            background: value === v ? 'var(--accent)' : 'var(--bg3)',
            border: '1px solid var(--bd2)', borderRadius: 3,
            color: value === v ? 'white' : 'var(--tx)', cursor: 'pointer',
          }}>
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

const btnStyle = {
  width: 28, height: 28, background: 'var(--bg3)', border: '1px solid var(--bd2)',
  borderRadius: 3, color: 'var(--tx)', fontSize: 14, cursor: 'pointer', lineHeight: 1,
};
const microBtn = {
  width: 16, height: 14, background: 'var(--bg3)', border: '1px solid var(--bd)',
  borderRadius: 2, color: 'var(--tx3)', fontSize: 8, cursor: 'pointer', padding: 0,
};
