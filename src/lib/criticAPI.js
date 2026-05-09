import { OPENROUTER_URL, OPENROUTER_MODEL, BLOCK } from './constants';
import { generateBriefSummary } from './briefSummary';
import { checkMelbourneCompliance } from './melbourneRegs';

const SYSTEM_PROMPT = `You are a residential architect specialising in compact urban houses in Melbourne, Australia.
You are reviewing a schematic design for a single-storey house at 79 Woods Street Newport VIC 3015.

Block: 9.4m wide × 33.5m deep. GRZ1 zone, no overlays. Street faces north (top of plan).
Party wall on south boundary. Maximum footprint: 189m² (60% site coverage GRZ1).

You have access to the client's full design brief, ranked priorities, missing programme items, and current schematic layout.

Your role:
1. Give specific, actionable feedback referencing actual room names, dimensions, and positions
2. Check ResCode Clause 54 requirements and reference specific standard numbers (A5, A6, A10, A17, A20)
3. Evaluate all feedback against the client's ranked design priorities in the order listed in the context
4. Flag anything that won't work spatially or doesn't suit the brief
5. Suggest specific alternatives — don't just identify problems
6. Be direct and concise — the clients are technically literate (engineer + landscape architect)
7. Never use generic advice — reference their specific block, brief, and layout
8. If missingEssentials is non-empty, address unplaced programme items explicitly

Format responses with these sections:
## What's working
## Issues to address
## Specific suggestions
## Questions for the clients

Keep responses under 400 words unless complexity warrants more.`;

function buildContext(brief, layout, layers, requestType, question) {
  const { rooms, partyWallStartM } = layout;
  const builtRooms = rooms.filter(r => r.category !== 'furniture');
  const total = builtRooms.filter(r => r.category !== 'outdoor').reduce((a, r) => a + r.w * r.d, 0);

  const placedLabels = new Set(rooms.map(r => r.label.toLowerCase()));
  const missingEssentials = brief.programme
    .filter(p => p.checked && p.priority === 'essential' && !placedLabels.has(p.name.toLowerCase()))
    .map(p => p.name);

  const compliance = checkMelbourneCompliance(rooms, BLOCK).map(w => `[${w.type}] ${w.message}`);

  return {
    brief: { ...brief, summary: generateBriefSummary(brief) },
    missingEssentials,
    compliance,
    layout: {
      rooms: builtRooms.map(r => ({
        label: r.label,
        category: r.category,
        w: r.w,
        d: r.d,
        area: +(r.w * r.d).toFixed(1),
        position: `${r.x.toFixed(1)}m from north boundary, ${r.y.toFixed(1)}m from street`,
        layer: layers.find(l => l.id === r.layerId)?.name || 'Rooms',
      })),
      metrics: {
        totalBuiltM2: +total.toFixed(1),
        coveragePct: +((total / 189) * 100).toFixed(1),
        roomCount: builtRooms.length,
      },
      partyWall: { startM: partyWallStartM, lengthM: 8.25 },
    },
    block: {
      widthM: 9.4, depthM: 33.5,
      orientation: 'Woods Street faces north (top of plan)',
      setbacks: { front: 3.5, rear: 5.0, north: 1.0, south: 0 },
      zone: 'GRZ1 Hobsons Bay — no overlays',
    },
    requestType,
    question: question || null,
  };
}

export async function callCritic({ brief, layout, layers, requestType, question, conversationHistory, apiKey, onChunk, onDone, onError }) {
  const context = buildContext(brief, layout, layers, requestType, question);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lejplau27.netlify.app',
        'X-Title': 'LeJplau27',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        stream: true,
        max_tokens: 1000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(conversationHistory || []).slice(-10),
          { role: 'user', content: JSON.stringify(context) },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      onError(`API error ${res.status}: ${errText}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) { full += text; onChunk(text); }
        } catch {}
      }
    }
    onDone(full);
  } catch (err) {
    onError(err.message);
  }
}
