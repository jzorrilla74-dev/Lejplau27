export function checkMelbourneCompliance(rooms, block) {
  const warnings = [];
  const siteArea = block.widthM * block.depthM; // 314.9m²

  const excludeFromBuilt = ['outdoor', 'furniture', 'softscape'];
  const excludeFromHard  = ['outdoor', 'softscape', 'furniture'];

  // A5 — Site coverage max 60%
  const builtArea = rooms
    .filter(r => !excludeFromBuilt.includes(r.category))
    .reduce((a, r) => a + r.w * r.d, 0);
  if (builtArea / siteArea > 0.60)
    warnings.push({
      type: 'A5', severity: 'error',
      message: `Site coverage ${((builtArea / siteArea) * 100).toFixed(1)}% exceeds GRZ1 maximum 60% — Clause 54 Standard A5`,
    });

  // A6 — Permeability min 20%
  const hardArea = rooms
    .filter(r => !excludeFromHard.includes(r.category))
    .reduce((a, r) => a + r.w * r.d, 0);
  const permeability = 1 - (hardArea / siteArea);
  if (permeability < 0.20)
    warnings.push({
      type: 'A6', severity: 'error',
      message: `Permeable area ${(permeability * 100).toFixed(1)}% below required 20% minimum — Clause 54 Standard A6`,
    });

  // A10 — North side setback min 1.0m (per room)
  rooms.forEach(r => {
    if (r.x < block.setbacks.north)
      warnings.push({
        uid: r.uid, type: 'A10', severity: 'error',
        message: `${r.label} breaches 1.0m north side setback — Clause 54 Standard A10`,
      });
  });

  // A10 — Front setback min 3.5m (per room)
  rooms.forEach(r => {
    if (r.y < block.setbacks.front)
      warnings.push({
        uid: r.uid, type: 'A10', severity: 'error',
        message: `${r.label} breaches 3.5m front setback (Woods Street) — Clause 54 Standard A10`,
      });
  });

  // A17 — Private open space min 80m², one area min 25m²
  const openRooms = rooms.filter(r => r.category === 'outdoor');
  const totalOpen = openRooms.reduce((a, r) => a + r.w * r.d, 0);
  const largestOpen = openRooms.length ? Math.max(...openRooms.map(r => r.w * r.d)) : 0;
  if (totalOpen < 80)
    warnings.push({
      type: 'A17', severity: 'warning',
      message: `Private open space ${totalOpen.toFixed(0)}m² below recommended 80m² — Clause 54 Standard A17`,
    });
  if (openRooms.length > 0 && largestOpen < 25)
    warnings.push({
      type: 'A17', severity: 'warning',
      message: `Largest open space ${largestOpen.toFixed(0)}m² — ResCode requires at least one area of 25m² — Standard A17`,
    });

  // A20 — Solar access: flag if built form past 67% of block depth
  const maxDepth = rooms
    .filter(r => !excludeFromBuilt.includes(r.category))
    .reduce((a, r) => Math.max(a, r.y + r.d), 0);
  if (maxDepth > block.depthM * 0.67)
    warnings.push({
      type: 'A20', severity: 'warning',
      message: `Built form at ${maxDepth.toFixed(1)}m from street — may compromise rear solar access — Clause 54 Standard A20`,
    });

  // NatHERS 7-star — flag if openings placed but none are north-facing
  const openings = rooms.filter(r => r.category === 'openings');
  const northFacing = openings.filter(r => r.y < block.setbacks.front + 4);
  if (openings.length > 0 && northFacing.length === 0)
    warnings.push({
      type: 'NatHERS', severity: 'warning',
      message: 'No north-facing openings detected — NatHERS 7-star requires passive solar access to living areas',
    });

  return warnings;
}
