// Mock data for the Knowledge Base pillar — no knowledge-base backend exists
// yet. Content reads as plausible internal firm material, not real precedent.

export type KbCategory =
  | "Contract Templates"
  | "Litigation Precedents"
  | "Regulatory Guides"
  | "Firm Policies & SOPs"
  | "Client Communication Templates";

export type KbItemType = "template" | "precedent" | "guide" | "policy";

export type KbItem = {
  id: string;
  title: string;
  category: KbCategory;
  type: KbItemType;
  author: string;
  updated: string;
  summary: string;
  tags: string[];
  relatedMatter?: string;
  body: { heading: string; text: string }[];
  relatedIds: string[];
};

export const KB_CATEGORIES: KbCategory[] = [
  "Contract Templates",
  "Litigation Precedents",
  "Regulatory Guides",
  "Firm Policies & SOPs",
  "Client Communication Templates",
];

export const KB_ITEMS: KbItem[] = [
  {
    id: "standard-nda-template",
    title: "Standard NDA Template (EN/AR)",
    category: "Contract Templates",
    type: "template",
    author: "Ahmed Al-Sayed",
    updated: "Jul 10, 2026",
    summary: "Bilingual mutual NDA template used as the firm's default starting point for new confidentiality agreements.",
    tags: ["NDA", "Template", "Bilingual"],
    body: [
      { heading: "Overview", text: "This is the firm's default mutual non-disclosure agreement, maintained in parallel English and Arabic versions. Use it as the starting draft for any client NDA unless the matter calls for a one-way agreement." },
      { heading: "Standard terms", text: "Confidentiality term of 3 years, standard carve-outs for publicly available information, and governing law set to Egypt by default — update the jurisdiction clause for cross-border counterparties." },
      { heading: "When to deviate", text: "Escalate to Ahmed before agreeing to non-compete language or confidentiality terms longer than 5 years; both fall outside the firm's standard risk tolerance." },
    ],
    relatedIds: ["nda-delta-foods-precedent", "engagement-letter-template"],
  },
  {
    id: "commercial-lease-template",
    title: "Commercial Lease Agreement Template",
    category: "Contract Templates",
    type: "template",
    author: "Mona Farouk",
    updated: "Jun 18, 2026",
    summary: "Base template for commercial property leases, covering rent escalation, maintenance, and early termination.",
    tags: ["Lease", "Template", "Real Estate"],
    body: [
      { heading: "Overview", text: "Covers the standard structure for commercial leases handled by the firm: term, rent escalation schedule, maintenance responsibilities, and early termination penalties." },
      { heading: "Notes", text: "Confirm registration requirements with the relevant real estate registry before finalizing; requirements vary by governorate." },
    ],
    relatedIds: ["poa-corporate-template"],
  },
  {
    id: "poa-corporate-template",
    title: "Power of Attorney Template — Corporate",
    category: "Contract Templates",
    type: "template",
    author: "Layla Hassan",
    updated: "May 22, 2026",
    summary: "Corporate power of attorney template for delegating signing authority on behalf of a company.",
    tags: ["Power of Attorney", "Template", "Corporate"],
    body: [
      { heading: "Overview", text: "Used when a corporate client needs to delegate signing authority to an individual for a defined scope of transactions." },
      { heading: "Notarization", text: "Requires notarization before use; attach the company's commercial registration extract to the notarization request." },
    ],
    relatedIds: ["poa-khalil-holdings-precedent"],
  },
  {
    id: "engagement-letter-template",
    title: "Engagement Letter Template",
    category: "Client Communication Templates",
    type: "template",
    author: "Ahmed Al-Sayed",
    updated: "Jun 30, 2026",
    summary: "Standard engagement letter setting out scope, fees, and terms for new client matters.",
    tags: ["Template", "Onboarding"],
    body: [
      { heading: "Overview", text: "Send this letter to every new client before opening a matter. It sets out scope of work, fee structure, and billing terms." },
      { heading: "Customization", text: "Adjust the fee section for fixed-fee vs. hourly engagements; the default template assumes hourly billing." },
    ],
    relatedIds: ["client-onboarding-checklist"],
  },
  {
    id: "client-update-email-template",
    title: "Client Update Email Template — Hearing Postponement",
    category: "Client Communication Templates",
    type: "template",
    author: "Mona Farouk",
    updated: "Jul 18, 2026",
    summary: "Short-notice email template for informing clients when a hearing date has moved.",
    tags: ["Template", "Correspondence"],
    body: [
      { heading: "Overview", text: "Use when a court reschedules a hearing on short notice. Keep the tone calm and factual, and always include the new date and any action the client needs to take." },
    ],
    relatedIds: ["engagement-letter-template"],
  },
  {
    id: "nda-delta-foods-precedent",
    title: "Cairo Economic Court: Breach of Contract Precedent Brief",
    category: "Litigation Precedents",
    type: "precedent",
    author: "Ahmed Al-Sayed",
    updated: "Jul 15, 2026",
    summary: "Internal brief summarizing argument structure and outcome from a prior breach-of-contract matter before the Cairo Economic Court.",
    tags: ["Breach of Contract", "Economic Court", "Precedent"],
    relatedMatter: "Nabil v. Nile Trading Co.",
    body: [
      { heading: "Background", text: "Summarizes the firm's approach to a prior breach-of-contract dispute heard before the Cairo Economic Court, including the argument structure that supported the client's position." },
      { heading: "Argument structure", text: "The brief opens with the contractual timeline, establishes the counterparty's failure to perform against agreed milestones, and closes with the damages calculation methodology used." },
      { heading: "Use in current matters", text: "Reference this structure when preparing filings for similar commercial breach disputes, adapting the damages section to the specific facts." },
    ],
    relatedIds: ["standard-nda-template"],
  },
  {
    id: "labour-settlement-precedent",
    title: "Labour Dispute Settlement Precedent — Termination Claims",
    category: "Litigation Precedents",
    type: "precedent",
    author: "Youssef Adel",
    updated: "Jul 12, 2026",
    summary: "Internal reference on structuring settlement terms for wrongful termination claims before the Labour Court.",
    tags: ["Labour Law", "Settlement", "Precedent"],
    relatedMatter: "Delta Foods Labour Dispute",
    body: [
      { heading: "Background", text: "Reference material for structuring settlement terms in termination-related labour disputes, drawn from prior matters handled by the firm." },
      { heading: "Settlement structure", text: "Settlements in this category typically address severance calculation, notice period compensation, and a mutual non-disparagement clause." },
    ],
    relatedIds: ["poa-khalil-holdings-precedent"],
  },
  {
    id: "poa-khalil-holdings-precedent",
    title: "Family Court Estate Partition Precedent",
    category: "Litigation Precedents",
    type: "precedent",
    author: "Ahmed Al-Sayed",
    updated: "Jun 28, 2026",
    summary: "Internal reference brief on structuring estate partition filings before the Family Court.",
    tags: ["Family Law", "Probate", "Precedent"],
    relatedMatter: "El-Sayed Estate Partition",
    body: [
      { heading: "Background", text: "Covers the filing structure used in a prior estate partition matter, including the heirship documentation checklist required by the Family Court." },
      { heading: "Checklist", text: "Heirship certificate, asset inventory, and prior partition agreements (if any) must all be filed together to avoid procedural delay." },
    ],
    relatedIds: ["client-onboarding-checklist"],
  },
  {
    id: "companies-law-summary",
    title: "Egyptian Companies Law Amendments Summary (2025)",
    category: "Regulatory Guides",
    type: "guide",
    author: "Youssef Adel",
    updated: "Jun 5, 2026",
    summary: "Internal summary of recent amendments to the Egyptian Companies Law relevant to corporate advisory matters.",
    tags: ["Companies Law", "Corporate", "Regulatory"],
    body: [
      { heading: "Overview", text: "A working summary of recent amendments to corporate governance and disclosure requirements, prepared for internal reference on advisory matters." },
      { heading: "Practical impact", text: "Affects board composition disclosures and minority shareholder notification timelines; review with clients undergoing governance changes." },
    ],
    relatedIds: ["gafi-registration-guide"],
  },
  {
    id: "gafi-registration-guide",
    title: "GAFI Foreign Investment Registration Guide",
    category: "Regulatory Guides",
    type: "guide",
    author: "Mona Farouk",
    updated: "May 30, 2026",
    summary: "Step-by-step internal reference for registering foreign-owned entities with GAFI.",
    tags: ["GAFI", "Foreign Investment", "Regulatory"],
    body: [
      { heading: "Overview", text: "Walks through the document package and sequencing typically required when registering a foreign-owned entity with the General Authority for Investment (GAFI)." },
      { heading: "Common delays", text: "Missing apostilled parent-company documents is the most common cause of delay; confirm this with the client before filing." },
    ],
    relatedIds: ["companies-law-summary"],
  },
  {
    id: "client-onboarding-checklist",
    title: "Client Onboarding Checklist",
    category: "Firm Policies & SOPs",
    type: "policy",
    author: "Layla Hassan",
    updated: "Jun 8, 2026",
    summary: "Internal checklist covering conflict checks, engagement letters, and matter setup for new clients.",
    tags: ["Onboarding", "SOP"],
    body: [
      { heading: "Steps", text: "Run a conflict check, send the engagement letter, collect KYC documentation, and open the matter record before any billable work begins." },
    ],
    relatedIds: ["conflict-check-policy", "engagement-letter-template"],
  },
  {
    id: "conflict-check-policy",
    title: "Conflict of Interest Check Procedure",
    category: "Firm Policies & SOPs",
    type: "policy",
    author: "Ahmed Al-Sayed",
    updated: "Jun 12, 2026",
    summary: "Firm procedure for running conflict-of-interest checks before accepting a new client or matter.",
    tags: ["Conflicts", "SOP", "Compliance"],
    body: [
      { heading: "Procedure", text: "Search the client and matter database for the prospective counterparty's name and any affiliated entities before accepting an engagement. Escalate any partial matches to the Owner before proceeding." },
    ],
    relatedIds: ["client-onboarding-checklist"],
  },
];

export function getKbItem(id: string): KbItem | undefined {
  return KB_ITEMS.find((item) => item.id === id);
}

export function getKbItems(ids: string[]): KbItem[] {
  return ids.map((id) => KB_ITEMS.find((item) => item.id === id)).filter((i): i is KbItem => Boolean(i));
}

export const AI_RECOMMENDATIONS: { itemId: string; reason: string }[] = [
  {
    itemId: "nda-delta-foods-precedent",
    reason: "Similar breach-of-contract argument structure to Nabil v. Nile Trading Co.",
  },
  {
    itemId: "standard-nda-template",
    reason: "Base template used for the current Delta Foods NDA draft.",
  },
  {
    itemId: "client-update-email-template",
    reason: "Matches the hearing postponement update pending on Nabil v. Nile Trading Co.",
  },
];
