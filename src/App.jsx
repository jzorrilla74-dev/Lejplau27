import { useEffect, useState } from 'react';
import { BriefProvider, useBrief } from './context/BriefContext';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import { LayerProvider } from './context/LayerContext';
import { CanvasProvider, useCanvas } from './context/CanvasContext';
import { CriticProvider } from './context/CriticContext';
import BriefPanel from './components/Brief/BriefPanel';
import CanvasPanel from './components/Canvas/CanvasPanel';
import Metrics from './components/Shared/Metrics';
import Palette from './components/Shared/Palette';
import Inspector from './components/Shared/Inspector';
import CriticPanel from './components/Critic/CriticPanel';
import { v4 as uuidv4 } from 'uuid';

function AllProviders({ children }) {
  return (
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
  );
}

function AppInner() {
  const { theme, selectedUid, dispatch: cDispatch } = useCanvas();
  const { dispatch: lDispatch, rooms } = useLayout();
  const [rightTab, setRightTab] = useState('rooms');
  const [briefOpen, setBriefOpen] = useState(() => localStorage.getItem('brief_open') !== 'false');

  // Apply dark/light class to html
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        // redo is handled in LayoutContext
        return;
      }
      if (meta && e.key === 'z') {
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedUid && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        lDispatch({ type: 'REMOVE_ROOM', uid: selectedUid });
        cDispatch({ type: 'DESELECT' });
        return;
      }
      if (meta && e.key === 'd') {
        e.preventDefault();
        if (selectedUid) {
          const src = rooms.find(r => r.uid === selectedUid);
          if (src) {
            const dup = { ...src, uid: uuidv4(), x: src.x + 0.5, y: src.y + 0.5 };
            lDispatch({ type: 'ADD_ROOM', room: dup });
            cDispatch({ type: 'SELECT_ROOM', uid: dup.uid });
          }
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
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--bd)', overflow: 'hidden' }}>
        {/* Metrics always visible */}
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
