const KEY = 'lejplau27_versions';
const MAX = 20;

export function listVersions() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}

export function saveVersion(name, rooms, partyWallStartM) {
  const versions = listVersions();
  const entry = { id: Date.now().toString(), name, savedAt: new Date().toISOString(), rooms, partyWallStartM };
  const next = [entry, ...versions].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return entry;
}

export function deleteVersion(id) {
  localStorage.setItem(KEY, JSON.stringify(listVersions().filter(v => v.id !== id)));
}
