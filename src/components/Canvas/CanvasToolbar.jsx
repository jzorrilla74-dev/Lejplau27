import { useState } from 'react';
import {
  MousePointer2, Hand, Undo2, Redo2, Minus, Plus,
  Grid3x3, Sun, Moon, Layers, Save, Upload, ImageDown,
} from 'lucide-react';
import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { useBrief } from '../../context/BriefContext';
import { saveJSON } from '../../lib/exportJSON';
import { exportSVG } from '../../lib/exportSVG';
import { exportDXF } from '../../lib/exportDXF';
import { parseImportedJSON } from '../../lib/importJSON';
import { SCALE_MIN, SCALE_MAX } from '../../lib/constants';
import LayerPanel from './LayerPanel';

const ICON_SIZE = 14;
const ICON_SW   = 1.6;

export default function CanvasToolbar({ stageRef }) {
  const { scale, activeTool, gridVisible, theme, dispatch } = useCanvas();
  const layout = useLayout();
  const { layers } = useLayers();
  const { state: brief } = useBrief();
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

  const btn = (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '4px 7px', height: 28,
    background: active ? 'var(--accent)' : 'transparent',
    border: 'none', borderRadius: 4,
    color: active ? 'white' : 'var(--tx-2)', cursor: 'pointer',
  });

  const sep = <div style={{ width: 1, height: 16, background: 'var(--bd-2)', margin: '0 2px' }} />;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1, padding: '0 8px',
      height: 36, background: 'var(--bg-1)', borderBottom: '1px solid var(--bd)',
      position: 'relative', flexShrink: 0,
    }}>
      {/* tools */}
      <button title="Select (V)" onClick={() => dispatch({ type: 'SET_TOOL', tool: 'select' })} style={btn(activeTool === 'select')}>
        <MousePointer2 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Pan (H)" onClick={() => dispatch({ type: 'SET_TOOL', tool: 'pan' })} style={btn(activeTool === 'pan')}>
        <Hand size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      {/* undo / redo */}
      <button title="Undo (⌘Z)" onClick={layout.undo} disabled={!layout.canUndo}
        style={{ ...btn(false), opacity: layout.canUndo ? 1 : 0.35 }}>
        <Undo2 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Redo (⌘⇧Z)" onClick={layout.redo} disabled={!layout.canRedo}
        style={{ ...btn(false), opacity: layout.canRedo ? 1 : 0.35 }}>
        <Redo2 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      {/* zoom */}
      <button title="Zoom out" onClick={() => adjustScale(-2)} style={btn(false)}>
        <Minus size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <span style={{ fontSize: 10, color: 'var(--tx-3)', minWidth: 40, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        {scale}px/m
      </span>
      <button title="Zoom in" onClick={() => adjustScale(2)} style={btn(false)}>
        <Plus size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      {/* grid / theme */}
      <button title="Toggle grid" onClick={() => dispatch({ type: 'TOGGLE_GRID' })} style={btn(gridVisible)}>
        <Grid3x3 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Toggle theme" onClick={() => dispatch({ type: 'TOGGLE_THEME' })} style={btn(false)}>
        {theme === 'dark'
          ? <Sun size={ICON_SIZE} strokeWidth={ICON_SW} />
          : <Moon size={ICON_SIZE} strokeWidth={ICON_SW} />}
      </button>

      {sep}

      {/* layers panel */}
      <div style={{ position: 'relative' }}>
        <button title="Layers" onClick={() => setShowLayers(s => !s)} style={btn(showLayers)}>
          <Layers size={ICON_SIZE} strokeWidth={ICON_SW} />
        </button>
        {showLayers && <LayerPanel onClose={() => setShowLayers(false)} />}
      </div>

      {sep}

      {/* save / load / export */}
      <button title="Save JSON" onClick={() => saveJSON(brief, layout, layers, theme)} style={btn(false)}>
        <Save size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Load JSON" onClick={handleImport} style={btn(false)}>
        <Upload size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Export PNG" onClick={() => exportSVG(stageRef)} style={btn(false)}>
        <ImageDown size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Export DXF" onClick={() => exportDXF(layout.rooms)}
        style={{ ...btn(false), fontSize: 9, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '-.02em' }}>
        DXF
      </button>

      {/* programme completeness */}
      <span style={{ marginLeft: 'auto', fontSize: 10, color: placedEssential.placed === placedEssential.total ? 'var(--green)' : 'var(--tx-3)' }}>
        {placedEssential.placed}/{placedEssential.total} essential
      </span>
    </div>
  );
}
