export function generateBriefSummary(brief) {
  const { household, programme, priorities, style, siteNotes } = brief;
  const essential = programme.filter(p => p.checked && p.priority === 'essential').map(p => p.name);
  const desired   = programme.filter(p => p.checked && p.priority === 'desired').map(p => p.name);
  return `A single-storey residence for ${household.occupants} occupant${household.occupants !== 1 ? 's' : ''}${household.pets ? ` and ${household.pets}` : ''}${household.workFromHome ? ', with home studio requirements' : ''}. Essential programme includes ${essential.join(', ')}${desired.length ? `; desired inclusions are ${desired.join(', ')}` : ''}. Design priorities (ranked): ${priorities.join(', ')}. Aesthetic: ${style.aesthetic || 'not specified'}. ${siteNotes}`;
}
