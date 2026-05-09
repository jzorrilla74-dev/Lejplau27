export function saveJSON(brief, layout, layers, theme) {
  const data = {
    version: 2,
    project: '79 Woods Street Newport',
    savedAt: new Date().toISOString(),
    brief,
    rooms: layout.rooms,
    partyWallStartM: layout.partyWallStartM,
    layers,
    theme,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lejplau27-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
