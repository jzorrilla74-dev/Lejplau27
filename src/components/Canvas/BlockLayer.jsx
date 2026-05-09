import { useRef } from 'react';
import { Layer, Rect, Line, Text, Circle, Group } from 'react-konva';
import { BLOCK, GRID_M } from '../../lib/constants';
import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';

const RULER_PX = 20;
const MARGIN = 8;

export default function BlockLayer({ stageRef }) {
  const { scale, gridVisible, theme } = useCanvas();
  const { partyWallStartM, dispatch } = useLayout();
  const draggingPW = useRef(false);

  const isDark = theme === 'dark';
  const BX = RULER_PX + MARGIN;
  const BY = RULER_PX + MARGIN;
  const BW = BLOCK.widthM * scale;
  const BD = BLOCK.depthM * scale;

  const blockFill    = isDark ? '#221d18' : '#ede8de';
  const rulerFill    = isDark ? '#1a1612' : '#e4ddd2';
  const rulerTick    = isDark ? '#46392e' : '#9c9288';
  const labelColor   = isDark ? '#b6ab93' : '#5c5248';
  const setbackFill  = isDark ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.06)';
  const setbackStroke = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
  const gridColor    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)';
  const pwColor      = '#e58a7a';
  const edgeLabelColor = isDark ? '#7c7160' : '#9c9288';

  const { setbacks } = BLOCK;
  // buildable envelope in pixels relative to BX, BY
  const envX = setbacks.north * scale;
  const envY = setbacks.front * scale;
  const envW = (BLOCK.widthM - setbacks.north - setbacks.south) * scale;
  const envH = (BLOCK.depthM - setbacks.front - setbacks.rear) * scale;

  // party wall
  const pwY1 = BY + partyWallStartM * scale;
  const pwY2 = BY + (partyWallStartM + BLOCK.partyWall.lengthM) * scale;
  const pwX  = BX + BW; // right boundary (south)

  function handlePWDragStart(e) {
    draggingPW.current = true;
    e.target.getStage().on('pointermove.pw', (ev) => {
      const y = ev.evt.clientY ?? ev.evt.touches?.[0]?.clientY ?? 0;
      const stageRect = stageRef?.current?.container().getBoundingClientRect();
      if (!stageRect) return;
      const relY = y - stageRect.top - BY;
      const newStartM = Math.max(0, Math.min(relY / scale, BLOCK.depthM - BLOCK.partyWall.lengthM));
      dispatch({ type: 'SET_PARTY_WALL', startM: newStartM });
    });
    e.target.getStage().on('pointerup.pw', () => {
      e.target.getStage().off('pointermove.pw pointerup.pw');
      draggingPW.current = false;
    });
  }

  // grid dots
  const gridDots = [];
  if (gridVisible) {
    const xStart = Math.ceil(setbacks.north / GRID_M) * GRID_M;
    const xEnd   = BLOCK.widthM;
    const yStart = Math.ceil(setbacks.front / GRID_M) * GRID_M;
    const yEnd   = BLOCK.depthM - setbacks.rear;
    for (let xm = xStart; xm <= xEnd; xm = +(xm + GRID_M).toFixed(2)) {
      for (let ym = yStart; ym <= yEnd; ym = +(ym + GRID_M).toFixed(2)) {
        gridDots.push(
          <Circle key={`g-${xm}-${ym}`}
            x={BX + xm * scale} y={BY + ym * scale}
            radius={1} fill={gridColor} listening={false} />
        );
      }
    }
  }

  // ruler ticks
  const nsTicks = [];
  for (let m = 0; m <= BLOCK.depthM; m += 2) {
    const y = BY + m * scale;
    nsTicks.push(
      <Line key={`ns-${m}`} points={[BX - 6, y, BX, y]} stroke={rulerTick} strokeWidth={1} listening={false} />,
      <Text key={`nsl-${m}`} x={0} y={y - 5} width={BX - 8} text={`${m}m`} fontSize={8} fill={labelColor} align="right" listening={false} />,
    );
  }
  const ewTicks = [];
  for (let m = 0; m <= BLOCK.widthM; m += 2) {
    const x = BX + m * scale;
    ewTicks.push(
      <Line key={`ew-${m}`} points={[x, BY - 6, x, BY]} stroke={rulerTick} strokeWidth={1} listening={false} />,
      <Text key={`ewl-${m}`} x={x - 10} y={2} width={20} text={`${m}m`} fontSize={8} fill={labelColor} align="center" listening={false} />,
    );
  }

  return (
    <Layer listening={false}>
      {/* block fill */}
      <Rect x={BX} y={BY} width={BW} height={BD} fill={blockFill} />

      {/* setback shading */}
      {/* front */}
      <Rect x={BX} y={BY} width={BW} height={setbacks.front * scale}
        fill={setbackFill} listening={false} />
      {/* rear */}
      <Rect x={BX} y={BY + (BLOCK.depthM - setbacks.rear) * scale} width={BW} height={setbacks.rear * scale}
        fill={setbackFill} listening={false} />
      {/* north (left on plan) */}
      <Rect x={BX} y={BY} width={setbacks.north * scale} height={BD}
        fill={setbackFill} listening={false} />

      {/* setback dashed lines */}
      <Line points={[BX, BY + setbacks.front * scale, BX + BW, BY + setbacks.front * scale]}
        stroke={setbackStroke} strokeWidth={1} dash={[4, 4]} listening={false} />
      <Text x={BX + 4} y={BY + setbacks.front * scale - 12} text="3.5m front setback" fontSize={9} fill={setbackStroke} listening={false} />

      <Line points={[BX, BY + (BLOCK.depthM - setbacks.rear) * scale, BX + BW, BY + (BLOCK.depthM - setbacks.rear) * scale]}
        stroke={setbackStroke} strokeWidth={1} dash={[4, 4]} listening={false} />
      <Text x={BX + 4} y={BY + (BLOCK.depthM - setbacks.rear) * scale + 2} text="5m rear setback" fontSize={9} fill={setbackStroke} listening={false} />

      <Line points={[BX + setbacks.north * scale, BY, BX + setbacks.north * scale, BY + BD]}
        stroke={setbackStroke} strokeWidth={1} dash={[4, 4]} listening={false} />
      <Text x={BX + setbacks.north * scale + 2} y={BY + 4} text="1m" fontSize={9} fill={setbackStroke} listening={false} />

      {/* grid dots */}
      {gridDots}

      {/* block border */}
      <Rect x={BX} y={BY} width={BW} height={BD} stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)'} strokeWidth={1} fill="transparent" listening={false} />

      {/* party wall */}
      <Line points={[pwX, pwY1, pwX, pwY2]} stroke={pwColor} strokeWidth={4} listening={false} />
      {/* tick marks */}
      <Line points={[pwX - 6, pwY1, pwX + 2, pwY1]} stroke={pwColor} strokeWidth={2} listening={false} />
      <Line points={[pwX - 6, pwY2, pwX + 2, pwY2]} stroke={pwColor} strokeWidth={2} listening={false} />
      <Text
        x={pwX + 6} y={(pwY1 + pwY2) / 2 - 20} width={60}
        text={`party wall\n${BLOCK.partyWall.lengthM}m`}
        fontSize={8} fill={pwColor} lineHeight={1.4} listening={false} />
      {/* drag hit area */}
      <Rect
        x={pwX - 8} y={pwY1} width={16} height={pwY2 - pwY1}
        fill="transparent" listening={true}
        onPointerDown={handlePWDragStart}
        style={{ cursor: 'ns-resize' }} />

      {/* ruler backgrounds */}
      <Rect x={0} y={0} width={BX + BW + RULER_PX + 40} height={BY} fill={rulerFill} listening={false} />
      <Rect x={0} y={0} width={BX} height={BY + BD + RULER_PX + 20} fill={rulerFill} listening={false} />

      {/* ruler lines */}
      <Line points={[BX, BY, BX, BY + BD]} stroke={rulerTick} strokeWidth={1} listening={false} />
      <Line points={[BX, BY, BX + BW, BY]} stroke={rulerTick} strokeWidth={1} listening={false} />

      {nsTicks}
      {ewTicks}

      {/* edge labels */}
      <Text x={BX + BW / 2 - 60} y={BY - RULER_PX - 2} width={120} text="Woods St — north" fontSize={9} fill={edgeLabelColor} align="center" listening={false} />
      <Text x={BX - RULER_PX - 30} y={BY + BD / 2} width={30} text="← Lot 8" fontSize={8} fill={edgeLabelColor} align="right" listening={false} rotation={0} />
      <Text x={BX + BW + 4} y={BY + BD / 2 - 10} text="Lot 10 →" fontSize={8} fill={edgeLabelColor} listening={false} />
      <Text x={BX + BW / 2 - 20} y={BY + BD + 4} text="rear" fontSize={9} fill={edgeLabelColor} listening={false} />
    </Layer>
  );
}
