// Mock data for the CRM (prospective-client pipeline) pillar. No CRM backend
// exists yet — this is the UI-concept pass. Distinct from `/clients`, which
// covers existing client companies.

export type LeadStage =
  | "new"
  | "contacted"
  | "consultation"
  | "proposal"
  | "won"
  | "lost";

export type ConflictStatus = "clear" | "pending" | "flagged";

export type TimelineEntryType =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "note"
  | "stage";

export interface TimelineEntry {
  type: TimelineEntryType;
  who: string;
  text: string;
  time: string;
}

export interface ConsultationInfo {
  status: "none" | "scheduled" | "completed";
  date?: string; // human label, e.g. "Wed, Jul 31"
  time?: string; // e.g. "5:00 PM"
}

export interface Lead {
  id: string;
  name: string;
  company: boolean;
  matterType: string;
  source: string;
  estValue: number;
  stage: LeadStage;
  assignedTo: string;
  createdLabel: string;
  conflictStatus: ConflictStatus;
  conflictNote: string;
  consultation: ConsultationInfo;
  notes: string[];
  timeline: TimelineEntry[];
  lostReason?: string;
}

export const STAGE_META: Record<
  LeadStage,
  { label: string; badgeVariant: "neutral" | "blue" | "cyan" | "orange" | "success" | "red" }
> = {
  new: { label: "New Lead", badgeVariant: "neutral" },
  contacted: { label: "Contacted", badgeVariant: "blue" },
  consultation: { label: "Consultation Scheduled", badgeVariant: "cyan" },
  proposal: { label: "Proposal Sent", badgeVariant: "orange" },
  won: { label: "Won", badgeVariant: "success" },
  lost: { label: "Lost", badgeVariant: "red" },
};

export const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "consultation",
  "proposal",
  "won",
  "lost",
];

export function formatEGP(value: number): string {
  return `EGP ${value.toLocaleString("en-US")}`;
}

export function formatEGPCompact(value: number): string {
  return `EGP ${Math.round(value / 1000)}k`;
}

