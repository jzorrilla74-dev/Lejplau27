import Drawing from 'dxf-writer';

export function exportDXF(rooms) {
  const d = new Drawing();
  const cats = [...new Set(rooms.map(r => r.category))];
  cats.forEach(c => d.addLayer(c, Drawing.ACI.WHITE, 'CONTINUOUS'));
  rooms
    .filter(r => r.category !== 'furniture' && r.category !== 'softscape')
    .forEach(r => {
      d.setActiveLayer(r.category);
      d.drawRect(r.x, -r.y - r.d, r.w, r.d);
    });
  const str = d.toDxfString();
  const blob = new Blob([str], { type: 'application/dxf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lejplau27-plan.dxf';
  a.click();
  URL.revokeObjectURL(a.href);
}
