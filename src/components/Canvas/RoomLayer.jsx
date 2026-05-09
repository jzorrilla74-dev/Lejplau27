import { useRef } from 'react';
import { Layer, Group, Rect, Text } from 'react-konva';
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

// buildable envelope in metres
const ENV = {
  x1: BLOCK.setbacks.north,
  x2: BLOCK.widthM,
  y1: BLOCK.setbacks.front,
  y2: BLOCK.depthM - BLOCK.setbacks.rear,
};

function snapTo(val, grid) {
  return Math.round(val / grid) * grid;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export default function RoomLayer({ stageRef }) {
  const { scale, selectedUid, dispatch: cDispatch } = useCanvas();
  const { rooms, dispatch: lDispatch } = useLayout();
  const { layers } = useLayers();
  const shiftRef = useRef(false);

  const BX = RULER_PX + MARGIN;
  const BY = RULER_PX + MARGIN;

  const warnings = checkConstraints(rooms, BLOCK);
  const warnUids = new Set(warnings.filter(w => w.uid).map(w => w.uid));
  const overlapUids = new Set(warnings.filter(w => w.type === 'overlap' && w.uid).map(w => w.uid));

  function toCanvas(xm, ym) {
    return { x: BX + xm * scale, y: BY + ym * scale };
  }

  function toMetres(px, py) {
    return { xm: (px - BX) / scale, ym: (py - BY) / scale };
  }

  function handleDragStart(e, room) {
    if (room.locked) return e.target.stopDrag();
    shiftRef.current = e.evt.shiftKey;
    cDispatch({ type: 'SELECT_ROOM', uid: room.uid });
  }

  function handleDragMove(e, room) {
    const node = e.target;
    const grid = (e.evt.shiftKey ? FINE_GRID_M : GRID_M);
    const pos = node.position();
    const xm = snapTo((pos.x - BX) / scale, grid);
    const ym = snapTo((pos.y - BY) / scale, grid);
    const cx = clamp(xm, ENV.x1, ENV.x2 - room.w);
    const cy = clamp(ym, ENV.y1, ENV.y2 - room.d);
    node.x(BX + cx * scale);
    node.y(BY + cy * scale);
  }

  function handleDragEnd(e, room) {
    const node = e.target;
    const xm = (node.x() - BX) / scale;
    const ym = (node.y() - BY) / scale;
    lDispatch({ type: 'UPDATE_ROOM', uid: room.uid, patch: { x: +xm.toFixed(2), y: +ym.toFixed(2) } });
  }

  function handleResizeHandle(e, room, handleType) {
    e.cancelBubble = true;
    const stage = stageRef?.current;
    if (!stage) return;
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

      // clamp to envelope
      x = clamp(x, ENV.x1, ENV.x2 - MIN_ROOM_M);
      y = clamp(y, ENV.y1, ENV.y2 - MIN_ROOM_M);
      w = Math.min(w, ENV.x2 - x);
      d = Math.min(d, ENV.y2 - y);

      lDispatch({ type: 'UPDATE_ROOM', uid: room.uid, patch: { x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), d: +d.toFixed(2) } });
    }

    function onUp() {
      stage.off('pointermove', onMove);
      stage.off('pointerup', onUp);
    }

    stage.on('pointermove', onMove);
    stage.on('pointerup', onUp);
  }

  const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));

  return (
    <Layer>
      {rooms
        .filter(r => visibleLayerIds.has(r.layerId))
        .map(room => {
          const catStyle = CAT_STYLES[room.category] || CAT_STYLES.service;
          const isSelected = selectedUid === room.uid;
          const hasWarning = warnUids.has(room.uid);
          const hasOverlap = overlapUids.has(room.uid);
          const layer = layers.find(l => l.id === room.layerId);
          const opacity = (layer?.opacity ?? 1) * (room.category === 'furniture' ? 0.7 : 0.93);
          const isFurniture = room.category === 'furniture';

          const px = BX + room.x * scale;
          const py = BY + room.y * scale;
          const pw = room.w * scale;
          const pd = room.d * scale;

          let strokeColor = catStyle.stroke;
          if (hasOverlap) strokeColor = '#f0c040';
          else if (hasWarning) strokeColor = '#f08020';
          if (isSelected) strokeColor = '#ffffff';

          const strokeWidth = isSelected ? 2 : 1;
          const showLabel = pw > 20 && pd > 20;

          return (
            <Group
              key={room.uid}
              x={px} y={py}
              draggable={!room.locked && !layers.find(l => l.id === room.layerId)?.locked}
              onPointerDown={() => cDispatch({ type: 'SELECT_ROOM', uid: room.uid })}
              onDragStart={e => handleDragStart(e, room)}
              onDragMove={e => handleDragMove(e, room)}
              onDragEnd={e => handleDragEnd(e, room)}
            >
              <Rect
                width={pw} height={pd}
                fill={catStyle.fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                cornerRadius={2}
                dash={isFurniture ? [4, 3] : undefined}
              />
              {showLabel && (
                <>
                  <Text
                    x={4} y={pd / 2 - 14}
                    width={pw - 8} text={room.label}
                    fontSize={Math.min(13, pw / 5)}
                    fill="#f1ead9" align="center" listening={false}
                  />
                  <Text
                    x={4} y={pd / 2 + 2}
                    width={pw - 8}
                    text={`${room.w}×${room.d}m`}
                    fontSize={Math.min(11, pw / 7)}
                    fontFamily="'JetBrains Mono', monospace"
                    fill="#b6ab93" align="center" listening={false}
                  />
                </>
              )}

              {/* selected state handles + delete + dims */}
              {isSelected && !room.locked && (
                <>
                  {/* resize handles: corners + midpoints */}
                  {[
                    { id: 'nw', hx: 0,      hy: 0      },
                    { id: 'n',  hx: pw/2,   hy: 0      },
                    { id: 'ne', hx: pw,     hy: 0      },
                    { id: 'e',  hx: pw,     hy: pd/2   },
                    { id: 'se', hx: pw,     hy: pd     },
                    { id: 's',  hx: pw/2,   hy: pd     },
                    { id: 'sw', hx: 0,      hy: pd     },
                    { id: 'w',  hx: 0,      hy: pd/2   },
                  ].map(h => (
                    <Rect
                      key={h.id}
                      x={h.hx - HANDLE_SIZE/2} y={h.hy - HANDLE_SIZE/2}
                      width={HANDLE_SIZE} height={HANDLE_SIZE}
                      fill="white" stroke={catStyle.stroke} strokeWidth={1}
                      onPointerDown={e => { e.cancelBubble = true; handleResizeHandle(e, room, h.id); }}
                    />
                  ))}

                  {/* delete button */}
                  <Rect
                    x={pw - 14} y={-14}
                    width={14} height={14}
                    fill="#e24b4a" cornerRadius={2}
                    onPointerDown={e => {
                      e.cancelBubble = true;
                      lDispatch({ type: 'REMOVE_ROOM', uid: room.uid });
                      cDispatch({ type: 'DESELECT' });
                    }}
                  />
                  <Text
                    x={pw - 13} y={-13}
                    text="✕" fontSize={10} fill="white" listening={false}
                  />

                  {/* dimension annotations */}
                  <Text x={pw/2 - 20} y={-14} width={40} text={`${room.w}m`} fontSize={9} fill="white" align="center" listening={false} />
                  <Text x={pw + 2} y={pd/2 - 6} text={`${room.d}m`} fontSize={9} fill="white" listening={false} />
                </>
              )}

              {/* locked icon */}
              {room.locked && (
                <Text x={4} y={4} text="🔒" fontSize={10} listening={false} />
              )}
            </Group>
          );
        })}
    </Layer>
  );
}
