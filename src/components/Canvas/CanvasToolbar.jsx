import { useState } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { useBrief } from '../../context/BriefContext';
import { useCritic } from '../../context/CriticContext';
import { saveJSON } from '../../lib/exportJSON';
import { exportSVG } from '../../lib/exportSVG';
import { parseImportedJSON } from '../../lib/importJSON';
import { SCALE_MIN, SCALE_MAX } from '../../lib/constants';
import LayerPanel from './LayerPanel';

const TOOLS = [
  { id: 'select', label: 'S', title: 'Select (V)' },
  { id: 'pan',    label: 'H', title: 'Pan (H)' },
];

export default function CanvasToolbar({ stageRef }) {
  const { scale, activeTool, gridVisible, theme, canUndo, canRedo, dispatch, undo, redo } = useCanvas();
  const canvasCtx = useCanvas();
  const layout = useLayout();
  const { layers } = useLayers();
  const { state: brief } = useBrief();
  const { apiKey } = useCritic();
  const [showLayers, setShowLayers] = useState(false);

  const placedEssential = (() => {
    const essentials = brief.programme.filter(p => p.checked && p.priority === 'essential');
    const placedLabels = new Set(layout.rooms.map(r => r.label.toLowerCase()));
    const placed = essentials.filter(p => placedLabels.has(p.name.toLowerCase())).length;
    return { placed, total: essentials.length };
  })();

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const text = await e.target.files[0].text();
        const data = parseImportedJSON(text);
        layout.dispatch({ type: 'LOAD_LAYOUT', rooms: data.rooms, partyWallStartM: data.partyWallStartM });
        if (data.theme) dispatch({ type: data.theme === 'light' ? 'TOGGLE_THEME' : 'TOGGLE_THEME' });
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  }

  function adjustScale(delta) {
    const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale + delta));
    dispatch({ type: 'SET_SCALE', scale: next });
  }

  const btnStyle = (active) => ({
    padding: '3px 6px', fontSize: 10, fontWeight: 600,
    background: active ? 'var(--accent)' : 'var(--bg3)',
    border: '1px solid var(--bd2)', borderRadius: 3,
    color: active ? 'white' : 'var(--tx)', cursor: 'pointer',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
      background: 'var(--bg3)', borderBottom: '1px solid var(--bd)',
      fontSize: 11, flexWrap: 'wrap', position: 'relative',
    }}>
      {/* tools */}
      {TOOLS.map(t => (
        <button key={t.id} title={t.title}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: t.id })}
          style={btnStyle(activeTool === t.id)}>
          {t.label}
        </button>
      ))}

      <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />

      {/* undo/redo */}
      <button onClick={layout.undo} disabled={!layout.canUndo} style={{ ...btnStyle(false), opacity: layout.canUndo ? 1 : 0.4 }} title="Undo (⌘Z)">↩</button>
      <button onClick={layout.redo} disabled={!layout.canRedo} style={{ ...btnStyle(false), opacity: layout.canRedo ? 1 : 0.4 }} title="Redo (⌘⇧Z)">↪</button>

      <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />

      {/* zoom */}
      <button onClick={() => adjustScale(-2)} style={btnStyle(false)}>−</button>
      <span style={{ fontSize: 10, color: 'var(--tx2)', minWidth: 36, textAlign: 'center' }}>{scale}px/m</span>
      <button onClick={() => adjustScale(2)} style={btnStyle(false)}>+</button>

      <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />

      {/* grid / theme */}
      <button onClick={() => dispatch({ type: 'TOGGLE_GRID' })} style={btnStyle(gridVisible)} title="Toggle grid">⊞</button>
      <button onClick={() => dispatch({ type: 'TOGGLE_THEME' })} style={btnStyle(false)} title="Toggle theme">{theme === 'dark' ? '☀' : '🌙'}</button>

      <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />

      {/* layers */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowLayers(s => !s)} style={btnStyle(showLayers)} title="Layers">Layers</button>
        {showLayers && <LayerPanel onClose={() => setShowLayers(false)} />}
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />

      {/* save / load / export */}
      <button onClick={() => saveJSON(brief, layout, layers, theme)} style={btnStyle(false)} title="Save JSON">💾</button>
      <button onClick={handleImport} style={btnStyle(false)} title="Load JSON">📂</button>
      <button onClick={() => exportSVG(stageRef)} style={btnStyle(false)} title="Export PNG">🖼</button>

      {/* programme completeness */}
      <div style={{ marginLeft: 'auto', fontSize: 9, color: placedEssential.placed === placedEssential.total ? 'var(--green)' : 'var(--tx3)' }}>
        {placedEssential.placed}/{placedEssential.total} essential rooms placed
      </div>
    </div>
  );
}
