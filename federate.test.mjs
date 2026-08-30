// federate.test.mjs — the exchange law, falsifiable. The load-bearing properties: the privacy
// wall refuses BY NAME, the four doors run in fixed order BEFORE the merge, evidence accumulates
// by 1−(1−a)(1−b) exactly, and local words are never overwritten by a neighbour's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KAPPA, ALLOWED, pack, admitExchange, merge } from './federate.mjs';

const GRANT = { device: 'phone-a', topics: ['cooking', 'birds'], budget: 3 };
const packetOf = (over = {}) => ({ topic: 'cooking', distilled: 'salt early', weight: 0.7, origin: 'phone-a', seq: 5, ...over });

test('PACK — only topic/distilled/weight leave; any other field refuses BY NAME', () => {
  const p = pack({ topic: 'cooking', distilled: 'salt early', weight: 0.7 }, 'phone-a', 1);
  assert.deepEqual(p.packet, { topic: 'cooking', distilled: 'salt early', weight: 0.7, origin: 'phone-a', seq: 1 });
  const leak = pack({ topic: 'cooking', distilled: 'salt early', weight: 0.7, rawChat: 'private text' }, 'phone-a', 1);
  assert.match(leak.why, /raw fields never cross: "rawChat"/, 'the wall names what it stopped');
  assert.match(pack({ topic: 'c', weight: 0.7 }, 'a', 1).why, /distilled summary required/);
  assert.match(pack({ topic: '', distilled: 'x', weight: 0.7 }, 'a', 1).why, /topic required/);
  assert.match(pack({ topic: 'c', distilled: 'x', weight: 7 }, 'a', 1).why, /\[0,1\]/);
  assert.match(pack({ topic: 'c', distilled: 'x', weight: 0.7 }, '', 1).why, /origin device id/);
  assert.match(pack({ topic: 'c', distilled: 'x', weight: 0.7 }, 'a', 0).why, /positive integer/);
  assert.match(pack(null, 'a', 1).why, /must be an object/);
  assert.match(pack(7, 'a', 1).why, /must be an object/, 'a primitive refuses as itself, not via a field check');
  assert.match(pack([], 'a', 1).why, /must be an object/, 'an array refuses as itself, not via a field check');
  assert.equal(pack({ topic: 'c', distilled: 'x', weight: 0.1239 }, 'a', 1).packet.weight, 0.124, '3dp');
  assert.equal(pack({ topic: 'c', distilled: 'x', weight: 0 }, 'a', 1).packet.weight, 0, 'weight exactly 0 is a valid (weightless) record');
});

test('ADMIT — a clean packet passes all four doors at cost 1', () => {
  assert.deepEqual(admitExchange(packetOf(), GRANT, 4), { ok: true, cost: 1 });
});

test('ADMIT — shape: exactly the five allowed fields, no more, no fewer', () => {
  assert.deepEqual(ALLOWED, ['topic', 'distilled', 'weight', 'origin', 'seq']);
  assert.match(admitExchange(packetOf({ extra: 1 }), GRANT, 4).why, /unknown field crosses the wall: "extra"/);
  const missing = packetOf(); delete missing.distilled;
  assert.match(admitExchange(missing, GRANT, 4).why, /missing field "distilled"/);
  assert.match(admitExchange(null, GRANT, 4).why, /shape: packet/);
  assert.match(admitExchange(packetOf({ weight: 'high' }), GRANT, 4).why, /shape: weight/);
  assert.match(admitExchange(packetOf({ seq: 1.5 }), GRANT, 4).why, /shape: seq/);
  assert.match(admitExchange(packetOf(), { device: 'phone-a' }, 4).why, /grant must be/);
  assert.match(admitExchange(packetOf(), GRANT, -1).why, /lastSeq/);
  // each string clause failing ALONE refuses — a guard that needs two failures is theatre
  assert.match(admitExchange(packetOf({ topic: '' }), GRANT, 4).why, /shape: topic, distilled and origin/);
  assert.match(admitExchange(packetOf({ distilled: '' }), GRANT, 4).why, /shape: topic, distilled and origin/);
  assert.match(admitExchange(packetOf({ origin: '' }), GRANT, 4).why, /shape: topic, distilled and origin/);
  // each grant clause failing ALONE refuses
  assert.match(admitExchange(packetOf(), { device: '', topics: ['cooking'], budget: 3 }, 4).why, /grant must be/);
  assert.match(admitExchange(packetOf(), { device: 'phone-a', topics: 'cooking', budget: 3 }, 4).why, /grant must be/);
  assert.match(admitExchange(packetOf(), { device: 'phone-a', topics: ['cooking'], budget: 'lots' }, 4).why, /grant must be/);
});

