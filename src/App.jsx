import { useEffect, useRef, useState } from 'react';
import { BriefProvider, useBrief } from './context/BriefContext';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import { LayerProvider, useLayers } from './context/LayerContext';
import { CanvasProvider, useCanvas } from './context/CanvasContext';
import { CriticProvider } from './context/CriticContext';
import { FirestoreProvider } from './context/FirestoreContext';
import { useFirestoreStatus } from './context/FirestoreContext';
import { saveToFirestore, loadFromFirestore } from './lib/firebase';
import BriefPanel from './components/Brief/BriefPanel';
import CanvasPanel from './components/Canvas/CanvasPanel';
import Metrics from './components/Shared/Metrics';
import Palette from './components/Shared/Palette';
import Inspector from './components/Shared/Inspector';
import CriticPanel from './components/Critic/CriticPanel';
import { v4 as uuidv4 } from 'uuid';

function AllProviders({ children }) {
  return (
    <FirestoreProvider>
      <BriefProvider>
        <LayoutProvider>
          <LayerProvider>
            <CanvasProvider>
              <CriticProvider>
                {children}
              </CriticProvider>
            </CanvasProvider>
          </LayerProvider>
        </LayoutProvider>
      </BriefProvider>
    </FirestoreProvider>
  );
}

function AppInner() {
  const { theme, selectedUid, selectedUids, dispatch: cDispatch } = useCanvas();
  const { dispatch: lDispatch, rooms, partyWallStartM } = useLayout();
  const { layers, dispatch: layDispatch } = useLayers();
  const { state: brief, dispatch: bDispatch } = useBrief();
  const { setStatus, setLastSaved } = useFirestoreStatus();
  const [rightTab, setRightTab] = useState('rooms');
  const [briefOpen, setBriefOpen] = useState(() => localStorage.getItem('brief_open') !== 'false');
  const saveTimerRef = useRef(null);
  const pendingRef = useRef(false);

  // Apply dark/light class to html
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Load from Firestore on mount
  useEffect(() => {
    loadFromFirestore().then(data => {
      if (!data) return;
      if (data.rooms) lDispatch({ type: 'LOAD_LAYOUT', rooms: data.rooms, partyWallStartM: data.partyWallStartM });
      if (data.layers) layDispatch({ type: 'REORDER', layers: data.layers });
      if (data.brief) bDispatch({ type: 'REPLACE_STATE', state: data.brief });
      if (data.theme && data.theme !== theme) cDispatch({ type: 'TOGGLE_THEME' });
    });
  }, []); // eslint-disable-line

  // Auto-save debounce
  async function doSave() {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    setStatus('saving');
    const ok = await saveToFirestore({ rooms, brief, layers, partyWallStartM, theme, version: 2 });
    setStatus(ok ? 'saved' : 'error');
    if (ok) setLastSaved(new Date());
  }

  useEffect(() => {
    pendingRef.current = true;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 30000);
  }, [rooms, brief]); // eslint-disable-line

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key === '0') {
        e.preventDefault();
        cDispatch({ type: 'REQUEST_FIT' });
        return;
      }
      if (meta && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        return;
      }
      if (meta && e.key === 'z') {
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedUids.length > 0 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        selectedUids.forEach(uid => lDispatch({ type: 'REMOVE_ROOM', uid }));
        cDispatch({ type: 'DESELECT' });
        return;
      }
      if (meta && e.key === 'd') {
        e.preventDefault();
        if (selectedUids.length > 0) {
          const newUids = [];
          selectedUids.forEach(uid => {
            const src = rooms.find(r => r.uid === uid);
            if (src) {
              const newUid = uuidv4();
              lDispatch({ type: 'ADD_ROOM', room: { ...src, uid: newUid, x: src.x + 0.5, y: src.y + 0.5 } });
              newUids.push(newUid);
            }
          });
          if (newUids.length === 1) cDispatch({ type: 'SELECT_ROOM', uid: newUids[0] });
          else if (newUids.length > 1) cDispatch({ type: 'SELECT_ROOMS', uids: newUids });
        }
        return;
      }
      if (e.key === 'Escape') {
        cDispatch({ type: 'DESELECT' });
        return;
      }
      if (e.key === 'v' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        cDispatch({ type: 'SET_TOOL', tool: 'select' });
        return;
      }
      if (e.key === 'h' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        cDispatch({ type: 'SET_TOOL', tool: 'pan' });
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedUid, rooms, lDispatch, cDispatch]);

  const tabBtnStyle = (active) => ({
    flex: 1, padding: '6px 0', fontSize: 11, fontWeight: active ? 700 : 400,
    background: active ? 'var(--bg3)' : 'var(--bg2)',
    border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--tx)' : 'var(--tx2)', cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--tx)' }}>
      {/* LEFT: Brief */}
      <BriefPanel open={briefOpen} onToggle={() => setBriefOpen(o => { const n = !o; localStorage.setItem('brief_open', n); return n; })} />

      {/* CENTRE: Canvas */}
      <CanvasPanel />

      {/* RIGHT: 320px panel */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--bd)', overflow: 'hidden', position: 'relative', isolation: 'isolate' }}>
        {/* Metrics — collapsible, collapsed by default */}
        <Metrics />

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)' }}>
          <button style={tabBtnStyle(rightTab === 'rooms')} onClick={() => setRightTab('rooms')}>Rooms</button>
          <button style={tabBtnStyle(rightTab === 'critic')} onClick={() => setRightTab('critic')}>Critic</button>
        </div>

        {rightTab === 'rooms' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Palette />
            </div>
            {selectedUid && <Inspector />}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CriticPanel />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AllProviders>
      <AppInner />
    </AllProviders>
  );
}
