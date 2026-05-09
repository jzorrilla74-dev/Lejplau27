export function checkConstraints(rooms, block) {
  const warnings = [];
  const { setbacks, widthM, depthM, maxFootprintM2 } = block;
  const buildableX1 = setbacks.north;
  const buildableX2 = widthM;
  const buildableY1 = setbacks.front;
  const buildableY2 = depthM - setbacks.rear;

  const built = rooms.filter(r => r.category !== 'outdoor' && r.category !== 'furniture');
  const total = built.reduce((a, r) => a + r.w * r.d, 0);
  if (total > maxFootprintM2) {
    warnings.push({ uid: null, type: 'coverage', message: `Footprint ${total.toFixed(0)}m² exceeds ${maxFootprintM2}m² maximum` });
  }

  rooms.forEach(r => {
    if (r.x < buildableX1)           warnings.push({ uid: r.uid, type: 'setback', message: `${r.label} breaches north setback` });
    if (r.x + r.w > buildableX2)     warnings.push({ uid: r.uid, type: 'setback', message: `${r.label} outside south boundary` });
    if (r.y < buildableY1)           warnings.push({ uid: r.uid, type: 'setback', message: `${r.label} breaches front setback` });
    if (r.y + r.d > buildableY2)     warnings.push({ uid: r.uid, type: 'setback', message: `${r.label} breaches rear setback` });

    rooms.forEach(other => {
      if (other.uid === r.uid) return;
      const ox = r.x < other.x + other.w && r.x + r.w > other.x;
      const oy = r.y < other.y + other.d && r.y + r.d > other.y;
      if (ox && oy) warnings.push({ uid: r.uid, type: 'overlap', message: `${r.label} overlaps ${other.label}` });
    });
  });

  return warnings;
}
