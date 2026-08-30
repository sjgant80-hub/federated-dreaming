// federated-dreaming · federate.mjs — THE EXCHANGE LAW (reference implementation).
//
// The runnable heart of the disclosure: devices learn TOGETHER by exchanging consolidated
// MEMORY RECORDS — never weights, never gradients, never raw data. Three mechanisms:
//
//   · PACK  — only five fields may ever cross a device boundary: topic, distilled, weight,
//             origin, seq. Any other field on the record REFUSES BY NAME at pack time.
//             The privacy wall is structural, not policy.
//   · ADMIT — the receiving device checks, in fixed order and BEFORE anything merges:
//             shape → identity (origin matches the grant) → capability (topic is granted)
//             → replay (seq strictly advances) → budget (the grant can still pay).
//             The first failure speaks; nothing after it runs.
//   · MERGE — a known topic reinforces by evidence accumulation: 1−(1−a)(1−b) — two
//             independent sightings compound, never exceed 1, and the LOCAL distilled text
//             is kept (a device's own words are never overwritten by a neighbour's).
//             An unknown topic is adopted only at weight ≥ κ (0.618); below that it is
//             HELD — heard, not yet believed.
//
// Pure and total: bad input → { ok:false, why }, never a throw mid-exchange.

export const KAPPA = 0.618;
export const ALLOWED = ['topic', 'distilled', 'weight', 'origin', 'seq'];

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const num01 = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
const str = (v) => typeof v === 'string' && v.length > 0;
const round3 = (x) => Math.round(x * 1000) / 1000;

/** PACK — build the only shape that may leave a device. Extra fields refuse BY NAME. */
export function pack(record, deviceId, seq) {
  const r = obj(record);
  if (!r) return { ok: false, why: 'record must be an object' };
  for (const k of Object.keys(r)) {
    if (k !== 'topic' && k !== 'distilled' && k !== 'weight')
      return { ok: false, why: `raw fields never cross: "${k}"` };
  }
  if (!str(r.topic)) return { ok: false, why: 'topic required' };
  if (!str(r.distilled)) return { ok: false, why: 'distilled summary required — raw content never crosses' };
  if (!num01(r.weight)) return { ok: false, why: 'weight must be a number in [0,1]' };
  if (!str(deviceId)) return { ok: false, why: 'origin device id required' };
  if (!Number.isInteger(seq) || seq < 1) return { ok: false, why: 'seq must be a positive integer' };
  return { ok: true, packet: { topic: r.topic, distilled: r.distilled, weight: round3(r.weight), origin: deviceId, seq } };
}

/**
 * ADMIT — the four doors, in fixed order, all BEFORE the merge. cost is 1 per admitted packet.
 * grant = { device, topics: [...], budget }. lastSeq = highest seq already accepted from this origin.
 */
export function admitExchange(packet, grant, lastSeq) {
  const p = obj(packet);
  if (!p) return { ok: false, why: 'shape: packet must be an object' };
  for (const k of Object.keys(p)) if (!ALLOWED.includes(k)) return { ok: false, why: `shape: unknown field crosses the wall: "${k}"` };
  for (const k of ALLOWED) if (p[k] === undefined) return { ok: false, why: `shape: missing field "${k}"` };
  if (!str(p.topic) || !str(p.distilled) || !str(p.origin)) return { ok: false, why: 'shape: topic, distilled and origin must be non-empty strings' };
  if (!num01(p.weight)) return { ok: false, why: 'shape: weight must be a number in [0,1]' };
  if (!Number.isInteger(p.seq) || p.seq < 1) return { ok: false, why: 'shape: seq must be a positive integer' };
  const g = obj(grant);
  if (!g || !str(g.device) || !Array.isArray(g.topics) || typeof g.budget !== 'number')
    return { ok: false, why: 'shape: grant must be { device, topics[], budget }' };
  if (!Number.isInteger(lastSeq) || lastSeq < 0) return { ok: false, why: 'shape: lastSeq must be a non-negative integer' };
  if (p.origin !== g.device) return { ok: false, why: `identity: packet claims "${p.origin}", the grant is for "${g.device}"` };
  if (!g.topics.includes(p.topic)) return { ok: false, why: `capability: topic "${p.topic}" is not granted` };
  if (p.seq <= lastSeq) return { ok: false, why: `replay: seq ${p.seq} is not after ${lastSeq}` };
  if (g.budget < 1) return { ok: false, why: 'budget: exhausted — the grant cannot pay for this exchange' };
  return { ok: true, cost: 1 };
}

/**
 * MERGE — fold one admitted packet into local memory. Returns a NEW memory (never mutates).
 * Known topic → reinforced: weight = 1−(1−a)(1−b), local distilled kept.
 * New topic   → adopted iff packet.weight ≥ κ, else held (memory unchanged, and it says so).
 */
export function merge(local, packet, kappa = KAPPA) {
  if (!Array.isArray(local)) return { ok: false, why: 'local memory must be a list' };
  const p = obj(packet);
  if (!p || !str(p.topic) || !str(p.distilled) || !num01(p.weight)) return { ok: false, why: 'packet must carry topic, distilled and weight — admit it first' };
  if (!(typeof kappa === 'number' && kappa > 0 && kappa < 1)) return { ok: false, why: 'kappa must be in (0,1)' };
  for (const m of local) {
    const c = obj(m);
    if (!c || !str(c.topic) || !num01(c.weight) || !str(c.distilled)) return { ok: false, why: 'local memory holds a malformed record' };
  }
  const i = local.findIndex((m) => m.topic === p.topic);
  if (i >= 0) {
    const a = local[i].weight, b = p.weight;
    const combined = round3(1 - (1 - a) * (1 - b));
    const memory = local.map((m, j) => j === i ? { ...m, weight: combined } : { ...m });
    return { ok: true, action: 'reinforced', memory, why: `topic "${p.topic}": ${a} ⊕ ${b} → ${combined} (local words kept)` };
  }
  if (p.weight >= kappa) {
    const memory = [...local.map((m) => ({ ...m })), { topic: p.topic, distilled: p.distilled, weight: round3(p.weight) }];
    return { ok: true, action: 'adopted', memory, why: `topic "${p.topic}" adopted at ${round3(p.weight)} ≥ κ` };
  }
  return { ok: true, action: 'held', memory: local.map((m) => ({ ...m })), why: `topic "${p.topic}" held: ${round3(p.weight)} < κ — heard, not yet believed` };
}
