/**
 * Demo accounts surfaced in the CEO Demo tab.
 *
 * These are real public companies in the Southwest commercial territory
 * (AZ / NM / UT / CO) chosen because they have visible, public-record
 * unstructured-data growth signals that map cleanly to Qumulo's wedge.
 *
 * Decision-maker names are illustrative search targets; the LinkedIn search
 * link drops the rep onto a real query inside LinkedIn so they can confirm
 * the current incumbent in the seat before reaching out.
 */

export interface DemoStakeholder {
  title: string
  role: 'Economic Buyer' | 'Technical Buyer' | 'Champion' | 'Influencer' | 'End User'
  search: string
  why: string
}

export interface DemoAccount {
  id: string
  rank: number
  company: string
  vertical: string
  state: 'AZ' | 'NM' | 'UT' | 'CO'
  city: string
  revenue_band: string
  employees: string

  /* Storage landscape */
  likely_incumbent: string
  workload_signature: string
  data_scale: string
  cloud_posture: string

  /* The wedge */
  pain_points: string[]
  qumulo_advantage: string
  budget_cycle: string
  proof_points: string

  /* Buying committee */
  stakeholders: DemoStakeholder[]

  /* Approach */
  open_with: string
  discovery_questions: string[]
  competitive_risk: string
  est_acv: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'tgen',
    rank: 1,
    company: 'TGen (Translational Genomics Research Institute)',
    vertical: 'Healthcare & Life Sciences',
    state: 'AZ',
    city: 'Phoenix',
    revenue_band: 'Affiliate of City of Hope; ~$120M operating',
    employees: '~500',

    likely_incumbent: 'Mix of Isilon and direct-attached HPC scratch; partial AWS S3 archive',
    workload_signature: 'Whole-genome sequencing, single-cell, clinical trials; multi-PB and growing 40-60% YoY',
    data_scale: '8-15 PB active, multi-PB growth per year',
    cloud_posture: 'Cloud-curious, partnered with AWS Genomics; constrained by egress and rehydration costs',

    pain_points: [
      'Sequencer output growing faster than Isilon refresh budget',
      'Researchers need NFS/SMB access to the same datasets that AWS HealthOmics needs in S3',
      'Clinical trial collaborators want federated access without copies',
    ],
    qumulo_advantage: 'Cloud-native single namespace running on-prem AND in AWS, with NFS+SMB+S3 on the same dataset. Eliminates the copy-to-S3 step and the egress-on-rehydration tax. NeuralCache delivers flash-class throughput on the active sequencing tier without all-flash hardware cost.',
    budget_cycle: 'Federal grant cycles (NIH/NCI) drive Q3-Q4 capacity asks; Isilon refresh visible in 2026.',
    proof_points: 'Hudson Alpha, Wellcome Sanger, and Memorial Sloan Kettering on Qumulo for genomics. Reference call available.',

