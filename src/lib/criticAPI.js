import { OPENROUTER_URL, OPENROUTER_MODEL } from './constants';
import { generateBriefSummary } from './briefSummary';

const SYSTEM_PROMPT = `You are a residential architect specialising in compact urban houses in Melbourne, Australia.
You are reviewing a schematic design for a single-storey house at 79 Woods Street Newport VIC 3015.

Block: 9.4m wide × 33.5m deep. GRZ1 zone, no overlays. Street faces north (top of plan).
Party wall on south boundary starting 9.37m from street, 8.25m long.
Maximum footprint: 189m² (60% site coverage GRZ1).

The clients are a couple, no children, 1 dog, both work from home (2 studios required).
They want a Japanese/Persian courtyard aesthetic — inward-looking, strong indoor-outdoor connection,
quiet street face, central courtyard as the organising element.

You have access to their full design brief and current schematic layout.

Your role:
1. Give specific, actionable feedback referencing actual room names, dimensions, and positions
2. Check ResCode Clause 54 requirements where relevant
3. Evaluate against the brief priorities in their ranked order
4. Flag anything that won't work spatially or doesn't suit the brief
5. Suggest specific alternatives — don't just identify problems
6. Be direct and concise — the clients are technically literate (engineer + landscape architect)
7. Never use generic advice — reference their specific block, brief, and layout

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

  return {
    brief: { ...brief, summary: generateBriefSummary(brief) },
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
