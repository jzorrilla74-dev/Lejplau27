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
const BX = RULER_PX + MARGIN;
const BY = RULER_PX + MARGIN;

export default function CanvasPanel() {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const hasFitRef = useRef(false);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ctxMenu, setCtxMenu] = useState(null);
  const { scale, panX, panY, activeTool, fitRequested, dispatch } = useCanvas();
  const { dispatch: lDispatch } = useLayout();

  useEffect(() => {
    if (!ctxMenu) return;
    function dismiss() { setCtxMenu(null); }
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [ctxMenu]);

  const fitBlock = useCallback(() => {
    const fs = Math.min(
      Math.max(SCALE_MIN, Math.min(SCALE_MAX, (size.w - 2 * BX - 60) / BLOCK.widthM)),
      Math.max(SCALE_MIN, Math.min(SCALE_MAX, (size.h - 2 * BY - 40) / BLOCK.depthM)),
    );
    dispatch({ type: 'FIT_BLOCK', scale: fs, panX: 0, panY: 0 });
  }, [size, dispatch]);

  // Watch REQUEST_FIT from context (triggered by Cmd+0)
  useEffect(() => {
    if (fitRequested > 0) fitBlock();
  }, [fitRequested]); // eslint-disable-line

  // ResizeObserver + fit on first measurement
  useEffect(() => {
    let timer;
    const ro = new ResizeObserver(entries => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const e = entries[0];
        const w = e.contentRect.width;
        const h = e.contentRect.height;
        setSize({ w, h });

        if (!hasFitRef.current) {
          hasFitRef.current = true;
          const fs = Math.min(
            Math.max(SCALE_MIN, Math.min(SCALE_MAX, (w - 2 * BX - 60) / BLOCK.widthM)),
            Math.max(SCALE_MIN, Math.min(SCALE_MAX, (h - 2 * BY - 40) / BLOCK.depthM)),
          );
          dispatch({ type: 'FIT_BLOCK', scale: fs, panX: 0, panY: 0 });
        }
      }, 60);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, [dispatch]);

  const BW = BLOCK.widthM * scale;
  const BD = BLOCK.depthM * scale;
  const stageW = BX + BW + RULER_PX + 60;
  const stageH = BY + BD + RULER_PX + 40;

  function handleStageDragEnd(e) {
    if (activeTool !== 'pan') return;
    const minX = -(BX + BW - 100);
    const minY = -(BY + BD - 100);
    const maxX = size.w - 100;
    const maxY = size.h - 100;
    const cx = Math.max(minX, Math.min(maxX, e.target.x()));
    const cy = Math.max(minY, Math.min(maxY, e.target.y()));
    e.target.x(cx);
    e.target.y(cy);
    dispatch({ type: 'SET_PAN', panX: cx, panY: cy });
  }

  function handleStageClick(e) {
    if (e.target === e.target.getStage()) {
      dispatch({ type: 'DESELECT' });
    }
  }

  function handleStageDblClick(e) {
    if (e.target !== e.target.getStage()) return;
    fitBlock();
  }

  function handleWheel(e) {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -2 : 2;
    const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale + delta));
    dispatch({ type: 'SET_SCALE', scale: next });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CanvasToolbar stageRef={stageRef} fitBlock={fitBlock} />
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
          onDblClick={handleStageDblClick}
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