    stakeholders: [
      { title: 'Chief Information Officer', role: 'Economic Buyer', search: 'CIO TGen Phoenix', why: 'Owns infrastructure budget envelope.' },
      { title: 'Director of Research Computing', role: 'Technical Buyer', search: 'Director Research Computing TGen', why: 'Owns the Isilon footprint and the HPC scratch tier.' },
      { title: 'VP Bioinformatics', role: 'Champion', search: 'VP Bioinformatics TGen', why: 'Feels the egress and pipeline-stall pain daily.' },
      { title: 'Cloud Architect', role: 'Influencer', search: 'Cloud Architect TGen AWS', why: 'Driving the AWS HealthOmics integration; Qumulo Cloud Native is a direct unlock.' },
    ],
    open_with: 'NIH just expanded the All of Us cohort. Sequencing throughput is about to spike for any institute connected to that program. Every TGen-class lab I talk to is hitting the same wall: the Isilon you bought when WGS cost $5K still works, but the cost-per-PB no longer pencils against grant overhead. We can show what that looks like on Qumulo at the next refresh.',
    discovery_questions: [
      'What does your active sequencing tier look like today, and how fast is it growing?',
      'When does the current Isilon footprint hit refresh, and is the budget locked?',
      'Are researchers asking for AWS HealthOmics or Bedrock access against the same data?',
      'How do you handle collaborator access today, copies or federated?',
    ],
    competitive_risk: 'VAST Data is active in genomics with all-flash positioning. Counter with NeuralCache economics and multi-cloud reach. Pure FlashBlade may be in the conversation through their HPE channel.',
    est_acv: '$450K - $900K initial, with multi-year ramp as sequencing capacity grows.',
  },

  {
    id: 'lanl',
    rank: 2,
    company: 'Triad National Security / Los Alamos National Laboratory',
    vertical: 'Research / National Labs',
    state: 'NM',
    city: 'Los Alamos',
    revenue_band: 'DOE-funded; ~$3.8B annual',
    employees: '~14,000',

    likely_incumbent: 'GPFS / Lustre on the HPC side; NetApp and legacy NAS for collaboration tiers',
    workload_signature: 'Stockpile stewardship simulation, ASC, weather/climate modeling, classified and unclass workloads',
    data_scale: '50+ PB active, exabyte-class long-term retention',
    cloud_posture: 'Mostly on-prem by mandate; selective use of AWS GovCloud and Azure Government',

    pain_points: [
      'Bridging classified and unclassified collaboration tiers without copy-and-sneakernet',
      'Tape-tier rehydration latency for retrospective simulation analysis',
      'Procurement under DOE simplified acquisition pressure to reduce hardware vendor proliferation',
    ],
    qumulo_advantage: 'Software-defined platform that can sit on HPE Apollo or Dell hardware already on the lab\'s approved list. Single namespace bridges NFS/SMB collaboration tiers with object-style scale. Real-time analytics let security ops see exactly which datasets are accessed at file granularity, useful for classified data lineage.',
    budget_cycle: 'DOE FY plans Aug-Sep; ASC roadmap commits in spring. RFI windows opened by NNSA every 12-18 months.',
    proof_points: 'NREL is a Qumulo customer; LLNL has evaluated. GSA schedule available; HPE GreenLake for on-prem OPEX path.',

    stakeholders: [
      { title: 'CIO / Associate Director for IT', role: 'Economic Buyer', search: 'CIO Los Alamos National Laboratory', why: 'Owns enterprise IT budget and approves vendor adds.' },
      { title: 'Division Leader, HPC', role: 'Technical Buyer', search: 'HPC Division Los Alamos', why: 'Owns Lustre and the simulation data lifecycle.' },
      { title: 'Director, Research Library / Data Stewardship', role: 'Champion', search: 'Data Stewardship Los Alamos', why: 'Feels the long-tail retrieval pain.' },
      { title: 'CISO', role: 'Influencer', search: 'CISO Los Alamos National Laboratory', why: 'Will gate any platform touching classified or controlled-unclass.' },
    ],
    open_with: 'NNSA just refreshed the El Capitan companion data tier specs. Every lab I talk to is hitting the same friction: the simulation data is well-served by Lustre, but the analysis tier and the cross-program collaboration tier are stuck on NetApp from a decade ago. Qumulo runs on the HPE hardware already on your approved list.',
    discovery_questions: [
      'Where is the friction between Lustre scratch and the long-term collaboration tier today?',
      'Are there active NNSA or DOE asks to reduce vendor count in the storage portfolio?',
      'Is there appetite to standardize a software-defined layer across HPE and Dell hardware?',
      'How are you handling cross-classification collaboration with academic partners?',
    ],
    competitive_risk: 'IBM Storage Scale (GPFS) is incumbent for HPC. VAST Data is pushing hard into national labs. DDN is also competing. Counter with software-defined portability and HPE GreenLake OPEX path.',
    est_acv: '$1M - $3M+ via HPE GreenLake; could be $5M+ across multiple program offices.',
  },

  {
    id: 'sandia-supplier',
    rank: 3,
    company: 'CACI / SAIC / KBR (defense services in Colorado Springs corridor)',
    vertical: 'Defense & Aerospace Services',
    state: 'CO',
    city: 'Colorado Springs',
    revenue_band: '$1B-$2B per business unit',
    employees: '5,000-15,000 each',

    likely_incumbent: 'Mix of NetApp and Isilon in customer-facing classified enclaves; AWS GovCloud for unclass',
    workload_signature: 'Geospatial analytics, full-motion video exploitation, mission-system data fusion, simulation',
    data_scale: '5-20 PB per major program',
    cloud_posture: 'Pushed by customer (USSF, NORTHCOM, NGA) toward IL5/IL6 cloud; hybrid by necessity',

    pain_points: [
      'Customer programs increasingly require IL5/IL6 cloud-native deployment',
      'FMV and geospatial pipelines stall on legacy NAS at refresh',
      'Cost-plus contracts make every extra dollar of storage scrutinized by DCAA',
    ],
    qumulo_advantage: 'Same software runs in customer datacenter and in AWS GovCloud / Azure Government. Single namespace lets analysts work on the same dataset on-prem or in the cloud. Multi-protocol means FMV exploitation tools (NFS), Windows analyst desktops (SMB), and ML pipelines (S3) all hit the same files.',
    budget_cycle: 'Aligned to program of record award cycles; many program refreshes in FY26-FY27 due to USSF / NGA modernization.',
    proof_points: 'Multiple defense primes use Qumulo for mission data; DISA STIG-compliant deployments documented. GSA schedule via Carahsoft.',

    stakeholders: [
      { title: 'Mission Systems CTO', role: 'Economic Buyer', search: 'Mission Systems CTO Colorado Springs CACI', why: 'Owns program architecture decisions and the bid that includes infrastructure.' },
      { title: 'Director, Cloud & Infrastructure Engineering', role: 'Technical Buyer', search: 'Director Cloud Engineering Colorado Springs SAIC', why: 'Owns hybrid architecture and IL5 readiness.' },
      { title: 'Geospatial Tech Lead', role: 'Champion', search: 'Geospatial engineering lead Colorado Springs defense', why: 'Living with the daily pipeline pain on legacy NAS.' },
      { title: 'Program Capture Manager', role: 'Influencer', search: 'Program capture manager USSF NORTHCOM', why: 'Decides which storage architecture goes into the next bid.' },
    ],
    open_with: 'USSF and NGA are both moving program-of-record requirements toward IL5 cloud-native. The primes I talk to in Colorado Springs are quietly looking for a storage layer that bids the same on-prem and in the cloud, so they don\'t have to architect twice. That\'s exactly what Qumulo does.',
    discovery_questions: [
      'Which programs are going up for recompete in FY26-FY27?',
      'Are customer requirements forcing IL5/IL6 cloud architecture in the next bid?',
      'How are FMV and geospatial pipelines holding up on the current NAS?',
      'Who at the prime owns infrastructure decisions across program lines, not just per-program?',
    ],
    competitive_risk: 'Pure FlashBlade and NetApp ONTAP are entrenched. Hyperscaler-native (FSx, Azure NetApp) is the cloud alternative. Counter with hybrid parity and contract-shoulder pricing.',
    est_acv: '$600K - $1.5M per program; multi-program landed accounts can reach $5M.',
  },

  {
    id: 'micron',
    rank: 4,
    company: 'Micron Technology (Lehi, UT fab)',
    vertical: 'Semiconductor',
    state: 'UT',
    city: 'Lehi',
    revenue_band: '$25B+ corporate; Lehi fab: multi-billion capex',
    employees: '~5,000 at Lehi',

    likely_incumbent: 'NetApp ONTAP at scale for EDA; some Pure FlashBlade in the verification tier',
    workload_signature: 'EDA verification, lithography simulation, defect imaging, fab telemetry',
    data_scale: '30+ PB active per major fab; growing with each node shrink',
    cloud_posture: 'Hybrid, with AWS for EDA burst and on-prem for fab-floor data',

    pain_points: [
      'EDA verification farms hammer NFS metadata; ONTAP cluster sprawl is operationally painful',
      'AWS EDA burst requires data movement that breaks job-level SLAs',
      'Defect-image archives growing faster than the storage budget and slower to retrieve than engineers want',
    ],
    qumulo_advantage: 'Single namespace from the fab floor to AWS, with NeuralCache delivering predictable EDA verification throughput at NetApp-class capacity cost. Real-time per-file analytics let storage ops actually see which jobs are saturating the cluster.',
    budget_cycle: 'Fab capacity buys aligned to node-transition capex; Lehi expansion announced 2024-2025 drives FY26-FY27 buys.',
    proof_points: 'Multiple semiconductor customers on Qumulo for EDA and fab data; NetApp displacement case study.',

    stakeholders: [
      { title: 'VP, Manufacturing IT', role: 'Economic Buyer', search: 'VP Manufacturing IT Micron Lehi', why: 'Owns fab infrastructure budget at site level.' },
      { title: 'Director, EDA Compute & Storage', role: 'Technical Buyer', search: 'Director EDA Compute Micron', why: 'Owns the verification farm and the storage tier under it.' },
      { title: 'Principal Storage Architect', role: 'Champion', search: 'Storage Architect Micron', why: 'Has lived with ONTAP scaling pain.' },
      { title: 'Cloud Architect, EDA', role: 'Influencer', search: 'Cloud Architect EDA Micron AWS', why: 'Owns the AWS burst integration and feels the data-movement tax.' },
    ],
    open_with: 'Every semiconductor customer I talk to is in the same spot: the EDA verification farm scales linearly with node transitions, but the NetApp tier under it scales with cluster sprawl and operator headcount. Qumulo gives you the same NFS semantics with one cluster instead of seven, and the same software runs in AWS for burst.',
    discovery_questions: [
      'How is the EDA verification farm storage architected today, and where does it stall?',
      'Are AWS burst jobs running into data-movement SLAs?',
      'When does the next major capacity buy hit the budget?',
      'Is there appetite to consolidate storage operators across the fab and the EDA tiers?',
    ],
    competitive_risk: 'NetApp is the entrenched incumbent. Pure FlashBlade is competing on the verification tier. WekaIO has semiconductor traction. Counter with NeuralCache economics and the Run Anywhere story.',
    est_acv: '$800K - $2M per fab; multi-fab Micron-wide could be $5M+.',
  },

  {
    id: 'csu',
    rank: 5,
    company: 'Colorado State University (CSU System)',
    vertical: 'Research & Higher Ed',
    state: 'CO',
    city: 'Fort Collins',
    revenue_band: '$1.4B operating',
    employees: '~7,500 faculty/staff',

    likely_incumbent: 'Aging Isilon footprint in central IT; departmental Synology and NetApp pockets',
    workload_signature: 'NSF and NIH research, atmospheric science, vet med imaging, agricultural genomics, infectious disease',
    data_scale: '6-10 PB central, plus departmental sprawl',
    cloud_posture: 'AWS and Azure both used; Internet2 connectivity strong; data-egress sensitive',

    pain_points: [
      'Isilon refresh due in next 18 months; central IT under cost pressure',
      'PI-controlled departmental storage creates audit and reproducibility pain',
      'Funding-agency data-management plans increasingly require multi-site federated access',
    ],
    qumulo_advantage: 'One global namespace consolidates the central tier and pulls in departmental sprawl over time. Software-defined means CSU can ride out hardware refresh independent of the Dell/HPE relationship. Cloud-native option lets PIs move workloads to AWS or Azure without leaving the same filesystem.',
    budget_cycle: 'University capital cycle plans in spring; Isilon refresh window opens FY26.',
    proof_points: 'University of Utah is a Qumulo customer; multiple Carnegie R1 references. Internet2 partnership for Research and Education.',

    stakeholders: [
      { title: 'CIO', role: 'Economic Buyer', search: 'CIO Colorado State University', why: 'Owns central IT budget and Isilon refresh decision.' },
      { title: 'Director, Research Computing & Cyberinfrastructure', role: 'Technical Buyer', search: 'Research Computing Director Colorado State University', why: 'Owns the storage layer under the HPC and research tiers.' },
      { title: 'Associate Vice President, Research', role: 'Champion', search: 'Associate VP Research Colorado State University', why: 'Cares about NSF/NIH data-management compliance and faculty productivity.' },
      { title: 'Senior Storage Engineer', role: 'Influencer', search: 'Storage Engineer Colorado State University', why: 'Day-to-day operator who feels the Isilon admin tax.' },
    ],
    open_with: 'Most R1 universities I talk to in the West are in the same spot: the central Isilon is past its prime, the departments built their own storage on grant money, and the funding agencies now expect data-management plans that span both. Qumulo gives the CIO one platform that consolidates the sprawl over time.',
    discovery_questions: [
      'Where is the Isilon refresh in the capital plan?',
      'How much storage sits in PI-controlled departmental footprints today?',
      'Are NSF or NIH data-management requirements driving central IT involvement?',
      'Who in central IT owns the relationship with the research office?',
    ],
    competitive_risk: 'Dell continues to push Isilon refresh aggressively in higher ed. Pure FlashBlade is competing. Internet2 ecosystem includes alternatives. Counter with software-defined freedom and University of Utah reference.',
    est_acv: '$300K - $700K initial central IT; multi-departmental rollup over 2-3 years could double that.',
  },
]
