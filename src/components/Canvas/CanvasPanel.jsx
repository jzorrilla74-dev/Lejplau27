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
  const selBoxStartRef = useRef(null);
  const wasRubberBandRef = useRef(false);
  const lassoActiveRef = useRef(false);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ctxMenu, setCtxMenu] = useState(null);
  const [selBox, setSelBox] = useState(null);
  const [lassoPoints, setLassoPoints] = useState(null);
  const { scale, panX, panY, activeTool, fitRequested, dispatch } = useCanvas();
  const { rooms, dispatch: lDispatch } = useLayout();

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

  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function handleStagePointerDown(e) {
    if (activeTool === 'pan') {
      isPanningRef.current = true;
      panStartRef.current = { clientX: e.evt.clientX, clientY: e.evt.clientY, panX, panY };
      return;
    }
    if (activeTool === 'lasso') {
      const pos = stageRef.current.getPointerPosition();
      lassoActiveRef.current = true;
      setLassoPoints([{ x: pos.x, y: pos.y }]);
      return;
    }
    if (activeTool === 'select' && e.target === e.target.getStage()) {
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      selBoxStartRef.current = { x: pos.x, y: pos.y };
    }
  }

  function handleStagePointerMove(e) {
    if (isPanningRef.current) {
      const dx = e.evt.clientX - panStartRef.current.clientX;
      const dy = e.evt.clientY - panStartRef.current.clientY;
      const { x, y } = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
      dispatch({ type: 'SET_PAN', panX: x, panY: y });
      return;
    }
    if (lassoActiveRef.current) {
      const pos = stageRef.current.getPointerPosition();
      setLassoPoints(pts => {
        if (!pts || pts.length === 0) return [{ x: pos.x, y: pos.y }];
        const last = pts[pts.length - 1];
        const dx = pos.x - last.x, dy = pos.y - last.y;
        if (dx * dx + dy * dy < 9) return pts;
        return [...pts, { x: pos.x, y: pos.y }];
      });
      return;
    }
    if (selBoxStartRef.current) {
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      const dx = pos.x - selBoxStartRef.current.x;
      const dy = pos.y - selBoxStartRef.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setSelBox({ x: selBoxStartRef.current.x, y: selBoxStartRef.current.y, w: dx, h: dy });
      }
    }
  }

  function handleStagePointerUp() {
    isPanningRef.current = false;
    if (lassoActiveRef.current) {
      lassoActiveRef.current = false;
      setLassoPoints(pts => {
        if (pts && pts.length >= 3) {
          const hit = rooms.filter(r => {
            const cx = panX + BX + (r.x + r.w / 2) * scale;
            const cy = panY + BY + (r.y + r.d / 2) * scale;
            return pointInPolygon(cx, cy, pts);
          });
          if (hit.length > 0) dispatch({ type: 'SELECT_ROOMS', uids: hit.map(r => r.uid) });
        }
        return null;
      });
      dispatch({ type: 'SET_TOOL', tool: 'select' });
      return;
    }
    if (selBox) {
      wasRubberBandRef.current = true;
      const selLeft   = Math.min(selBox.x, selBox.x + selBox.w);
      const selRight  = Math.max(selBox.x, selBox.x + selBox.w);
      const selTop    = Math.min(selBox.y, selBox.y + selBox.h);
      const selBottom = Math.max(selBox.y, selBox.y + selBox.h);
      const hit = rooms.filter(r => {
        const rLeft   = panX + BX + r.x * scale;
        const rRight  = panX + BX + (r.x + r.w) * scale;
        const rTop    = panY + BY + r.y * scale;
        const rBottom = panY + BY + (r.y + r.d) * scale;
        return rLeft < selRight && rRight > selLeft && rTop < selBottom && rBottom > selTop;
      });
      if (hit.length > 0) dispatch({ type: 'SELECT_ROOMS', uids: hit.map(r => r.uid) });
      setSelBox(null);
    }
    selBoxStartRef.current = null;
  }

  function handleStageClick(e) {
    if (activeTool === 'pan') return;
    if (wasRubberBandRef.current) { wasRubberBandRef.current = false; return; }
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
          style={{ cursor: activeTool === 'pan' ? 'grab' : activeTool === 'lasso' ? 'crosshair' : 'default', display: 'block' }}
        >
          <BlockLayer stageRef={stageRef} />
          <RoomLayer stageRef={stageRef} setCtxMenu={setCtxMenu} />
        </Stage>

        {selBox && (
          <div style={{
            position: 'absolute',
            left: Math.min(selBox.x, selBox.x + selBox.w),
            top:  Math.min(selBox.y, selBox.y + selBox.h),
            width: Math.abs(selBox.w),
            height: Math.abs(selBox.h),
            border: '1px dashed #4A9EFF',
            background: 'rgba(74,158,255,0.08)',
            pointerEvents: 'none',
          }} />
        )}

        {lassoPoints && lassoPoints.length >= 2 && (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <polyline
              points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="rgba(74,158,255,0.1)"
              stroke="#4A9EFF"
              strokeWidth={1.5}
              strokeDasharray="5,3"
            />
            <line
              x1={lassoPoints[lassoPoints.length - 1].x}
              y1={lassoPoints[lassoPoints.length - 1].y}
              x2={lassoPoints[0].x}
              y2={lassoPoints[0].y}
              stroke="#4A9EFF"
              strokeWidth={1}
              strokeDasharray="3,4"
              opacity={0.5}
            />
          </svg>
        )}

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
