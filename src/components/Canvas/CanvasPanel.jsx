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
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  // Start with a reasonable default; ResizeObserver corrects it on first paint.
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

  // Reset View (Cmd+0): fit BOTH dimensions — whole block visible at once.
  const fitBlock = useCallback(() => {
    const fs = Math.min(
      Math.max(SCALE_MIN, Math.min(SCALE_MAX, (size.w - 2 * BX - 60) / BLOCK.widthM)),
      Math.max(SCALE_MIN, Math.min(SCALE_MAX, (size.h - 2 * BY - 40) / BLOCK.depthM)),
    );
    dispatch({ type: 'FIT_BLOCK', scale: fs, panX: 0, panY: 0 });
  }, [size, dispatch]);

  // Initial load: fit to WIDTH so rooms are as large as possible; pan vertically.
  const fitWidth = useCallback((w) => {
    const fs = Math.max(SCALE_MIN, Math.min(SCALE_MAX, (w - 2 * BX - 60) / BLOCK.widthM));
    dispatch({ type: 'FIT_BLOCK', scale: fs, panX: 0, panY: 0 });
  }, [dispatch]);

  useEffect(() => {
    if (fitRequested > 0) fitBlock();
  }, [fitRequested]); // eslint-disable-line

  // Track the container's live pixel size. First measurement triggers fit-to-width.
  useEffect(() => {
    let timer;
    const ro = new ResizeObserver(entries => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { width: w, height: h } = entries[0].contentRect;
        setSize({ w, h });
        if (!hasFitRef.current) {
          hasFitRef.current = true;
          fitWidth(w);
        }
      }, 60);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, [dispatch]); // eslint-disable-line

  const BW = BLOCK.widthM * scale;
  const BD = BLOCK.depthM * scale;

  // KEY FIX: Stage is exactly the container size — the canvas DOM element never
  // overflows its column, so it cannot steal pointer events from the right panel.
  // All panning is handled by Stage x/y (internal Konva drawing offset).
  const stageW = Math.max(size.w, 100);
  const stageH = Math.max(size.h, 100);

  // Pan constraints: keep at least 100px of block visible in each direction.
  function clampPan(nx, ny) {
    return {
      x: Math.max(-(BX + BW - 100), Math.min(size.w - 100, nx)),
      y: Math.max(-(BY + BD - 100), Math.min(size.h - 100, ny)),
    };
  }

  function handleStagePointerDown(e) {
    if (activeTool !== 'pan') return;
    isPanningRef.current = true;
    panStartRef.current = { clientX: e.evt.clientX, clientY: e.evt.clientY, panX, panY };
  }

  function handleStagePointerMove(e) {
    if (!isPanningRef.current) return;
    const dx = e.evt.clientX - panStartRef.current.clientX;
    const dy = e.evt.clientY - panStartRef.current.clientY;
    const { x, y } = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
    dispatch({ type: 'SET_PAN', panX: x, panY: y });
  }

  function handleStagePointerUp() {
    isPanningRef.current = false;
  }

  function handleStageClick(e) {
    if (activeTool === 'pan') return;
    if (e.target === e.target.getStage()) dispatch({ type: 'DESELECT' });
  }

  function handleStageDblClick(e) {
    if (e.target !== e.target.getStage()) return;
    fitBlock();
  }

  function handleWheel(e) {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -6 : 6;
    const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale + delta));
    dispatch({ type: 'SET_SCALE', scale: next });
  }

  return (
    // position:relative + isolation:isolate creates a stacking context so the
    // canvas never bleeds into adjacent panel columns via z-index stacking.
    <div style={{
      flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative', isolation: 'isolate',
    }}>
      <CanvasToolbar stageRef={stageRef} fitBlock={fitBlock} />
      {/* overflow:hidden — no scrollbars needed; all pan via Stage x/y */}
      <div ref={containerRef} style={{
        flex: 1, minHeight: 0,
        overflow: 'hidden',
        background: 'var(--bg)',
        position: 'relative',
      }}>
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          x={panX}
          y={panY}
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
          onWheel={handleWheel}
          style={{ cursor: activeTool === 'pan' ? 'grab' : 'default', display: 'block' }}
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
