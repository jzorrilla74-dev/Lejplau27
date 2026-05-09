export function parseImportedJSON(text) {
  const data = JSON.parse(text);
  if (!data.version || data.version < 1) throw new Error('Unknown file format');
  return {
    brief:          data.brief || null,
    rooms:          data.rooms || [],
    partyWallStartM: data.partyWallStartM ?? 9.37,
    layers:         data.layers || null,
    theme:          data.theme || 'dark',
  };
}