export const LEADS: Lead[] = [
  {
    id: "rania-mahmoud",
    name: "Rania Mahmoud",
    company: false,
    matterType: "Family Law — Divorce Settlement",
    source: "Referral — Mona Farouk",
    estValue: 45000,
    stage: "new",
    assignedTo: "Mona Farouk",
    createdLabel: "1 day ago",
    conflictStatus: "pending",
    conflictNote: "Conflict check submitted; awaiting registry search results.",
    consultation: { status: "none" },
    notes: [
      "Referred by an existing client's sister. Wants an initial consultation before committing.",
    ],
    timeline: [
      { type: "stage", who: "Mona Farouk", text: "Lead created from referral intake form", time: "1d ago" },
      { type: "call", who: "Mona Farouk", text: "Brief intro call — outlined next steps and fee structure", time: "20h ago" },
    ],
  },
  {
    id: "cairo-steel-works",
    name: "Cairo Steel Works",
    company: true,
    matterType: "Commercial Contract Drafting",
    source: "Website inquiry",
    estValue: 120000,
    stage: "new",
    assignedTo: "Ahmed Al-Sayed",
    createdLabel: "2 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "none" },
    notes: [
      "Needs a standard supply-agreement template plus review of three existing vendor contracts.",
    ],
    timeline: [
      { type: "stage", who: "System", text: "Lead submitted via website contact form", time: "2d ago" },
      { type: "email", who: "Ahmed Al-Sayed", text: "Sent scoping questionnaire", time: "1d ago" },
    ],
  },
  {
    id: "nourhan-gaber",
    name: "Nourhan Gaber",
    company: false,
    matterType: "Real Estate Dispute",
    source: "Referral — existing client",
    estValue: 60000,
    stage: "contacted",
    assignedTo: "Youssef Adel",
    createdLabel: "5 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "none" },
    notes: [
      "Boundary dispute with a neighboring property in Giza. Has partial documentation, chasing the rest.",
    ],
    timeline: [
      { type: "stage", who: "Youssef Adel", text: "Lead created from referral", time: "5d ago" },
      { type: "call", who: "Youssef Adel", text: "Discussed dispute background and timeline", time: "4d ago" },
      { type: "whatsapp", who: "Nourhan Gaber", text: "Sent photos of the property deed and survey map", time: "2d ago" },
    ],
  },
  {
    id: "fawzy-textiles",
    name: "Fawzy Textiles Group",
    company: true,
    matterType: "Corporate Restructuring",
    source: "LinkedIn outreach",
    estValue: 350000,
    stage: "contacted",
    assignedTo: "Ahmed Al-Sayed",
    createdLabel: "6 days ago",
    conflictStatus: "flagged",
    conflictNote:
      "Potential conflict — a director of Fawzy Textiles Group also sits on the board of a party opposing Nile Trading Co. in an active matter. Flagged for partner review before engagement.",
    consultation: { status: "none" },
    notes: [
      "Restructuring two subsidiaries ahead of a planned investment round. High-value, needs partner sign-off given the conflict flag.",
    ],
    timeline: [
      { type: "stage", who: "Ahmed Al-Sayed", text: "Lead created after LinkedIn outreach reply", time: "6d ago" },
      { type: "note", who: "System", text: "Conflict check flagged a potential relationship — see conflict status", time: "5d ago" },
      { type: "email", who: "Ahmed Al-Sayed", text: "Acknowledged interest, explained review is pending", time: "3d ago" },
    ],
  },
  {
    id: "samir-abdelaziz",
    name: "Samir Abdel Aziz",
    company: false,
    matterType: "IP / Trademark Registration",
    source: "Walk-in",
    estValue: 25000,
    stage: "consultation",
    assignedTo: "Ahmed Al-Sayed",
    createdLabel: "4 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "scheduled", date: "Thu, Aug 1", time: "11:00 AM" },
    notes: [
      "Wants to register a trademark for a new packaged-foods brand. Straightforward filing, quick turnaround expected.",
    ],
    timeline: [
      { type: "stage", who: "Ahmed Al-Sayed", text: "Walked into the office, lead logged", time: "4d ago" },
      { type: "call", who: "Ahmed Al-Sayed", text: "Confirmed scope and fee estimate", time: "3d ago" },
      { type: "stage", who: "Ahmed Al-Sayed", text: "Consultation booked for Thu, Aug 1 at 11:00 AM", time: "1d ago" },
    ],
  },
  {
    id: "nile-logistics",
    name: "Nile Logistics Co.",
    company: true,
    matterType: "Employment Contract Review",
    source: "Referral — Khalil Holdings",
    estValue: 90000,
    stage: "consultation",
    assignedTo: "Mona Farouk",
    createdLabel: "3 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "scheduled", date: "Wed, Jul 31", time: "5:00 PM" },
    notes: [
      "Reviewing standard employment contracts ahead of a hiring push. Referred directly by Khalil Holdings' finance director.",
    ],
    timeline: [
      { type: "stage", who: "Mona Farouk", text: "Lead created from Khalil Holdings referral", time: "3d ago" },
      { type: "whatsapp", who: "Nile Logistics Co.", text: "Shared current contract templates for review", time: "2d ago" },
      { type: "stage", who: "Mona Farouk", text: "Consultation booked for today at 5:00 PM", time: "1d ago" },
    ],
  },
  {
    id: "heba-elmasry",
    name: "Heba El-Masry",
    company: false,
    matterType: "Estate Planning",
    source: "Phone inquiry",
    estValue: 55000,
    stage: "proposal",
    assignedTo: "Ahmed Al-Sayed",
    createdLabel: "9 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "completed", date: "Fri, Jul 24", time: "10:00 AM" },
    notes: [
      "Wants a full estate plan including a will and power of attorney. Consultation went well; proposal sent, awaiting decision.",
    ],
    timeline: [
      { type: "stage", who: "Ahmed Al-Sayed", text: "Lead created from inbound phone call", time: "9d ago" },
      { type: "meeting", who: "Ahmed Al-Sayed", text: "Consultation held at the office", time: "7d ago" },
      { type: "email", who: "Ahmed Al-Sayed", text: "Sent engagement proposal and fee schedule", time: "5d ago" },
    ],
  },
  {
    id: "al-rawi-construction",
    name: "Al-Rawi Construction",
    company: true,
    matterType: "Litigation — Payment Dispute",
    source: "Referral — Nile Trading Co.",
    estValue: 480000,
    stage: "proposal",
    assignedTo: "Ahmed Al-Sayed",
    createdLabel: "11 days ago",
    conflictStatus: "flagged",
    conflictNote:
      "Potential conflict — the opposing party in Nabil v. Nile Trading Co. shares a director with Al-Rawi Construction. Pending partner review before the engagement letter is signed.",
    consultation: { status: "completed", date: "Wed, Jul 22", time: "2:00 PM" },
    notes: [
      "Disputed payment on a completed contracting job, roughly EGP 480,000 outstanding. High value; proposal sent but engagement is on hold pending the conflict review.",
      "Client is pushing for a fast answer — follow up with the review before end of week.",
    ],
    timeline: [
      { type: "stage", who: "Ahmed Al-Sayed", text: "Lead created from Nile Trading Co. referral", time: "11d ago" },
      { type: "note", who: "System", text: "Conflict check flagged a shared directorship — see conflict status", time: "10d ago" },
      { type: "meeting", who: "Ahmed Al-Sayed", text: "Consultation held to review the payment dispute", time: "9d ago" },
      { type: "email", who: "Ahmed Al-Sayed", text: "Sent engagement proposal, noted conflict review is pending", time: "6d ago" },
      { type: "whatsapp", who: "Al-Rawi Construction", text: "Asked for a timeline on the review", time: "1d ago" },
    ],
  },
  {
    id: "mostafa-kamel",
    name: "Mostafa Kamel",
    company: false,
    matterType: "Divorce & Custody",
    source: "Website inquiry",
    estValue: 40000,
    stage: "won",
    assignedTo: "Mona Farouk",
    createdLabel: "21 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "completed", date: "Fri, Jul 10", time: "11:00 AM" },
    notes: ["Signed engagement letter. Matter set up as a new case this week."],
    timeline: [
      { type: "stage", who: "Mona Farouk", text: "Lead created from website inquiry", time: "21d ago" },
      { type: "meeting", who: "Mona Farouk", text: "Consultation held, scope agreed", time: "18d ago" },
      { type: "email", who: "Mona Farouk", text: "Sent and countersigned engagement letter", time: "14d ago" },
      { type: "stage", who: "Mona Farouk", text: "Marked Won — matter opened", time: "13d ago" },
    ],
  },
  {
    id: "delta-pharma",
    name: "Delta Pharma Distributors",
    company: true,
    matterType: "Regulatory Compliance Review",
    source: "Industry event",
    estValue: 210000,
    stage: "lost",
    assignedTo: "Youssef Adel",
    createdLabel: "26 days ago",
    conflictStatus: "clear",
    conflictNote: "No matches against active or closed matters.",
    consultation: { status: "completed", date: "Wed, Jul 15", time: "3:00 PM" },
    notes: ["Went with a firm that already has a standing Cairo office presence."],
    lostReason: "Selected a competing firm with an existing Cairo office presence.",
    timeline: [
      { type: "stage", who: "Youssef Adel", text: "Lead created after meeting at a pharma industry conference", time: "26d ago" },
      { type: "meeting", who: "Youssef Adel", text: "Consultation held to scope the compliance review", time: "20d ago" },
      { type: "email", who: "Youssef Adel", text: "Sent proposal", time: "16d ago" },
      { type: "stage", who: "Youssef Adel", text: "Marked Lost — client chose a firm with a Cairo office", time: "10d ago" },
    ],
  },
];

export function getLead(id: string): Lead | undefined {
  return LEADS.find((lead) => lead.id === id);
}
