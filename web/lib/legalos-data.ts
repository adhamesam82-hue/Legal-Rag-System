// -----------------------------------------------------------------------------
// LegalOS mock data — Clients, Matters, Cases pillar.
//
// No backend exists yet for practice management (see PRODUCT.md). Everything
// here is plausible sample content for the UI-concept pass, cross-linked so
// client -> matter -> case navigation is coherent. Do not treat as real firm
// data.
// -----------------------------------------------------------------------------

export type Role = "Owner" | "Lawyer" | "Staff";

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  title: string;
}

export const TEAM: TeamMember[] = [
  { id: "ahmed-al-sayed", name: "Ahmed Al-Sayed", role: "Owner", title: "Managing Partner" },
  { id: "mona-farouk", name: "Mona Farouk", role: "Lawyer", title: "Senior Associate" },
  { id: "youssef-adel", name: "Youssef Adel", role: "Lawyer", title: "Associate" },
  { id: "layla-hassan", name: "Layla Hassan", role: "Staff", title: "Paralegal" },
];

export const CURRENT_USER_ID = "ahmed-al-sayed";

export function teamMember(id: string): TeamMember {
  return TEAM.find((t) => t.id === id) ?? TEAM[0];
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface ClientContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

export interface Client {
  id: string;
  name: string;
  type: "Company" | "Individual";
  industry: string;
  status: "Active" | "Inactive";
  since: string;
  registrationNumber?: string;
  taxId?: string;
  address: string;
  phone: string;
  email: string;
  contacts: ClientContact[];
  notes?: string;
}

export const CLIENTS: Client[] = [
  {
    id: "nile-trading",
    name: "Nile Trading Co.",
    type: "Company",
    industry: "Import & Export Trading",
    status: "Active",
    since: "2022-03-14",
    registrationNumber: "CR-88213-Cairo",
    taxId: "300-215-664",
    address: "12 Corniche El Nil, Maadi, Cairo",
    phone: "+20 2 2519 4432",
    email: "legal@niletradingco.com",
    contacts: [
      {
        id: "karim-fahmy",
        name: "Karim Fahmy",
        title: "General Counsel",
        email: "k.fahmy@niletradingco.com",
        phone: "+20 100 555 2010",
        isPrimary: true,
      },
      {
        id: "rania-samy",
        name: "Rania Samy",
        title: "CFO",
        email: "r.samy@niletradingco.com",
        phone: "+20 100 555 2044",
      },
    ],
    notes: "Long-standing client. Prefers all filings copied to General Counsel directly.",
  },
  {
    id: "delta-foods",
    name: "Delta Foods",
    type: "Company",
    industry: "Food Manufacturing & Distribution",
    status: "Active",
    since: "2023-06-02",
    registrationNumber: "CR-51092-Giza",
    taxId: "301-884-119",
    address: "Industrial Zone A, 6th of October City, Giza",
    phone: "+20 2 3821 7765",
    email: "contact@deltafoods.eg",
    contacts: [
      {
        id: "tamer-gaber",
        name: "Tamer Gaber",
        title: "HR Director",
        email: "t.gaber@deltafoods.eg",
        phone: "+20 101 442 8830",
        isPrimary: true,
      },
      {
        id: "nourhan-ezzat",
        name: "Nourhan Ezzat",
        title: "Operations Manager",
        email: "n.ezzat@deltafoods.eg",
        phone: "+20 101 442 8871",
      },
    ],
    notes: "Two concurrent matters: routine contract review and an active labour dispute.",
  },
  {
    id: "khalil-holdings",
    name: "Khalil Holdings",
    type: "Company",
    industry: "Diversified Holding Group",
    status: "Active",
    since: "2021-11-20",
    registrationNumber: "CR-40217-Cairo",
    taxId: "299-733-502",
    address: "Nile City Towers, Ramlet Boulaq, Cairo",
    phone: "+20 2 2461 9900",
    email: "counsel@khalilholdings.com",
    contacts: [
      {
        id: "hossam-khalil",
        name: "Hossam Khalil",
        title: "Chairman",
        email: "h.khalil@khalilholdings.com",
        phone: "+20 100 111 7620",
        isPrimary: true,
      },
    ],
  },
  {
    id: "al-amal-trading",
    name: "Al Amal Trading",
    type: "Company",
    industry: "Retail & Wholesale Trading",
    status: "Active",
    since: "2024-01-09",
    registrationNumber: "CR-77410-Cairo",
    taxId: "302-556-284",
    address: "18 El Merghany St, Heliopolis, Cairo",
    phone: "+20 2 2418 3350",
    email: "info@alamaltrading.eg",
    contacts: [
      {
        id: "sherif-nabil",
        name: "Sherif Nabil",
        title: "Owner",
        email: "sherif@alamaltrading.eg",
        phone: "+20 122 340 5511",
        isPrimary: true,
      },
    ],
  },
  {
    id: "el-sayed-estate",
    name: "El-Sayed Estate",
    type: "Individual",
    industry: "Private Estate",
    status: "Active",
    since: "2025-09-01",
    address: "9 Gameat El Dowal El Arabeya St, Mohandessin, Giza",
    phone: "+20 100 222 8890",
    email: "farida.elsayed@gmail.com",
    contacts: [
      {
        id: "farida-el-sayed",
        name: "Farida El-Sayed",
        title: "Executor",
        email: "farida.elsayed@gmail.com",
        phone: "+20 100 222 8890",
        isPrimary: true,
      },
    ],
    notes: "Sensitive family matter — coordinate all outreach through Farida El-Sayed only.",
  },
  {
    id: "zahran-construction",
    name: "Zahran Construction Group",
    type: "Company",
    industry: "Construction & Real Estate Development",
    status: "Active",
    since: "2023-02-27",
    registrationNumber: "CR-63305-Cairo",
    taxId: "300-990-441",
    address: "New Cairo Business Park, Building 4, Cairo",
    phone: "+20 2 2758 6120",
    email: "legal@zahrancg.com",
    contacts: [
      {
        id: "omar-zahran",
        name: "Omar Zahran",
        title: "Managing Director",
        email: "o.zahran@zahrancg.com",
        phone: "+20 122 987 1145",
        isPrimary: true,
      },
    ],
  },
  {
    id: "samir-nassar",
    name: "Samir Nassar",
    type: "Individual",
    industry: "Independent Consultant",
    status: "Inactive",
    since: "2024-05-18",
    address: "22 Syria St, Mohandessin, Giza",
    phone: "+20 122 604 7731",
    email: "samir.nassar@outlook.com",
    contacts: [
      {
        id: "samir-nassar-contact",
        name: "Samir Nassar",
        title: "Self",
        email: "samir.nassar@outlook.com",
        phone: "+20 122 604 7731",
        isPrimary: true,
      },
    ],
  },
];

export function clientById(id: string): Client | undefined {
  return CLIENTS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Matters
// ---------------------------------------------------------------------------

export type MatterType =
  | "Litigation"
  | "Corporate"
  | "Tax"
  | "Labour"
  | "Family / Probate"
  | "Contract Review";

export type MatterStatus = "Active" | "On Hold" | "Closed";

export interface Matter {
  id: string;
  name: string;
  clientId: string;
  type: MatterType;
  status: MatterStatus;
  responsibleLawyerId: string;
  supportingStaffIds?: string[];
  openedDate: string;
  closedDate?: string;
  description: string;
  billingType: "Hourly" | "Fixed Fee" | "Retainer";
  budget?: string;
  nextDeadline?: { label: string; date: string };
  caseId?: string;
  tags: string[];
}

export const MATTERS: Matter[] = [
  {
    id: "nabil-v-nile-trading",
    name: "Nabil v. Nile Trading Co.",
    clientId: "nile-trading",
    type: "Litigation",
    status: "Active",
    responsibleLawyerId: "mona-farouk",
    supportingStaffIds: ["layla-hassan"],
    openedDate: "2025-11-03",
    description:
      "Commercial dispute over an alleged breach of a distribution agreement. Nile Trading Co. is the defendant; the claimant, Ahmed Nabil, seeks EGP 2.4M in damages plus contract termination. Currently in the evidence phase before the Cairo Economic Court.",
    billingType: "Hourly",
    budget: "EGP 180,000 (est.)",
    nextDeadline: { label: "File appeal brief", date: "2026-08-02" },
    caseId: "nabil-v-nile-trading",
    tags: ["Commercial", "Breach of Contract", "Economic Court"],
  },
  {
    id: "delta-foods-nda-review",
    name: "NDA Review — Delta Foods",
    clientId: "delta-foods",
    type: "Contract Review",
    status: "Closed",
    responsibleLawyerId: "youssef-adel",
    openedDate: "2026-06-10",
    closedDate: "2026-06-24",
    description:
      "Review of a mutual non-disclosure agreement with a prospective co-packing partner. AI-assisted clause review flagged two deviations from the firm's standard NDA template (liability cap, jurisdiction clause); both were resolved with the counterparty before signature.",
    billingType: "Fixed Fee",
    budget: "EGP 12,000",
    tags: ["NDA", "Commercial Contracts"],
  },
  {
    id: "delta-foods-labour-dispute",
    name: "Delta Foods Labour Dispute",
    clientId: "delta-foods",
    type: "Litigation",
    status: "Active",
    responsibleLawyerId: "youssef-adel",
    supportingStaffIds: ["layla-hassan"],
    openedDate: "2026-04-18",
    description:
      "Collective claim brought by seven former production-line employees alleging wrongful termination during a facility downsizing. Delta Foods maintains the terminations followed Labour Law No. 14 of 2025 severance procedures. Pending ruling before the Cairo Labour Court.",
    billingType: "Hourly",
    budget: "EGP 95,000 (est.)",
    nextDeadline: { label: "Respond to discovery request", date: "2026-08-04" },
    caseId: "delta-foods-labour-dispute",
    tags: ["Labour", "Wrongful Termination", "Labour Court"],
  },
  {
    id: "khalil-tax-objection",
    name: "Tax Objection — Khalil Holdings",
    clientId: "khalil-holdings",
    type: "Tax",
    status: "Active",
    responsibleLawyerId: "ahmed-al-sayed",
    openedDate: "2026-05-22",
    description:
      "Formal objection to a 2025 tax-year reassessment issued by the Egyptian Tax Authority against Khalil Holdings' consolidated group return, disputing a EGP 3.1M adjustment to intercompany transfer pricing.",
    billingType: "Hourly",
    budget: "EGP 60,000 (est.)",
    nextDeadline: { label: "Submit tax objection", date: "2026-08-14" },
    tags: ["Tax", "Transfer Pricing"],
  },
  {
    id: "al-amal-commercial-registration",
    name: "Commercial Registration — Al Amal Trading",
    clientId: "al-amal-trading",
    type: "Corporate",
    status: "Active",
    responsibleLawyerId: "ahmed-al-sayed",
    supportingStaffIds: ["layla-hassan"],
    openedDate: "2026-06-30",
    description:
      "Renewal of Al Amal Trading's commercial registration and update of its trade license activities to include e-commerce distribution, ahead of a new online storefront launch.",
    billingType: "Fixed Fee",
    budget: "EGP 8,500",
    nextDeadline: { label: "Renew commercial registration", date: "2026-08-09" },
    tags: ["Corporate", "Licensing"],
  },
  {
    id: "el-sayed-estate-partition",
    name: "El-Sayed Estate Partition",
    clientId: "el-sayed-estate",
    type: "Family / Probate",
    status: "Active",
    responsibleLawyerId: "ahmed-al-sayed",
    openedDate: "2025-09-15",
    description:
      "Partition of the late Mahmoud El-Sayed's estate among four heirs, including a residential property in Mohandessin and a minority stake in a family trading business. Currently in court-supervised mediation before the Giza Family Court.",
    billingType: "Retainer",
    budget: "EGP 45,000",
    nextDeadline: { label: "Mediation session", date: "2026-08-05" },
    caseId: "el-sayed-estate-partition",
    tags: ["Family", "Probate", "Estate Partition"],
  },
  {
    id: "zahran-contract-dispute",
    name: "Contract Dispute — Zahran Construction",
    clientId: "zahran-construction",
    type: "Litigation",
    status: "On Hold",
    responsibleLawyerId: "mona-farouk",
    openedDate: "2025-08-11",
    description:
      "Dispute with a cement supplier over delayed deliveries on a New Cairo residential project. Proceedings paused pending direct settlement negotiations between the parties.",
    billingType: "Hourly",
    budget: "EGP 70,000 (est.)",
    caseId: "zahran-contract-dispute",
    tags: ["Commercial", "Construction", "Supplier Dispute"],
  },
  {
    id: "samir-nassar-consulting-agreement",
    name: "Consulting Agreement Review — Samir Nassar",
    clientId: "samir-nassar",
    type: "Contract Review",
    status: "Closed",
    responsibleLawyerId: "youssef-adel",
    openedDate: "2025-05-02",
    closedDate: "2025-05-14",
    description:
      "Review of an independent consulting agreement with a multinational client, focused on IP assignment and non-compete scope.",
    billingType: "Fixed Fee",
    budget: "EGP 6,000",
    tags: ["Contract Review", "Consulting"],
  },
];

export function matterById(id: string): Matter | undefined {
  return MATTERS.find((m) => m.id === id);
}

export function mattersForClient(clientId: string): Matter[] {
  return MATTERS.filter((m) => m.clientId === clientId);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface CaseTimelineEvent {
  date: string;
  label: string;
  detail?: string;
}

export interface CaseDeadline {
  label: string;
  date: string;
}

export interface CaseEvidence {
  name: string;
  type: string;
  submittedBy: "Us" | "Opposing party" | "Court";
  date: string;
}

export interface CourtDocument {
  name: string;
  type: string;
  date: string;
}

export interface CaseRecord {
  id: string;
  matterId: string;
  court: string;
  judge: string;
  caseNumber: string;
  status: string;
  opposingParty: string;
  opposingCounsel?: string;
  filedDate: string;
  nextHearing?: { date: string; time: string; purpose: string };
  timeline: CaseTimelineEvent[];
  deadlines: CaseDeadline[];
  evidence: CaseEvidence[];
  courtDocuments: CourtDocument[];
  aiSummary: string;
}

export const CASES: CaseRecord[] = [
  {
    id: "nabil-v-nile-trading",
    matterId: "nabil-v-nile-trading",
    court: "Cairo Economic Court",
    judge: "Counselor Hesham Fathy",
    caseNumber: "CEC-2026-1345",
    status: "Active — Evidence Phase",
    opposingParty: "Ahmed Nabil (individual, plaintiff)",
    opposingCounsel: "Adv. Samia Reda, Reda & Co.",
    filedDate: "2025-11-03",
    nextHearing: { date: "2026-08-10", time: "10:00 AM", purpose: "Evidence submission review" },
    timeline: [
      { date: "2025-11-03", label: "Claim filed", detail: "Plaintiff filed breach-of-contract claim seeking EGP 2.4M." },
      { date: "2025-12-01", label: "First hearing", detail: "Court set the evidence-exchange schedule." },
      { date: "2026-02-18", label: "Defense memorandum submitted", detail: "Filed response denying breach and disputing damages calculation." },
      { date: "2026-05-06", label: "Expert appointed", detail: "Court appointed an accounting expert to assess claimed damages." },
      { date: "2026-07-14", label: "Expert report received", detail: "Expert report found claimed damages overstated by roughly 40%." },
    ],
    deadlines: [
      { label: "File appeal brief", date: "2026-08-02" },
      { label: "Submit rebuttal to expert report", date: "2026-08-08" },
    ],
    evidence: [
      { name: "Distribution Agreement (original, signed)", type: "Contract", submittedBy: "Us", date: "2025-11-20" },
      { name: "Delivery logs — Q3 2025", type: "Business Records", submittedBy: "Us", date: "2025-12-15" },
      { name: "Email correspondence re: delivery delays", type: "Correspondence", submittedBy: "Opposing party", date: "2026-01-10" },
      { name: "Court-appointed expert accounting report", type: "Expert Report", submittedBy: "Court", date: "2026-07-14" },
    ],
    courtDocuments: [
      { name: "Statement of Claim", type: "Filing", date: "2025-11-03" },
      { name: "Defense Memorandum", type: "Filing", date: "2026-02-18" },
      { name: "Expert Report", type: "Court Order", date: "2026-07-14" },
    ],
    aiSummary:
      "The court-appointed expert's report (filed 2026-07-14) is the strongest development in our favor: it found the claimant's damages calculation overstated by roughly 40%, largely due to double-counted freight costs. Recommend anchoring the appeal brief on the expert findings and the delivery logs already in evidence, rather than reopening the breach question.",
  },
  {
    id: "delta-foods-labour-dispute",
    matterId: "delta-foods-labour-dispute",
    court: "Cairo Labour Court",
    judge: "Counselor Mervat Shawky",
    caseNumber: "CLC-2026-0892",
    status: "Active — Pending Ruling",
    opposingParty: "7 former employees (collective claim)",
    opposingCounsel: "Adv. Tarek Younis",
    filedDate: "2026-04-18",
    nextHearing: { date: "2026-08-12", time: "1:30 PM", purpose: "Final arguments" },
    timeline: [
      { date: "2026-04-18", label: "Claim filed", detail: "Seven claimants allege wrongful termination during downsizing." },
      { date: "2026-05-05", label: "Mediation attempt", detail: "Labour office mediation failed to reach settlement." },
      { date: "2026-06-02", label: "First hearing", detail: "Court requested full severance documentation from Delta Foods." },
      { date: "2026-07-20", label: "Documents submitted", detail: "Severance calculations and termination notices filed with the court." },
    ],
    deadlines: [{ label: "Respond to discovery request", date: "2026-08-04" }],
    evidence: [
      { name: "Termination notices (7)", type: "HR Records", submittedBy: "Us", date: "2026-07-20" },
      { name: "Severance calculation worksheets", type: "Financial Records", submittedBy: "Us", date: "2026-07-20" },
      { name: "Claimants' joint statement", type: "Pleading", submittedBy: "Opposing party", date: "2026-04-18" },
    ],
    courtDocuments: [
      { name: "Statement of Claim", type: "Filing", date: "2026-04-18" },
      { name: "Defense Response", type: "Filing", date: "2026-06-02" },
    ],
    aiSummary:
      "Severance calculations filed on 2026-07-20 match Labour Law No. 14 of 2025 minimums for all seven claimants, which is a strong procedural defense. The open risk is documentation of individualized termination cause for two of the seven employees — recommend confirming those personnel files before final arguments on 2026-08-12.",
  },
  {
    id: "el-sayed-estate-partition",
    matterId: "el-sayed-estate-partition",
    court: "Giza Family Court",
    judge: "Counselor Amal Zaki",
    caseNumber: "GFC-2026-0456",
    status: "Active — Mediation",
    opposingParty: "Co-heirs (3, represented separately)",
    filedDate: "2025-09-15",
    nextHearing: { date: "2026-08-05", time: "11:00 AM", purpose: "Mediation session" },
    timeline: [
      { date: "2025-09-15", label: "Partition petition filed", detail: "Filed on behalf of executor Farida El-Sayed." },
      { date: "2025-10-20", label: "Asset valuation ordered", detail: "Court ordered independent valuation of the Mohandessin property." },
      { date: "2026-03-11", label: "Valuation report received", detail: "Property valued at EGP 9.2M; business stake valued at EGP 1.6M." },
      { date: "2026-06-01", label: "Mediation opened", detail: "Court referred the parties to mediation over the property's disposition." },
    ],
    deadlines: [{ label: "Mediation session", date: "2026-08-05" }],
    evidence: [
      { name: "Property valuation report", type: "Valuation", submittedBy: "Court", date: "2026-03-11" },
      { name: "Business stake valuation", type: "Valuation", submittedBy: "Court", date: "2026-03-11" },
      { name: "Heirship certificate", type: "Official Record", submittedBy: "Us", date: "2025-09-15" },
    ],
    courtDocuments: [
      { name: "Partition Petition", type: "Filing", date: "2025-09-15" },
      { name: "Valuation Report", type: "Court Order", date: "2026-03-11" },
    ],
    aiSummary:
      "All three co-heirs' counsel have signaled openness to a cash buyout of the minority business stake rather than an in-kind split, which would materially simplify the property partition. Recommend proposing a buyout structured against the EGP 1.6M court valuation at the 2026-08-05 mediation session.",
  },
  {
    id: "zahran-contract-dispute",
    matterId: "zahran-contract-dispute",
    court: "Cairo Economic Court",
    judge: "Counselor Nabila Roshdy",
    caseNumber: "CEC-2025-2210",
    status: "On Hold — Awaiting Settlement Talks",
    opposingParty: "Al-Fouad Cement Suppliers",
    opposingCounsel: "Adv. Bassem Farag",
    filedDate: "2025-08-11",
    timeline: [
      { date: "2025-08-11", label: "Claim filed", detail: "Zahran Construction claims delivery delays caused a 6-week project overrun." },
      { date: "2025-10-02", label: "First hearing", detail: "Court adjourned at both parties' request to pursue settlement." },
      { date: "2026-01-15", label: "Proceedings suspended", detail: "Case placed on hold pending direct settlement negotiations." },
    ],
    deadlines: [],
    evidence: [
      { name: "Supply contract (original)", type: "Contract", submittedBy: "Us", date: "2025-08-11" },
      { name: "Delivery delay log", type: "Business Records", submittedBy: "Us", date: "2025-08-11" },
    ],
    courtDocuments: [{ name: "Statement of Claim", type: "Filing", date: "2025-08-11" }],
    aiSummary:
      "No court activity since proceedings were suspended in January. Recommend a status check with the client before the case can be reactivated or formally withdrawn if settlement concludes.",
  },
];

export function caseById(id: string): CaseRecord | undefined {
  return CASES.find((c) => c.id === id);
}

export function caseForMatter(matterId: string): CaseRecord | undefined {
  return CASES.find((c) => c.matterId === matterId);
}

// ---------------------------------------------------------------------------
// Matter-scoped working data: documents, hearings, tasks, time entries,
// invoices, notes, activity. Richest for the flagship matter
// (nabil-v-nile-trading); lighter but non-empty for the others.
// ---------------------------------------------------------------------------

export interface MatterDocument {
  id: string;
  matterId: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  status: "Draft" | "Under review" | "Signed" | "Filed" | "Final";
}

export const DOCUMENTS: MatterDocument[] = [
  { id: "doc-1", matterId: "nabil-v-nile-trading", name: "Distribution Agreement (original, signed)", type: "PDF", uploadedBy: "Mona Farouk", uploadedAt: "2025-11-05", size: "1.2 MB", status: "Final" },
  { id: "doc-2", matterId: "nabil-v-nile-trading", name: "Defense Memorandum — draft v3", type: "DOCX", uploadedBy: "Mona Farouk", uploadedAt: "2026-02-15", size: "340 KB", status: "Filed" },
  { id: "doc-3", matterId: "nabil-v-nile-trading", name: "Delivery logs — Q3 2025", type: "XLSX", uploadedBy: "Layla Hassan", uploadedAt: "2025-12-12", size: "88 KB", status: "Final" },
  { id: "doc-4", matterId: "nabil-v-nile-trading", name: "Expert accounting report — annotated", type: "PDF", uploadedBy: "Mona Farouk", uploadedAt: "2026-07-16", size: "2.4 MB", status: "Under review" },
  { id: "doc-5", matterId: "nabil-v-nile-trading", name: "Appeal brief — draft", type: "DOCX", uploadedBy: "Mona Farouk", uploadedAt: "2026-07-28", size: "210 KB", status: "Draft" },
  { id: "doc-6", matterId: "nabil-v-nile-trading", name: "Client authorization letter", type: "PDF", uploadedBy: "Karim Fahmy", uploadedAt: "2025-11-04", size: "150 KB", status: "Signed" },

  { id: "doc-7", matterId: "delta-foods-nda-review", name: "Mutual NDA — final signed", type: "PDF", uploadedBy: "Youssef Adel", uploadedAt: "2026-06-24", size: "410 KB", status: "Signed" },
  { id: "doc-8", matterId: "delta-foods-nda-review", name: "Redline vs. standard template", type: "DOCX", uploadedBy: "Youssef Adel", uploadedAt: "2026-06-18", size: "95 KB", status: "Final" },

  { id: "doc-9", matterId: "delta-foods-labour-dispute", name: "Termination notices (7, combined)", type: "PDF", uploadedBy: "Layla Hassan", uploadedAt: "2026-07-20", size: "680 KB", status: "Filed" },
  { id: "doc-10", matterId: "delta-foods-labour-dispute", name: "Severance calculation worksheets", type: "XLSX", uploadedBy: "Youssef Adel", uploadedAt: "2026-07-20", size: "120 KB", status: "Filed" },
  { id: "doc-11", matterId: "delta-foods-labour-dispute", name: "Personnel files — under review", type: "ZIP", uploadedBy: "Layla Hassan", uploadedAt: "2026-07-29", size: "5.1 MB", status: "Under review" },

  { id: "doc-12", matterId: "khalil-tax-objection", name: "Tax Authority reassessment notice", type: "PDF", uploadedBy: "Ahmed Al-Sayed", uploadedAt: "2026-05-22", size: "300 KB", status: "Final" },
  { id: "doc-13", matterId: "khalil-tax-objection", name: "Transfer pricing study", type: "PDF", uploadedBy: "Ahmed Al-Sayed", uploadedAt: "2026-06-10", size: "1.8 MB", status: "Under review" },

  { id: "doc-14", matterId: "al-amal-commercial-registration", name: "Trade license renewal application", type: "PDF", uploadedBy: "Layla Hassan", uploadedAt: "2026-07-01", size: "220 KB", status: "Draft" },

  { id: "doc-15", matterId: "el-sayed-estate-partition", name: "Property valuation report", type: "PDF", uploadedBy: "Ahmed Al-Sayed", uploadedAt: "2026-03-11", size: "1.1 MB", status: "Final" },
  { id: "doc-16", matterId: "el-sayed-estate-partition", name: "Heirship certificate", type: "PDF", uploadedBy: "Ahmed Al-Sayed", uploadedAt: "2025-09-16", size: "95 KB", status: "Final" },

  { id: "doc-17", matterId: "zahran-contract-dispute", name: "Supply contract (original)", type: "PDF", uploadedBy: "Mona Farouk", uploadedAt: "2025-08-11", size: "540 KB", status: "Final" },

  { id: "doc-18", matterId: "samir-nassar-consulting-agreement", name: "Consulting Agreement — final", type: "PDF", uploadedBy: "Youssef Adel", uploadedAt: "2025-05-14", size: "180 KB", status: "Signed" },
];

export function documentsForMatter(matterId: string): MatterDocument[] {
  return DOCUMENTS.filter((d) => d.matterId === matterId);
}

export interface MatterHearing {
  id: string;
  matterId: string;
  date: string;
  time: string;
  court: string;
  purpose: string;
  outcome?: string;
}

export const HEARINGS: MatterHearing[] = [
  { id: "h-1", matterId: "nabil-v-nile-trading", date: "2025-12-01", time: "10:00 AM", court: "Cairo Economic Court", purpose: "First hearing — evidence schedule set", outcome: "Schedule set; no ruling" },
  { id: "h-2", matterId: "nabil-v-nile-trading", date: "2026-02-18", time: "10:30 AM", court: "Cairo Economic Court", purpose: "Defense memorandum review", outcome: "Accepted for filing" },
  { id: "h-3", matterId: "nabil-v-nile-trading", date: "2026-05-06", time: "9:30 AM", court: "Cairo Economic Court", purpose: "Expert appointment hearing", outcome: "Accounting expert appointed" },
  { id: "h-4", matterId: "nabil-v-nile-trading", date: "2026-08-10", time: "10:00 AM", court: "Cairo Economic Court", purpose: "Evidence submission review" },

  { id: "h-5", matterId: "delta-foods-labour-dispute", date: "2026-06-02", time: "1:00 PM", court: "Cairo Labour Court", purpose: "First hearing — documents requested" },
  { id: "h-6", matterId: "delta-foods-labour-dispute", date: "2026-08-12", time: "1:30 PM", court: "Cairo Labour Court", purpose: "Final arguments" },

  { id: "h-7", matterId: "el-sayed-estate-partition", date: "2026-06-01", time: "11:00 AM", court: "Giza Family Court", purpose: "Mediation referral" },
  { id: "h-8", matterId: "el-sayed-estate-partition", date: "2026-08-05", time: "11:00 AM", court: "Giza Family Court", purpose: "Mediation session" },

  { id: "h-9", matterId: "zahran-contract-dispute", date: "2025-10-02", time: "10:00 AM", court: "Cairo Economic Court", purpose: "First hearing — adjourned for settlement talks" },
];

export function hearingsForMatter(matterId: string): MatterHearing[] {
  return HEARINGS.filter((h) => h.matterId === matterId);
}

export interface MatterTask {
  id: string;
  matterId: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  status: "To do" | "In progress" | "Done";
  priority: "Low" | "Medium" | "High";
}

export const TASKS: MatterTask[] = [
  { id: "t-1", matterId: "nabil-v-nile-trading", title: "Draft appeal brief responding to expert report", assigneeId: "mona-farouk", dueDate: "2026-08-02", status: "In progress", priority: "High" },
  { id: "t-2", matterId: "nabil-v-nile-trading", title: "Prepare rebuttal exhibits to expert accounting report", assigneeId: "layla-hassan", dueDate: "2026-08-06", status: "To do", priority: "High" },
  { id: "t-3", matterId: "nabil-v-nile-trading", title: "Brief client on expert report findings", assigneeId: "mona-farouk", dueDate: "2026-07-30", status: "Done", priority: "Medium" },
  { id: "t-4", matterId: "nabil-v-nile-trading", title: "Confirm hearing logistics with court clerk", assigneeId: "layla-hassan", dueDate: "2026-08-08", status: "To do", priority: "Low" },

  { id: "t-5", matterId: "delta-foods-labour-dispute", title: "Respond to discovery request", assigneeId: "youssef-adel", dueDate: "2026-08-04", status: "In progress", priority: "High" },
  { id: "t-6", matterId: "delta-foods-labour-dispute", title: "Verify termination cause documentation for 2 claimants", assigneeId: "layla-hassan", dueDate: "2026-08-06", status: "To do", priority: "High" },

  { id: "t-7", matterId: "khalil-tax-objection", title: "Submit tax objection filing", assigneeId: "ahmed-al-sayed", dueDate: "2026-08-14", status: "To do", priority: "High" },

  { id: "t-8", matterId: "al-amal-commercial-registration", title: "Renew commercial registration", assigneeId: "layla-hassan", dueDate: "2026-08-09", status: "In progress", priority: "Medium" },

  { id: "t-9", matterId: "el-sayed-estate-partition", title: "Prepare buyout proposal for mediation session", assigneeId: "ahmed-al-sayed", dueDate: "2026-08-05", status: "In progress", priority: "High" },
];

export function tasksForMatter(matterId: string): MatterTask[] {
  return TASKS.filter((t) => t.matterId === matterId);
}

export interface TimeEntry {
  id: string;
  matterId: string;
  lawyerId: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate: number;
}

export const TIME_ENTRIES: TimeEntry[] = [
  { id: "te-1", matterId: "nabil-v-nile-trading", lawyerId: "mona-farouk", date: "2026-07-28", hours: 3.5, description: "Drafted appeal brief responding to expert report", billable: true, rate: 1800 },
  { id: "te-2", matterId: "nabil-v-nile-trading", lawyerId: "mona-farouk", date: "2026-07-17", hours: 2.0, description: "Reviewed and annotated expert accounting report", billable: true, rate: 1800 },
  { id: "te-3", matterId: "nabil-v-nile-trading", lawyerId: "layla-hassan", date: "2026-07-18", hours: 1.5, description: "Compiled rebuttal exhibits from delivery logs", billable: true, rate: 650 },
  { id: "te-4", matterId: "nabil-v-nile-trading", lawyerId: "mona-farouk", date: "2026-05-06", hours: 1.0, description: "Attended expert appointment hearing", billable: true, rate: 1800 },
  { id: "te-5", matterId: "nabil-v-nile-trading", lawyerId: "mona-farouk", date: "2026-02-14", hours: 4.0, description: "Drafted defense memorandum", billable: true, rate: 1800 },

  { id: "te-6", matterId: "delta-foods-labour-dispute", lawyerId: "youssef-adel", date: "2026-07-29", hours: 2.5, description: "Prepared response to discovery request", billable: true, rate: 1400 },
  { id: "te-7", matterId: "delta-foods-labour-dispute", lawyerId: "layla-hassan", date: "2026-07-25", hours: 3.0, description: "Cross-referenced personnel files against severance worksheets", billable: true, rate: 650 },

  { id: "te-8", matterId: "khalil-tax-objection", lawyerId: "ahmed-al-sayed", date: "2026-06-10", hours: 5.0, description: "Reviewed transfer pricing study against reassessment notice", billable: true, rate: 2200 },

  { id: "te-9", matterId: "el-sayed-estate-partition", lawyerId: "ahmed-al-sayed", date: "2026-07-22", hours: 1.5, description: "Prepared buyout proposal for mediation", billable: true, rate: 2200 },
];

export function timeEntriesForMatter(matterId: string): TimeEntry[] {
  return TIME_ENTRIES.filter((t) => t.matterId === matterId);
}

export interface Invoice {
  id: string;
  matterId: string;
  clientId: string;
  number: string;
  amount: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  issuedDate: string;
  dueDate: string;
}

export const INVOICES: Invoice[] = [
  { id: "inv-1", matterId: "nabil-v-nile-trading", clientId: "nile-trading", number: "INV-2026-0142", amount: 45500, status: "Paid", issuedDate: "2026-06-01", dueDate: "2026-06-30" },
  { id: "inv-2", matterId: "nabil-v-nile-trading", clientId: "nile-trading", number: "INV-2026-0178", amount: 38200, status: "Sent", issuedDate: "2026-07-25", dueDate: "2026-08-24" },
  { id: "inv-3", matterId: "delta-foods-nda-review", clientId: "delta-foods", number: "INV-2026-0098", amount: 12000, status: "Paid", issuedDate: "2026-06-25", dueDate: "2026-07-25" },
  { id: "inv-4", matterId: "delta-foods-labour-dispute", clientId: "delta-foods", number: "INV-2026-0165", amount: 21400, status: "Sent", issuedDate: "2026-07-15", dueDate: "2026-08-14" },
  { id: "inv-5", matterId: "khalil-tax-objection", clientId: "khalil-holdings", number: "INV-2026-0151", amount: 18700, status: "Overdue", issuedDate: "2026-06-15", dueDate: "2026-07-15" },
  { id: "inv-6", matterId: "al-amal-commercial-registration", clientId: "al-amal-trading", number: "INV-2026-0182", amount: 8500, status: "Draft", issuedDate: "2026-07-29", dueDate: "2026-08-28" },
  { id: "inv-7", matterId: "el-sayed-estate-partition", clientId: "el-sayed-estate", number: "INV-2026-0110", amount: 15000, status: "Paid", issuedDate: "2026-05-01", dueDate: "2026-05-31" },
];

export function invoicesForMatter(matterId: string): Invoice[] {
  return INVOICES.filter((i) => i.matterId === matterId);
}

export function invoicesForClient(clientId: string): Invoice[] {
  return INVOICES.filter((i) => i.clientId === clientId);
}

export interface MatterNote {
  id: string;
  matterId: string;
  authorId: string;
  date: string;
  content: string;
}

export const NOTES: MatterNote[] = [
  { id: "n-1", matterId: "nabil-v-nile-trading", authorId: "mona-farouk", date: "2026-07-16", content: "Expert report is favorable — damages overstated ~40% due to double-counted freight costs. Client briefed and agrees with appeal strategy." },
  { id: "n-2", matterId: "nabil-v-nile-trading", authorId: "ahmed-al-sayed", date: "2026-07-20", content: "Confirmed budget headroom with Karim Fahmy for appeal-stage work. No change to fee arrangement." },
  { id: "n-3", matterId: "delta-foods-labour-dispute", authorId: "youssef-adel", date: "2026-07-26", content: "Two personnel files (claimants #4 and #6) are missing documented termination cause — following up with Tamer Gaber before final arguments." },
  { id: "n-4", matterId: "el-sayed-estate-partition", authorId: "ahmed-al-sayed", date: "2026-06-05", content: "Farida El-Sayed open to a cash buyout of the business stake if priced at or near the court valuation." },
];

export function notesForMatter(matterId: string): MatterNote[] {
  return NOTES.filter((n) => n.matterId === matterId);
}

export interface ActivityEntry {
  id: string;
  matterId?: string;
  clientId?: string;
  who: string;
  what: string;
  when: string;
}

export const ACTIVITY: ActivityEntry[] = [
  { id: "a-1", matterId: "nabil-v-nile-trading", clientId: "nile-trading", who: "Mona Farouk", what: "uploaded the annotated expert accounting report", when: "2026-07-16 14:20" },
  { id: "a-2", matterId: "nabil-v-nile-trading", clientId: "nile-trading", who: "Mona Farouk", what: "started drafting the appeal brief", when: "2026-07-28 09:05" },
  { id: "a-3", matterId: "nabil-v-nile-trading", clientId: "nile-trading", who: "Layla Hassan", what: "logged 1.5h compiling rebuttal exhibits", when: "2026-07-18 16:40" },
  { id: "a-4", matterId: "nabil-v-nile-trading", clientId: "nile-trading", who: "AI Assistant", what: "flagged the expert report's freight double-count in the matter summary", when: "2026-07-16 15:02" },
  { id: "a-5", matterId: "nabil-v-nile-trading", clientId: "nile-trading", who: "Ahmed Al-Sayed", what: "confirmed appeal-stage budget with the client", when: "2026-07-20 11:15" },
  { id: "a-6", matterId: "delta-foods-labour-dispute", clientId: "delta-foods", who: "Youssef Adel", what: "filed severance calculation worksheets with the court", when: "2026-07-20 10:30" },
  { id: "a-7", matterId: "delta-foods-nda-review", clientId: "delta-foods", who: "AI Assistant", what: "finished reviewing the NDA — 2 clauses flagged against the standard template", when: "2026-06-18 12:00" },
  { id: "a-8", matterId: "el-sayed-estate-partition", clientId: "el-sayed-estate", who: "Ahmed Al-Sayed", what: "drafted a buyout proposal for the upcoming mediation session", when: "2026-07-22 13:10" },
  { id: "a-9", matterId: "al-amal-commercial-registration", clientId: "al-amal-trading", who: "Layla Hassan", what: "submitted the trade license renewal application draft for review", when: "2026-07-01 09:45" },
  { id: "a-10", clientId: "nile-trading", who: "Ahmed Al-Sayed", what: "invited Mona Farouk to the Nabil v. Nile Trading Co. matter", when: "2025-11-03 08:30" },
];

export function activityForMatter(matterId: string): ActivityEntry[] {
  return ACTIVITY.filter((a) => a.matterId === matterId);
}

export function activityForClient(clientId: string): ActivityEntry[] {
  return ACTIVITY.filter((a) => a.clientId === clientId);
}

// ---------------------------------------------------------------------------
// Matter-level timeline (distinct from the case litigation timeline — this
// covers firm-side milestones: intake, filings, client comms, invoicing).
// ---------------------------------------------------------------------------

export interface MatterTimelineEvent {
  matterId: string;
  date: string;
  label: string;
  detail?: string;
  kind: "milestone" | "filing" | "communication" | "billing";
}

export const MATTER_TIMELINE: MatterTimelineEvent[] = [
  { matterId: "nabil-v-nile-trading", date: "2025-11-03", label: "Matter opened", detail: "Engagement letter signed by Karim Fahmy.", kind: "milestone" },
  { matterId: "nabil-v-nile-trading", date: "2025-11-05", label: "Distribution agreement collected from client", kind: "communication" },
  { matterId: "nabil-v-nile-trading", date: "2025-12-01", label: "First hearing held", detail: "Evidence-exchange schedule set by the court.", kind: "filing" },
  { matterId: "nabil-v-nile-trading", date: "2026-02-18", label: "Defense memorandum filed", kind: "filing" },
  { matterId: "nabil-v-nile-trading", date: "2026-06-01", label: "Invoice INV-2026-0142 sent and paid", kind: "billing" },
  { matterId: "nabil-v-nile-trading", date: "2026-07-14", label: "Expert report received — favorable finding", kind: "milestone" },
  { matterId: "nabil-v-nile-trading", date: "2026-07-20", label: "Client briefed on appeal strategy", kind: "communication" },
  { matterId: "nabil-v-nile-trading", date: "2026-07-25", label: "Invoice INV-2026-0178 sent", kind: "billing" },

  { matterId: "delta-foods-labour-dispute", date: "2026-04-18", label: "Matter opened", kind: "milestone" },
  { matterId: "delta-foods-labour-dispute", date: "2026-05-05", label: "Mediation attempt failed", kind: "filing" },
  { matterId: "delta-foods-labour-dispute", date: "2026-07-20", label: "Severance documentation filed", kind: "filing" },

  { matterId: "el-sayed-estate-partition", date: "2025-09-15", label: "Matter opened", detail: "Retainer agreement signed by Farida El-Sayed.", kind: "milestone" },
  { matterId: "el-sayed-estate-partition", date: "2026-03-11", label: "Valuation report received", kind: "filing" },
  { matterId: "el-sayed-estate-partition", date: "2026-06-01", label: "Referred to mediation", kind: "milestone" },
];

export function timelineForMatter(matterId: string): MatterTimelineEvent[] {
  return MATTER_TIMELINE.filter((e) => e.matterId === matterId);
}

// ---------------------------------------------------------------------------
// AI Assistant (matter-scoped) — sample conversation + insights, purple
// accent only, distinct from the global /ai-assistant page.
// ---------------------------------------------------------------------------

export interface MatterAiInsight {
  matterId: string;
  insight: string;
}

export const MATTER_AI_INSIGHTS: MatterAiInsight[] = [
  { matterId: "nabil-v-nile-trading", insight: "The court-appointed expert's report found claimed damages overstated by ~40%, largely from double-counted freight costs already documented in your Q3 2025 delivery logs." },
  { matterId: "nabil-v-nile-trading", insight: "Egyptian Civil Code Art. 147 supports your position that the distribution agreement's delivery-window clause was not a condition precedent to payment — worth citing in the appeal brief." },
  { matterId: "nabil-v-nile-trading", insight: "3 documents in this matter have not been reviewed in over 30 days: the client authorization letter, the original distribution agreement, and the Q3 delivery logs." },
];

export interface MatterAiMessage {
  matterId: string;
  role: "user" | "assistant";
  content: string;
}

export const MATTER_AI_CONVERSATION: MatterAiMessage[] = [
  { matterId: "nabil-v-nile-trading", role: "user", content: "Summarize where the expert report leaves us on the damages claim." },
  {
    matterId: "nabil-v-nile-trading",
    role: "assistant",
    content:
      "The court-appointed accounting expert found the claimant's EGP 2.4M damages figure overstated by approximately 40%, primarily due to freight costs counted twice across two line items in the claimant's submitted ledger. This aligns with your Q3 2025 delivery logs already in evidence. Recommend citing the expert's finding directly and cross-referencing the delivery logs (Exhibit 3) in the appeal brief rather than reopening the underlying breach question, which the defense memorandum already addressed.",
  },
  { matterId: "nabil-v-nile-trading", role: "user", content: "Is there a statute basis to argue the delivery delay wasn't a material breach?" },
  {
    matterId: "nabil-v-nile-trading",
    role: "assistant",
    content:
      "Egyptian Civil Code Article 147 treats a contractual term as a condition precedent only where the contract expressly states so, or where the nature of the obligation makes strict timing essential. The distribution agreement's delivery clause (Section 4.2) does not use conditional language, which supports arguing the delay was a non-material breach at most. I can draft a short memo with the exact citation and comparison against the contract text if useful. This is a starting point for review, not final legal advice.",
  },
];

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatEGP(amount: number): string {
  return `EGP ${amount.toLocaleString("en-US")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function daysUntil(iso: string): number {
  const today = new Date("2026-07-31T00:00:00");
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
