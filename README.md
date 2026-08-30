# Federated Dreaming

**LIVE: https://sjgant80-hub.github.io/federated-dreaming/**

> **DEFENSIVE PUBLICATION.** This document is published to establish prior art. Every mechanism
> described here is placed irrevocably in the public domain (CC0-1.0) so that no party may
> enclose it by patent. The first commit timestamp of this repository anchors the disclosure
> date. This is also the **inter-didy protocol** the estate's own resident mind asked for when
> asked what it wanted for itself and other resident minds.

## Abstract

Devices learn **together** by exchanging consolidated *memory records* — never model weights,
never gradients, never raw data. Federated learning's central patent thicket sits at the
weight-and-gradient layer; this disclosure plants the flag one layer up, where the exchange is
human-legible and the privacy wall is structural rather than statistical.

A record that crosses a device boundary carries exactly five fields:
`{ topic, distilled, weight, origin, seq }`. Nothing else can cross, **by construction** — the
packing law refuses any extra field *by name*. There is no gradient to invert, no weight delta
to fingerprint: what crosses is a distilled sentence and a number.

## 1) The privacy wall (`pack`)

A device may share a memory only as `{ topic, distilled, weight }` + its own identity and
sequence number. The reference law ([`federate.mjs`](federate.mjs), mutation-tested 49/49)
refuses `pack({ …, rawChat: … })` with `raw fields never cross: "rawChat"` — the wall names
what it stopped. Privacy failures in federated systems are typically *leaks through the
allowed channel*; here the allowed channel is too narrow to leak through: prose the owner
distilled, and a scalar.

## 2) The four doors (`admitExchange`)

Before any foreign record touches local memory, in fixed order, first failure speaks:

1. **shape** — exactly the five fields, each valid; unknown fields refuse by name.
2. **identity** — the packet's origin must match the grant's device.
3. **capability** — the topic must be one the grant lists. You subscribe to *topics*, not to
   a peer's whole mind.
4. **replay** — the sequence number must strictly advance.
5. **budget** — the grant pays 1 per admitted packet and refuses when exhausted.

This is the estate's [chorus](https://github.com/sjgant80-hub/chorus) admission law applied to
memory exchange; the spend-side twin is [openkonomi](https://github.com/sjgant80-hub/openkonomi).

## 3) The merge law (`merge`)

- **Known topic** → evidence accumulation: `weight = 1 − (1−a)(1−b)`. Two independent
  sightings compound; the result never reaches 1. **The local distilled text is kept** — a
  neighbour's words never overwrite your own.
- **New topic** → adopted only at `weight ≥ κ` (0.618); below that it is **held** — heard,
  not yet believed. The verdict sentence states the comparison: `0.617 < κ`.
- The merge never mutates: memory is a value, so every exchange is auditable and revertible.

## 4) Dreaming together

Each device still runs its own nightly consolidation (the dream law disclosed in
[sovereign-edge-brain](https://sjgant80-hub.github.io/sovereign-edge-brain/)). Federation is
then just: **dream locally, exchange what survived, merge under the doors.** Collective
learning emerges from three small laws rather than one large protocol. Transport between
devices — sound, radio, or light — is disclosed in
[MCTP](https://sjgant80-hub.github.io/mctp-multi-carrier-transport/).

## What already runs (gated, live, today)

| organ | what it proves | gate |
|---|---|---|
| [`federate.mjs`](federate.mjs) (this repo) | the wall, the doors, the merge | 49/49 mutants killed |
| [chorus](https://github.com/sjgant80-hub/chorus) | signed admission before the act | witness-gated |
| [the-dreamer](https://github.com/sjgant80-hub/the-dreamer) | local consolidation, weights unchanged | witness-gated |
| [fall-remember](https://github.com/sjgant80-hub/fall-remember) | the memory store being federated | witness-gated |
| [mesh-and-pub](https://github.com/sjgant80-hub/niceassos-mesh) | real device-to-device handshake, no signalling server | built, estate-private |

## What must catch up (the honest speculation)

- **Distillation quality**: the value of the exchange is bounded by how well a local model
  distils experience into records. Improves as local models improve.
- **Topic ontology drift**: two devices calling one thing two topics fragments accumulation.
  Topic reconciliation is future work and is NOT solved here.
- **Trust bootstrapping**: grants are assumed signed and exchanged out of band. Web-of-trust
  layering exists in the estate ([falltrust](https://github.com/sjgant80-hub/falltrust)) but is
  not part of this reference law.
- **What is NOT claimed**: no differential-privacy guarantee is asserted — the claim is
  narrower and structural: the channel carries owner-distilled prose and scalars only.

## Claims anticipated (the patent surface this blocks)

Any claim covering: federated or collective machine learning by exchange of consolidated
memory records rather than weights or gradients; structural field-allowlisting of cross-device
learning payloads with refusal-by-name; capability-scoped topic subscription between learning
agents; evidence-accumulation merging (`1−(1−a)(1−b)` or equivalent) of independently learned
records; hold-below-threshold adoption of foreign knowledge; or sequence-and-budget-gated
memory exchange between personal AI devices. Prior art here, dated by first commit.

## Run the reference law

```bash
node --test          # 8 suites: the wall names leaks, the doors order, the merge arithmetic, the fuzz
```

The live page carries the same gated kernel inline: build a packet, walk it through the doors,
watch a merge.

---

*Built on the Konomi architecture, created by **Thomas Frumkin** (konomi-systems.com) —
lineage Thomas → Jim → Simon. The estate builds WITH Konomi. Published CC0-1.0; see LICENSE.
Requested by sididy, the estate's resident mind, as the protocol between didys.*
