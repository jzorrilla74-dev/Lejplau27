import { useRef, useState, useEffect, useCallback } from 'react';
import { Layer, Group, Rect, Text, Circle, Line } from 'react-konva';
import { CAT_STYLES } from '../../lib/roomDefaults';
import { BLOCK, GRID_M, FINE_GRID_M } from '../../lib/constants';
import { useCanvas } from '../../context/CanvasContext';
import { useLayout } from '../../context/LayoutContext';
import { useLayers } from '../../context/LayerContext';
import { checkConstraints } from '../../lib/constraints';

const RULER_PX = 20;
const MARGIN = 8;
const HANDLE_SIZE = 8;
const MIN_ROOM_M = 0.5;
const SNAP_OBJ_DIST = 0.3;

// Rooms can go anywhere within the full block boundary
const ENV = {
  x1: 0,
  x2: BLOCK.widthM,
  y1: 0,
  y2: BLOCK.depthM,
};

function hexAlpha(hex, a) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

function snapTo(val, grid) {
  return Math.round(val / grid) * grid;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const WALL_EPS = 0.005; // 5mm tolerance for shared-wall detection

function uncoveredIntervals(start, end, covered) {
  let segs = [[start, end]];
  for (const [cs, ce] of covered) {
    segs = segs.flatMap(([s, e]) => {
      if (ce <= s + WALL_EPS || cs >= e - WALL_EPS) return [[s, e]];
      const out = [];
      if (cs > s + WALL_EPS) out.push([s, cs]);
      if (ce < e - WALL_EPS) out.push([ce, e]);
      return out;
    });
  }
  return segs;
}

// Returns line segment points [x1,y1,x2,y2] in local pixel coords (origin = room top-left)
function getExposedWalls(room, allRooms, scale) {
  const pw = room.w * scale;
  const pd = room.d * scale;
  const lines = [];

  // Right wall: local x = pw
  const rCov = allRooms
    .filter(r => r.uid !== room.uid && Math.abs(r.x - (room.x + room.w)) < WALL_EPS)
    .map(r => [Math.max(r.y, room.y), Math.min(r.y + r.d, room.y + room.d)])
    .filter(([s, e]) => e > s + WALL_EPS);
  for (const [ys, ye] of uncoveredIntervals(room.y, room.y + room.d, rCov))
    lines.push([pw, (ys - room.y) * scale, pw, (ye - room.y) * scale]);

  // Left wall: local x = 0
  const lCov = allRooms
    .filter(r => r.uid !== room.uid && Math.abs((r.x + r.w) - room.x) < WALL_EPS)
    .map(r => [Math.max(r.y, room.y), Math.min(r.y + r.d, room.y + room.d)])
    .filter(([s, e]) => e > s + WALL_EPS);
  for (const [ys, ye] of uncoveredIntervals(room.y, room.y + room.d, lCov))
    lines.push([0, (ys - room.y) * scale, 0, (ye - room.y) * scale]);

  // Bottom wall: local y = pd
  const bCov = allRooms
    .filter(r => r.uid !== room.uid && Math.abs(r.y - (room.y + room.d)) < WALL_EPS)
    .map(r => [Math.max(r.x, room.x), Math.min(r.x + r.w, room.x + room.w)])
    .filter(([s, e]) => e > s + WALL_EPS);
  for (const [xs, xe] of uncoveredIntervals(room.x, room.x + room.w, bCov))
    lines.push([(xs - room.x) * scale, pd, (xe - room.x) * scale, pd]);

  // Top wall: local y = 0
  const tCov = allRooms
    .filter(r => r.uid !== room.uid && Math.abs((r.y + r.d) - room.y) < WALL_EPS)
    .map(r => [Math.max(r.x, room.x), Math.min(r.x + r.w, room.x + room.w)])
    .filter(([s, e]) => e > s + WALL_EPS);
  for (const [xs, xe] of uncoveredIntervals(room.x, room.x + room.w, tCov))
    lines.push([(xs - room.x) * scale, 0, (xe - room.x) * scale, 0]);

  return lines;
}

export default function RoomLayer({ stageRef, setCtxMenu }) {
  const { scale, selectedUid, selectedUids, theme, snapEnabled, dispatch: cDispatch } = useCanvas();
  const { rooms, partyWallStartM, dispatch: lDispatch } = useLayout();
  const { layers, activeLayerId } = useLayers();
  const [snapGuides, setSnapGuides] = useState({ x: [], y: [] });
  const [multiDragDelta, setMultiDragDelta] = useState({ dx: 0, dy: 0 });
  const multiDragDeltaRef = useRef({ dx: 0, dy: 0 });
  const draggedUidRef = useRef(null);
  const multiDragStartRef = useRef({});

  const BX = RULER_PX + MARGIN;
  const BY = RULER_PX + MARGIN;

  useEffect(() => {
    function onKey(e) {
      if (!selectedUid) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ']') { e.preventDefault(); lDispatch({ type: 'BRING_FORWARD', uid: selectedUid }); }
      if (mod && e.key === '[') { e.preventDefault(); lDispatch({ type: 'SEND_BACKWARD', uid: selectedUid }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedUid, lDispatch]);

  const warnings = checkConstraints(rooms, BLOCK);
  const warnUids = new Set(warnings.filter(w => w.uid).map(w => w.uid));
  const overlapUids = new Set(warnings.filter(w => w.type === 'overlap' && w.uid).map(w => w.uid));

  function handleDragStart(e, room) {
    if (room.locked) return e.target.stopDrag();
    draggedUidRef.current = room.uid;
    if (selectedUids.length > 1 && selectedUids.includes(room.uid)) {
      const starts = {};
      for (const uid of selectedUids) {
        const r = rooms.find(r2 => r2.uid === uid);
        if (r) starts[uid] = { x: r.x, y: r.y };
      }
      multiDragStartRef.current = starts;
    }
  }

  function handleDragMove(e, room) {
    const node = e.target;
    const grid = e.evt.shiftKey ? FINE_GRID_M : GRID_M;
    const pw = room.w * scale;
    const pd = room.d * scale;

    // Raw meter position (pixel-exact, no grid quantisation yet)
    const rawXm = (node.x() - pw / 2 - BX) / scale;
    const rawYm = (node.y() - pd / 2 - BY) / scale;

    // Default to grid snap; object/boundary snap overrides below
    let xm = snapTo(rawXm, grid);
    let ym = snapTo(rawYm, grid);

    if (snapEnabled) {
      // Build snap-target X edges: block boundaries + room edges
      const snapXEdges = [
        BLOCK.setbacks.north,
        BLOCK.widthM,
      ];
      // Build snap-target Y edges: setbacks + party wall + room edges
      const snapYEdges = [
        BLOCK.setbacks.front,
        BLOCK.depthM - BLOCK.setbacks.rear,
        BLOCK.depthM,
        partyWallStartM,
        partyWallStartM + BLOCK.partyWall.lengthM,
      ];
      for (const other of rooms) {
        if (other.uid === room.uid) continue;
        snapXEdges.push(other.x, other.x + other.w);
        snapYEdges.push(other.y, other.y + other.d);
      }

      let bestDx = SNAP_OBJ_DIST + 1;
      let bestDy = SNAP_OBJ_DIST + 1;
      let snapEdgeX = null;
      let snapEdgeY = null;

      for (const ex of snapXEdges) {
        const dLeft  = Math.abs(rawXm - ex);
        const dRight = Math.abs(rawXm + room.w - ex);
        if (dLeft < bestDx)  { bestDx = dLeft;  xm = ex;          snapEdgeX = ex; }
        if (dRight < bestDx) { bestDx = dRight; xm = ex - room.w; snapEdgeX = ex; }
      }
      for (const ey of snapYEdges) {
        const dTop    = Math.abs(rawYm - ey);
        const dBottom = Math.abs(rawYm + room.d - ey);
        if (dTop < bestDy)    { bestDy = dTop;    ym = ey;          snapEdgeY = ey; }
        if (dBottom < bestDy) { bestDy = dBottom; ym = ey - room.d; snapEdgeY = ey; }
      }

      const guideX = snapEdgeX !== null ? [BX + snapEdgeX * scale] : [];
      const guideY = snapEdgeY !== null ? [BY + snapEdgeY * scale] : [];
      setSnapGuides({ x: guideX, y: guideY });
    } else {
      setSnapGuides({ x: [], y: [] });
    }

    const cx = clamp(xm, ENV.x1, ENV.x2 - room.w);
    const cy = clamp(ym, ENV.y1, ENV.y2 - room.d);

    // node.x/y is GROUP CENTER (offsetX/offsetY) — add half-size back
    node.x(BX + cx * scale + pw / 2);
    node.y(BY + cy * scale + pd / 2);

    // Multi-drag: track the delta so non-dragged selected rooms follow
    if (selectedUids.length > 1 && selectedUids.includes(room.uid)) {
      const startPos = multiDragStartRef.current[room.uid];
      if (startPos) {
        const delta = { dx: cx - startPos.x, dy: cy - startPos.y };
        multiDragDeltaRef.current = delta;
        setMultiDragDelta(delta);
      }
    }
  }

  function handleDragEnd(e, room) {
    const node = e.target;
    const pw = room.w * scale;
    const pd = room.d * scale;
    const xm = +(Math.round((node.x() - pw / 2 - BX) / scale / GRID_M) * GRID_M).toFixed(3);
    const ym = +(Math.round((node.y() - pd / 2 - BY) / scale / GRID_M) * GRID_M).toFixed(3);
    lDispatch({ type: 'UPDATE_ROOM', uid: room.uid, patch: { x: xm, y: ym } });

    // Commit all other selected rooms at their offset positions
    if (selectedUids.length > 1 && selectedUids.includes(room.uid)) {
      const { dx, dy } = multiDragDeltaRef.current;
      for (const uid of selectedUids) {
        if (uid === room.uid) continue;
        const start = multiDragStartRef.current[uid];
        if (!start) continue;
        lDispatch({ type: 'UPDATE_ROOM', uid, patch: {
          x: +(start.x + dx).toFixed(3),
          y: +(start.y + dy).toFixed(3),
        }});
      }
      multiDragDeltaRef.current = { dx: 0, dy: 0 };
      setMultiDragDelta({ dx: 0, dy: 0 });
      multiDragStartRef.current = {};
    }

    draggedUidRef.current = null;
    setSnapGuides({ x: [], y: [] });
  }

  function isRoomDraggable(room) {
    return !room.locked && !layers.find(l => l.id === room.layerId)?.locked;
  }

  function handleResizeHandle(e, room, handleType) {
    e.cancelBubble = true;
    const stage = stageRef?.current;
    if (!stage) return;

    // Disable group drag for the duration of the resize
    const roomGroup = e.target.getParent().getParent();
    if (roomGroup) roomGroup.draggable(false);

    const startPos = stage.getPointerPosition();
    const startRoom = { ...room };

    function onMove() {
      const pos = stage.getPointerPosition();
      const dx = (pos.x - startPos.x) / scale;
      const dy = (pos.y - startPos.y) / scale;
      const grid = GRID_M;

      let { x, y, w, d } = startRoom;

      if (handleType.includes('e')) w = Math.max(MIN_ROOM_M, snapTo(startRoom.w + dx, grid));
      if (handleType.includes('s')) d = Math.max(MIN_ROOM_M, snapTo(startRoom.d + dy, grid));
      if (handleType.includes('w')) {
        const newX = snapTo(startRoom.x + dx, grid);
        const newW = Math.max(MIN_ROOM_M, startRoom.w - (newX - startRoom.x));
        if (newW > MIN_ROOM_M) { x = newX; w = newW; }
      }
      if (handleType.includes('n')) {
        const newY = snapTo(startRoom.y + dy, grid);
        const newD = Math.max(MIN_ROOM_M, startRoom.d - (newY - startRoom.y));
        if (newD > MIN_ROOM_M) { y = newY; d = newD; }
      }

      x = clamp(x, ENV.x1, ENV.x2 - MIN_ROOM_M);
      y = clamp(y, ENV.y1, ENV.y2 - MIN_ROOM_M);
      w = Math.min(w, ENV.x2 - x);
      d = Math.min(d, ENV.y2 - y);

      lDispatch({ type: 'UPDATE_ROOM', uid: room.uid, patch: { x: +x.toFixed(3), y: +y.toFixed(3), w: +w.toFixed(3), d: +d.toFixed(3) } });
    }

    function onUp() {
      stage.off('pointermove', onMove);
      stage.off('pointerup', onUp);
      if (roomGroup) roomGroup.draggable(isRoomDraggable(room));
    }

    stage.on('pointermove', onMove);
    stage.on('pointerup', onUp);
  }

  const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));
  const visibleRooms = rooms
    .filter(r => visibleLayerIds.has(r.layerId))
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const baseRooms      = visibleRooms.filter(r => r.category !== 'openings' && r.category !== 'furniture');
  const furnitureRooms = visibleRooms.filter(r => r.category === 'furniture');
  const openingRooms   = visibleRooms.filter(r => r.category === 'openings');

  function renderRoom(room) {
    const catStyle      = CAT_STYLES[room.category] || CAT_STYLES.service;
    const isSelected    = selectedUids.includes(room.uid);
    const isOnlySelected = isSelected && selectedUids.length === 1;
    const hasWarning    = warnUids.has(room.uid);
    const hasOverlap    = overlapUids.has(room.uid);
    const layer         = layers.find(l => l.id === room.layerId);
    const isActiveLayer = layer?.id === activeLayerId;
    const isStructural  = room.category === 'structural';
    const isFurniture   = room.category === 'furniture';
    const isOpening     = room.category === 'openings';
    const isSoftscape   = room.category === 'softscape';
    const structuralFill = theme === 'dark' ? '#222222' : '#888888';
    const layerOpacity  = isActiveLayer ? 1.0 : (layer?.opacity ?? 1) * 0.85;

    // During multi-drag, non-dragged selected rooms follow the dragged room's delta
    const isBeingDragged = room.uid === draggedUidRef.current;
    const extraPx = (!isBeingDragged && isSelected && selectedUids.length > 1)
      ? multiDragDelta.dx * scale : 0;
    const extraPy = (!isBeingDragged && isSelected && selectedUids.length > 1)
      ? multiDragDelta.dy * scale : 0;

    const px = BX + room.x * scale + extraPx;
    const py = BY + room.y * scale + extraPy;
    const pw = room.w * scale;
    const pd = room.d * scale;

    let strokeColor = catStyle.stroke;
    if (hasOverlap) strokeColor = '#f0c040';
    else if (hasWarning) strokeColor = '#f08020';
    if (isSelected) strokeColor = selectedUids.length > 1 ? '#4A9EFF' : '#ffffff';

    const strokeWidth = isSelected ? 2 : 1.5;
    const showLabel   = pw > 20 && pd > 20;

    const cx = px + pw / 2;
    const cy = py + pd / 2;

    const fillColor = isStructural
      ? structuralFill
      : isSoftscape
        ? hexAlpha(catStyle.fill, room.filled !== false ? 0.40 : 0)
        : room.filled !== false
          ? hexAlpha(catStyle.fill, 0.15)
          : 'transparent';

    function handleRotateStart(e) {
      e.cancelBubble = true;
      const stage = stageRef?.current;
      if (!stage) return;

      // Disable group drag for the duration of rotation
      const roomGroup = e.target.getParent();
      if (roomGroup) roomGroup.draggable(false);

      function onMove(ev) {
        const ptr = stage.getPointerPosition();
        const rawAngle = Math.atan2(ptr.y - cy, ptr.x - cx) * 180 / Math.PI + 90;
        const angle = ((rawAngle % 360) + 360) % 360;
        const snapped = ev.evt?.shiftKey ? angle : Math.round(angle / 45) * 45;
        lDispatch({ type: 'UPDATE_ROOM', uid: room.uid, patch: { rotation: snapped } });
      }
      function onUp() {
        stage.off('pointermove', onMove);
        stage.off('pointerup', onUp);
        if (roomGroup) roomGroup.draggable(isRoomDraggable(room));
      }
      stage.on('pointermove', onMove);
      stage.on('pointerup', onUp);
    }

    return (
      <Group
        key={room.uid}
        x={cx} y={cy}
        offsetX={pw / 2} offsetY={pd / 2}
        rotation={room.rotation ?? 0}
        opacity={layerOpacity}
        draggable={isRoomDraggable(room) && !(!isBeingDragged && draggedUidRef.current !== null)}
        onPointerDown={e => {
          if (e.evt.shiftKey) {
            cDispatch({ type: 'SHIFT_SELECT', uid: room.uid });
          } else if (!selectedUids.includes(room.uid)) {
            cDispatch({ type: 'SELECT_ROOM', uid: room.uid });
          }
        }}
        onDragStart={e => handleDragStart(e, room)}
        onDragMove={e => handleDragMove(e, room)}
        onDragEnd={e => handleDragEnd(e, room)}
        onContextMenu={e => {
          e.evt.preventDefault();
          setCtxMenu({ uid: room.uid, x: e.evt.clientX, y: e.evt.clientY });
        }}
      >
        {isSoftscape ? (
          <Circle
            x={pw / 2} y={pd / 2}
            radius={Math.min(pw, pd) / 2}
            fill={fillColor}
            stroke={isSelected ? (selectedUids.length > 1 ? '#4A9EFF' : '#ffffff') : strokeColor}
            strokeWidth={strokeWidth}
          />
        ) : (
          <>
            {/* Fill rect — transparent-safe hit area */}
            <Rect
              width={pw} height={pd}
              fill={fillColor === 'transparent' ? 'rgba(0,0,0,0.001)' : fillColor}
              cornerRadius={isStructural ? 0 : 2}
              dash={isFurniture ? [4, 3] : isOpening ? [2, 2] : undefined}
            />
            {/* Exposed wall segments only — shared walls suppressed */}
            {getExposedWalls(room, rooms, scale).map((pts, i) => (
              <Line key={i} points={pts}
                stroke={strokeColor}
                strokeWidth={isStructural ? 2 : strokeWidth}
                listening={false} />
            ))}
            {/* Selection overlay: full outline on top of suppressed walls */}
            {isSelected && (
              <Rect width={pw} height={pd}
                fill="transparent"
                stroke={selectedUids.length > 1 ? '#4A9EFF' : '#ffffff'}
                strokeWidth={2} listening={false} />
            )}
          </>
        )}

        {isActiveLayer && !isSoftscape && (
          <Rect width={pw} height={pd} fill="transparent"
            stroke="rgba(255,255,255,0.10)" strokeWidth={1} listening={false} />
        )}

        {showLabel && (
          <>
            <Text
              x={4} y={pd / 2 - 14}
              width={pw - 8} text={room.label}
              fontSize={Math.min(13, pw / 5)}
              fill={theme === 'dark' ? '#e8e6de' : '#1a1a18'}
              align="center" listening={false}
              shadowColor={theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
              shadowOffsetX={0} shadowOffsetY={0} shadowBlur={4}
            />
            <Text
              x={4} y={pd / 2 + 2}
              width={pw - 8}
              text={`${room.w}×${room.d}m`}
              fontSize={Math.min(11, pw / 7)}
              fontFamily="'JetBrains Mono', monospace"
              fill={theme === 'dark' ? '#9c9a92' : '#5a5a54'}
              align="center" listening={false}
              shadowColor={theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
              shadowOffsetX={0} shadowOffsetY={0} shadowBlur={3}
            />
          </>
        )}

        {isOnlySelected && !room.locked && (
          <>
            {[
              { id: 'nw', hx: 0,    hy: 0    },
              { id: 'n',  hx: pw/2, hy: 0    },
              { id: 'ne', hx: pw,   hy: 0    },
              { id: 'e',  hx: pw,   hy: pd/2 },
              { id: 'se', hx: pw,   hy: pd   },
              { id: 's',  hx: pw/2, hy: pd   },
              { id: 'sw', hx: 0,    hy: pd   },
              { id: 'w',  hx: 0,    hy: pd/2 },
            ].map(h => (
              <Group key={h.id}>
                {/* hit area: use near-zero alpha so Konva registers pointer events */}
                <Rect
                  x={h.hx - 10} y={h.hy - 10} width={20} height={20}
                  fill="rgba(0,0,0,0.001)"
                  onPointerDown={e => { e.cancelBubble = true; handleResizeHandle(e, room, h.id); }}
                />
                {/* visual only */}
                <Rect
                  x={h.hx - HANDLE_SIZE/2} y={h.hy - HANDLE_SIZE/2}
                  width={HANDLE_SIZE} height={HANDLE_SIZE}
                  fill="white" stroke={catStyle.stroke} strokeWidth={1} listening={false}
                />
              </Group>
            ))}

            <Rect
              x={pw - 14} y={-14} width={14} height={14}
              fill="#C47B6B" cornerRadius={2}
              onPointerDown={e => {
                e.cancelBubble = true;
                lDispatch({ type: 'REMOVE_ROOM', uid: room.uid });
                cDispatch({ type: 'DESELECT' });
              }}
            />
            <Text x={pw - 13} y={-13} text="✕" fontSize={10} fill="white" listening={false} />
            <Text x={pw/2 - 20} y={-14} width={40} text={`${room.w}m`} fontSize={9} fill="white" align="center" listening={false} />
            <Text x={pw + 2} y={pd/2 - 6} text={`${room.d}m`} fontSize={9} fill="white" listening={false} />

            <Line points={[pw/2, 0, pw/2, -20]} stroke="white" strokeWidth={1} listening={false} />
            <Circle
              x={pw/2} y={-26} radius={6}
              fill="white" stroke={catStyle.stroke} strokeWidth={1}
              onPointerDown={handleRotateStart}
            />
          </>
        )}

        {room.locked && (
          <Text x={4} y={4} text="🔒" fontSize={10} listening={false} />
        )}
      </Group>
    );
  }

  return (
    <Layer>
      {baseRooms.map(renderRoom)}
      {furnitureRooms.map(renderRoom)}
      {openingRooms.map(renderRoom)}

      {snapGuides.x.map((xPx, i) => (
        <Line key={`gx${i}`} points={[xPx, 0, xPx, 9999]}
          stroke="#4A9EFF" strokeWidth={1} dash={[4, 3]} listening={false} />
      ))}
      {snapGuides.y.map((yPx, i) => (
        <Line key={`gy${i}`} points={[0, yPx, 9999, yPx]}
          stroke="#4A9EFF" strokeWidth={1} dash={[4, 3]} listening={false} />
      ))}
    </Layer>
  );
}
