import { useState, useEffect, useRef } from 'react';
import {
  MousePointer2, Hand, Undo2, Redo2, Minus, Plus,
  Grid3x3, Sun, Moon, Layers, Save, Upload, ImageDown,
  Home, Square, Magnet, History,
} from 'lucide-react';
import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { useBrief } from '../../context/BriefContext';
import { useFirestoreStatus } from '../../context/FirestoreContext';
import { saveJSON } from '../../lib/exportJSON';
import { exportSVG } from '../../lib/exportSVG';
import { exportDXF } from '../../lib/exportDXF';
import { parseImportedJSON } from '../../lib/importJSON';
import { saveVersion, listVersions, deleteVersion } from '../../lib/versions';
import { SCALE_MIN, SCALE_MAX } from '../../lib/constants';
import LayerPanel from './LayerPanel';

const ICON_SIZE = 14;
const ICON_SW   = 1.6;

function formatAgo(d) {
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  return `${Math.round(s / 60)} min ago`;
}

export default function CanvasToolbar({ stageRef, fitBlock }) {
  const { scale, activeTool, gridVisible, snapEnabled, theme, dispatch } = useCanvas();
  const { status: saveStatus, lastSaved } = useFirestoreStatus();
  const { rooms, partyWallStartM, dispatch: lDispatch, undo, redo, canUndo, canRedo } = useLayout();
  const { layers } = useLayers();
  const { state: brief } = useBrief();
  const [showLayers, setShowLayers] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState(() => listVersions());
  const versionsRef = useRef(null);

  useEffect(() => {
    if (!showVersions) return;
    setVersions(listVersions());
    function onOutside(e) {
      if (versionsRef.current && !versionsRef.current.contains(e.target)) setShowVersions(false);
    }
    window.addEventListener('mousedown', onOutside);
    return () => window.removeEventListener('mousedown', onOutside);
  }, [showVersions]);

  function handleSaveVersion() {
    const name = prompt('Version name:', new Date().toLocaleString());
    if (!name) return;
    saveVersion(name, rooms, partyWallStartM);
    setVersions(listVersions());
    setShowVersions(true);
  }

  function handleRestoreVersion(v) {
    if (!confirm(`Restore "${v.name}"? Current layout will be replaced.`)) return;
    lDispatch({ type: 'LOAD_LAYOUT', rooms: v.rooms, partyWallStartM: v.partyWallStartM });
    setShowVersions(false);
  }

  function handleDeleteVersion(id) {
    deleteVersion(id);
    setVersions(listVersions());
  }

  const placedEssential = (() => {
    const essentials = brief.programme.filter(p => p.checked && p.priority === 'essential');
    const placedLabels = new Set(rooms.map(r => r.label.toLowerCase()));
    const placed = essentials.filter(p => placedLabels.has(p.name.toLowerCase())).length;
    return { placed, total: essentials.length };
  })();

  const allFilled = rooms.length === 0 || rooms.every(r => r.filled !== false);

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const text = await e.target.files[0].text();
        const data = parseImportedJSON(text);
        lDispatch({ type: 'LOAD_LAYOUT', rooms: data.rooms, partyWallStartM: data.partyWallStartM });
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

  function toggleFillAll() {
    rooms.forEach(r => lDispatch({ type: 'UPDATE_ROOM', uid: r.uid, patch: { filled: !allFilled } }));
  }

  const btn = (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '4px 7px', height: 28,
    background: active ? 'var(--accent)' : 'transparent',
    border: 'none', borderRadius: 4,
    color: active ? 'white' : 'var(--tx-2)', cursor: 'pointer',
  });

  const sep = <div style={{ width: 1, height: 16, background: 'var(--bd-2)', margin: '0 2px' }} />;

  const statusEl = saveStatus && saveStatus !== 'idle' ? (
    <span style={{
      fontSize: 10, marginLeft: 6,
      color: saveStatus === 'error' ? 'var(--red)'
           : saveStatus === 'saving' ? 'var(--tx-3)'
           : 'var(--green)',
    }}>
      {saveStatus === 'saving' ? '↑ Saving…'
       : saveStatus === 'error' ? '⚠ Save failed'
       : lastSaved ? `✓ ${formatAgo(lastSaved)}`
       : '✓ Saved'}
    </span>
  ) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1, padding: '0 8px',
      height: 36, background: 'var(--bg-1)', borderBottom: '1px solid var(--bd)',
      position: 'relative', flexShrink: 0,
    }}>
      <button title="Select (V)" onClick={() => dispatch({ type: 'SET_TOOL', tool: 'select' })} style={btn(activeTool === 'select')}>
        <MousePointer2 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Pan (H)" onClick={() => dispatch({ type: 'SET_TOOL', tool: 'pan' })} style={btn(activeTool === 'pan')}>
        <Hand size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      <button title="Undo (⌘Z)" onClick={undo} disabled={!canUndo}
        style={{ ...btn(false), opacity: canUndo ? 1 : 0.35 }}>
        <Undo2 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Redo (⌘⇧Z)" onClick={redo} disabled={!canRedo}
        style={{ ...btn(false), opacity: canRedo ? 1 : 0.35 }}>
        <Redo2 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Reset View (ↈ0)" onClick={fitBlock} style={btn(false)}>
        <Home size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      <button title="Zoom out" onClick={() => adjustScale(-10)} style={btn(false)}>
        <Minus size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <span style={{ fontSize: 10, color: 'var(--tx-3)', minWidth: 40, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        {scale}px/m
      </span>
      <button title="Zoom in" onClick={() => adjustScale(10)} style={btn(false)}>
        <Plus size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      <button title="Toggle grid" onClick={() => dispatch({ type: 'TOGGLE_GRID' })} style={btn(gridVisible)}>
        <Grid3x3 size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Toggle snap (S)" onClick={() => dispatch({ type: 'TOGGLE_SNAP' })} style={btn(snapEnabled)}>
        <Magnet size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Toggle theme" onClick={() => dispatch({ type: 'TOGGLE_THEME' })} style={btn(false)}>
        {theme === 'dark'
          ? <Sun size={ICON_SIZE} strokeWidth={ICON_SW} />
          : <Moon size={ICON_SIZE} strokeWidth={ICON_SW} />}
      </button>
      <button title={allFilled ? 'Unfill all rooms' : 'Fill all rooms'} onClick={toggleFillAll} style={btn(!allFilled)}>
        <Square size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>

      {sep}

      <div style={{ position: 'relative' }}>
        <button title="Layers" onClick={() => setShowLayers(s => !s)} style={btn(showLayers)}>
          <Layers size={ICON_SIZE} strokeWidth={ICON_SW} />
        </button>
        {showLayers && <LayerPanel onClose={() => setShowLayers(false)} />}
      </div>

      <div style={{ position: 'relative' }} ref={versionsRef}>
        <button title="Versions" onClick={() => setShowVersions(s => !s)} style={btn(showVersions)}>
          <History size={ICON_SIZE} strokeWidth={ICON_SW} />
        </button>
        {showVersions && (
          <div style={{
            position: 'absolute', top: 32, right: 0, zIndex: 200,
            width: 260, background: 'var(--bg-1)', border: '1px solid var(--bd)',
            borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)' }}>Saved Versions</span>
              <button onClick={handleSaveVersion} style={{
                fontSize: 10, padding: '3px 8px', background: 'var(--accent)',
                color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer',
              }}>+ Save now</button>
            </div>
            {versions.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 11, color: 'var(--tx-3)', textAlign: 'center' }}>
                No saved versions yet
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {versions.map(v => (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', borderBottom: '1px solid var(--bd)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--tx-3)' }}>{new Date(v.savedAt).toLocaleString()} · {v.rooms.length} rooms</div>
                    </div>
                    <button onClick={() => handleRestoreVersion(v)} style={{
                      fontSize: 9, padding: '2px 6px', background: 'var(--bg-2)',
                      color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: 3, cursor: 'pointer', flexShrink: 0,
                    }}>Restore</button>
                    <button onClick={() => handleDeleteVersion(v.id)} style={{
                      fontSize: 9, padding: '2px 6px', background: 'transparent',
                      color: 'var(--red)', border: '1px solid var(--bd)', borderRadius: 3, cursor: 'pointer', flexShrink: 0,
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {sep}

      <button title="Save JSON" onClick={() => saveJSON(brief, { rooms }, layers, theme)} style={btn(false)}>
        <Save size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Load JSON" onClick={handleImport} style={btn(false)}>
        <Upload size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Export PNG" onClick={() => exportSVG(stageRef)} style={btn(false)}>
        <ImageDown size={ICON_SIZE} strokeWidth={ICON_SW} />
      </button>
      <button title="Export DXF" onClick={() => exportDXF(rooms)}
        style={{ ...btn(false), fontSize: 9, fontFamily: 'var(--font-mono)', padding: '4px 6px' }}>
        DXF
      </button>

      {statusEl}
      <span style={{ marginLeft: 'auto', fontSize: 10, color: placedEssential.placed === placedEssential.total ? 'var(--green)' : 'var(--tx-3)' }}>
        {placedEssential.placed}/{placedEssential.total} essential
      </span>
    </div>
  );
}
