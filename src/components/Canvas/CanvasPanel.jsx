import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage } from 'react-konva';
import { BLOCK, SCALE_MIN, SCALE_MAX } from '../../lib/constants';
import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';
import BlockLayer from './BlockLayer';
import RoomLayer from './RoomLayer';
import CanvasToolbar from './CanvasToolbar';

const CTX_MENU_ITEMS = [
  { label: 'Bring to Front', action: 'BRING_TO_FRONT' },
  { label: 'Bring Forward',  action: 'BRING_FORWARD'  },
  { label: 'Send Backward',  action: 'SEND_BACKWARD'  },
  { label: 'Send to Back',   action: 'SEND_TO_BACK'   },
];

const RULER_PX = 20;
const MARGIN = 8;

export default function CanvasPanel() {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ctxMenu, setCtxMenu] = useState(null);
  const { scale, panX, panY, activeTool, dispatch } = useCanvas();
  const { dispatch: lDispatch } = useLayout();

  useEffect(() => {
    if (!ctxMenu) return;
    function dismiss() { setCtxMenu(null); }
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [ctxMenu]);

  // ResizeObserver
  useEffect(() => {
    let timer;
    const ro = new ResizeObserver(entries => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const e = entries[0];
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }, 60);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, []);

  const BX = RULER_PX + MARGIN;
  const BY = RULER_PX + MARGIN;
  const BW = BLOCK.widthM * scale;
  const BD = BLOCK.depthM * scale;
  const stageW = BX + BW + RULER_PX + 60;
  const stageH = BY + BD + RULER_PX + 40;

  // pan on stage drag (H tool)
  function handleStageDragEnd(e) {
    if (activeTool !== 'pan') return;
    dispatch({ type: 'SET_PAN', panX: e.target.x(), panY: e.target.y() });
  }

  // deselect on empty click
  function handleStageClick(e) {
    if (e.target === e.target.getStage()) {
      dispatch({ type: 'DESELECT' });
    }
  }

  // wheel zoom
  function handleWheel(e) {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -2 : 2;
    const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale + delta));
    dispatch({ type: 'SET_SCALE', scale: next });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CanvasToolbar stageRef={stageRef} />
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          x={panX}
          y={panY}
          draggable={activeTool === 'pan'}
          onDragEnd={handleStageDragEnd}
          onClick={handleStageClick}
          onWheel={handleWheel}
          style={{ cursor: activeTool === 'pan' ? 'grab' : 'default' }}
        >
          <BlockLayer stageRef={stageRef} />
          <RoomLayer stageRef={stageRef} setCtxMenu={setCtxMenu} />
        </Stage>
        {ctxMenu && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', left: ctxMenu.x, top: ctxMenu.y,
              background: 'var(--bg-1)', border: '1px solid var(--bd-2)',
              borderRadius: 6, zIndex: 1000, minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}>
            {CTX_MENU_ITEMS.map(item => (
              <div
                key={item.action}
                onClick={() => {
                  lDispatch({ type: item.action, uid: ctxMenu.uid });
                  setCtxMenu(null);
                }}
                style={{
                  padding: '7px 14px', fontSize: 11, color: 'var(--tx)',
                  cursor: 'pointer', borderBottom: '1px solid var(--bd)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
