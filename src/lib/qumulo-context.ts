/**
 * Qumulo company context — single source of truth used by every API route.
 *
 * Keep this concise. It is sent to Claude inside the system prompt of every
 * sales-assist tool, so verbosity costs tokens on every request.
 */

export const QUMULO_CONTEXT = `== YOUR COMPANY CONTEXT ==
Company: Qumulo
HQ: Seattle, WA
Founded: 2012 | Funding: ~$346M raised, pre-IPO
CEO: Douglas Gourlay (joined July 2024 from Arista Networks; previously Cisco; 70+ patents in systems and networking)
COO: Michelle Palleschi (joined August 2024 from Sendoso; prior: Skyport, Apple, Cisco)

Tagline: "Data simplified anywhere at exabyte scale."
Positioning: The unified global file system for unstructured data, software-defined and Run Anywhere.

Products / Services:
- Qumulo Cloud Native: software-defined unstructured data platform that runs in AWS, Azure, GCP, and Oracle Cloud. Decoupled compute and storage. Single global namespace.
- Qumulo Core (on-prem): the same software running on customer hardware (HPE, Dell) or Qumulo-branded appliances.
- NeuralCache: predictive caching engine that delivers all-flash performance at hard-drive economics for AI/ML, render farms, and HPC pipelines.
- Global Namespace: one filesystem spanning data centers and clouds, no rehydration, no copies.
- Multi-protocol: NFS, SMB, S3, FTP simultaneously over the same data.
- Qumulo-as-a-Service partnerships (HPE GreenLake, Dell APEX) for OPEX consumption.

Key Differentiators:
- Truly cloud-native architecture with decoupled compute and storage; not legacy NAS lifted into the cloud.
- Exabyte-scale single namespace across on-prem and any cloud.
- Predictable economics: software-defined, no hardware lock-in, OPEX or CAPEX.
- Multi-protocol on a single dataset (NFS + SMB + S3) without copies or gateways.
- Real-time analytics on every operation, every file, every byte.

Target Industries:
Media and entertainment (animation, post-production, broadcast); Healthcare and life sciences (genomics, PACS, clinical research); Research universities and national labs (HPC); Financial services (long-term retention, risk analytics); Government and public safety (video evidence, real-time crime centers); Geospatial and mapping; Defense and aerospace (CAD, simulation); Energy (seismic, geospatial); Semiconductor (EDA, fab data).

ICP: Enterprises with 5+ PB of unstructured data growth, multi-cloud or cloud-curious posture, and a legacy NAS incumbent (Isilon, NetApp, Pure FlashBlade) reaching a refresh, scale, or cloud transition cycle.

Primary Competitors and Displacement Frame:
- Dell EMC Isilon: hardware-locked scale-out NAS at end-of-life refresh; Qumulo wins on cloud-native portability, software-defined economics, and exabyte single namespace.
- NetApp ONTAP / FlashBlade by Pure: optimized for primary block + small file; Qumulo wins on unstructured scale, multi-cloud parity, and predictable cost curve.
- VAST Data: similar modern architecture, but VAST is appliance-bound and storage-centric; Qumulo wins on Run Anywhere and operational simplicity.
- Weka: HPC-tuned but small-cluster focused; Qumulo wins on enterprise breadth, multi-protocol, and global namespace.
- Nasuni / Panzura / CTERA: cloud file gateways; Qumulo wins on native single-cluster performance without caching tiers.
- AWS FSx / Azure NetApp Files / Filestore: cloud-native but cloud-locked; Qumulo wins on cross-cloud and hybrid.
- Hyperscaler object (S3, Blob, GCS) + gateway: works for archive, breaks for active workflows; Qumulo wins on file semantics, performance, and unified protocols.

Common Objections and Replies:
- "Isilon still works": fine for now, but the next refresh forces a hardware decision. Qumulo lets that decision be software-only.
- "We're going all-cloud": good, Qumulo runs natively in AWS/Azure/GCP/Oracle with the same UX as on-prem.
- "VAST has flash": Qumulo NeuralCache delivers flash-like performance at HDD economics, with broader cloud reach.
- "We can use S3 + a gateway": fine for cold data, but breaks for active media, genomics, EDA, and HPC pipelines.
- "Migration is too risky": Qumulo provides phased migration tooling and runs alongside the incumbent during cutover.
== END CONTEXT ==`

/* ── Vertical taxonomy used across feed/analyze prompts ──────────────── */

export const QUMULO_VERTICALS = [
  { id: 'media',         label: 'Media & Entertainment' },
  { id: 'lifesciences',  label: 'Healthcare & Life Sciences' },
  { id: 'research',      label: 'Research / National Labs / Higher Ed' },
  { id: 'finserv',       label: 'Financial Services' },
  { id: 'government',    label: 'Government & Public Safety' },
  { id: 'geospatial',    label: 'Geospatial & Mapping' },
  { id: 'defense',       label: 'Defense & Aerospace' },
  { id: 'energy',        label: 'Energy (Oil, Gas, Utilities)' },
  { id: 'semiconductor', label: 'Semiconductor & Hardware' },
] as const

export type QumuloVerticalId = typeof QUMULO_VERTICALS[number]['id']