test('ADMIT — the doors run in order: identity → capability → replay → budget', () => {
  // wrong identity AND no budget → identity speaks (it is checked first)
  const broke = { device: 'phone-b', topics: [], budget: 0 };
  assert.match(admitExchange(packetOf(), broke, 99).why, /^identity:/, 'first door speaks, later doors never run');
  // right identity, wrong topic AND replay AND no budget → capability speaks
  const g2 = { device: 'phone-a', topics: ['other'], budget: 0 };
  assert.match(admitExchange(packetOf(), g2, 99).why, /^capability: topic "cooking"/);
  // right identity+topic, stale seq AND no budget → replay speaks
  const g3 = { device: 'phone-a', topics: ['cooking'], budget: 0 };
  assert.match(admitExchange(packetOf({ seq: 5 }), g3, 5).why, /^replay: seq 5 is not after 5/, 'seq equal to lastSeq is a replay');
  // everything right but the purse → budget speaks
  assert.match(admitExchange(packetOf({ seq: 6 }), g3, 5).why, /^budget: exhausted/);
  // and the boundary: seq = lastSeq+1 is admitted, budget exactly 1 pays
  assert.equal(admitExchange(packetOf({ seq: 6 }), { ...g3, budget: 1 }, 5).ok, true);
});

test('MERGE — a known topic reinforces by evidence accumulation, and local words win', () => {
  const local = [{ topic: 'cooking', distilled: 'my own words', weight: 0.5 }];
  const r = merge(local, packetOf({ weight: 0.5 }));
  assert.equal(r.action, 'reinforced');
  assert.equal(r.memory[0].weight, 0.75, '1−(1−0.5)(1−0.5) = 0.75, exactly');
  assert.equal(r.memory[0].distilled, 'my own words', 'a neighbour never overwrites your words');
  assert.equal(local[0].weight, 0.5, 'never mutates');
  const r2 = merge([{ topic: 'cooking', distilled: 'w', weight: 0.9 }], packetOf({ weight: 0.9 }));
  assert.equal(r2.memory[0].weight, 0.99, 'compounds toward 1, never reaches it');
});

test('MERGE — a new topic is adopted at κ, held below it; κ boundary exact', () => {
  const at = merge([], packetOf({ topic: 'birds', weight: 0.618 }));
  assert.equal(at.action, 'adopted');
  assert.deepEqual(at.memory, [{ topic: 'birds', distilled: 'salt early', weight: 0.618 }]);
  const under = merge([], packetOf({ topic: 'birds', weight: 0.617 }));
  assert.equal(under.action, 'held');
  assert.deepEqual(under.memory, [], 'held means memory unchanged');
  assert.match(under.why, /0\.617 < κ — heard, not yet believed/, 'the verdict sentence states the exact comparison');
  assert.equal(KAPPA, 0.618);
});

test('MERGE — refusals and totality', () => {
  assert.match(merge('x', packetOf()).why, /must be a list/);
  assert.match(merge([], null).why, /admit it first/);
  assert.match(merge([], packetOf(), 0).why, /kappa/);
  assert.match(merge([], packetOf(), 1).why, /kappa/, 'κ=1 would make adoption impossible — the parameter refuses, not the packet');
  assert.match(merge([{ topic: 'c' }], packetOf()).why, /malformed/);
  // each packet clause failing ALONE refuses
  assert.match(merge([], { topic: '', distilled: 'd', weight: 0.5 }).why, /admit it first/);
  assert.match(merge([], { topic: 't', distilled: '', weight: 0.5 }).why, /admit it first/);
  assert.match(merge([], { topic: 't', distilled: 'd', weight: 2 }).why, /admit it first/);
  // each local-record clause failing ALONE refuses
  assert.match(merge([{ topic: '', weight: 0.5, distilled: 'd' }], packetOf()).why, /malformed/);
  assert.match(merge([{ topic: 't', weight: 2, distilled: 'd' }], packetOf()).why, /malformed/);
  assert.match(merge([{ topic: 't', weight: 0.5, distilled: '' }], packetOf()).why, /malformed/);
  for (const junk of [null, 7, [], { topic: 1 }, { topic: 'a', distilled: 'b', weight: 'x' }]) {
    assert.equal(typeof merge([], junk).ok, 'boolean', 'answers, never throws');
    assert.equal(typeof admitExchange(junk, GRANT, 0).ok, 'boolean');
    assert.equal(typeof pack(junk, 'a', 1).ok, 'boolean');
  }
});

test('THE FUZZ — 300 random exchanges: admitted packets always merge to a valid memory', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let memory = [];
  let lastSeq = 0;
  for (let t = 0; t < 300; t++) {
    const w = Math.round(rnd() * 1000) / 1000;
    const topic = 't' + Math.floor(rnd() * 6);
    const p = pack({ topic, distilled: 'd' + t, weight: w }, 'phone-a', t + 1);
    assert.ok(p.ok);
    const g = { device: 'phone-a', topics: ['t0', 't1', 't2', 't3', 't4', 't5'], budget: 1 };
    const a = admitExchange(p.packet, g, lastSeq);
    assert.ok(a.ok, 'a well-formed advancing packet always admits');
    lastSeq = p.packet.seq;
    const m = merge(memory, p.packet);
    assert.ok(m.ok);
    memory = m.memory;
    for (const rec of memory) assert.ok(rec.weight > 0 && rec.weight <= 1, 'weights stay in (0,1]');
  }
  const topics = memory.map((m) => m.topic);
  assert.equal(new Set(topics).size, topics.length, 'one record per topic, always');
});
