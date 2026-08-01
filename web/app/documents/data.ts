// Mock data for the Documents pillar — no documents backend exists yet.
// Shapes are illustrative sample content, not real firm records.

export type FileType = "pdf" | "docx" | "xlsx" | "img";
export type OcrStatus = "complete" | "processing" | null;
export type Sharing = "private" | "shared" | "firm-wide";

export type DocumentItem = {
  id: string;
  name: string;
  fileType: FileType;
  sizeLabel: string;
  modified: string;
  modifiedSort: string; // ISO for sorting/display consistency
  uploadedBy: string;
  matter?: string;
  folder: string;
  tags: string[];
  ocrStatus: OcrStatus;
  hasAiSummary: boolean;
  sharing: Sharing;
  sharedWithCount?: number;
  commentsCount: number;
};

export type FolderGroup = {
  title: string;
  folders: { id: string; label: string }[];
};

export const FOLDER_GROUPS: FolderGroup[] = [
  {
    title: "Firm-wide",
    folders: [
      { id: "templates", label: "Templates" },
      { id: "policies", label: "Firm Policies" },
      { id: "correspondence", label: "Correspondence" },
    ],
  },
  {
    title: "By matter & client",
    folders: [
      { id: "nile-trading", label: "Nile Trading Co." },
      { id: "delta-foods", label: "Delta Foods" },
      { id: "khalil-holdings", label: "Khalil Holdings" },
      { id: "al-amal-trading", label: "Al Amal Trading" },
      { id: "el-sayed-estate", label: "El-Sayed Estate" },
    ],
  },
];

export const DOCUMENTS: DocumentItem[] = [
  {
    id: "nda-delta-foods",
    name: "NDA — Delta Foods",
    fileType: "pdf",
    sizeLabel: "412 KB",
    modified: "Jul 29, 2026",
    modifiedSort: "2026-07-29",
    uploadedBy: "Mona Farouk",
    matter: "Delta Foods NDA",
    folder: "delta-foods",
    tags: ["NDA", "Contract"],
    ocrStatus: null,
    hasAiSummary: true,
    sharing: "shared",
    sharedWithCount: 3,
    commentsCount: 4,
  },
  {
    id: "settlement-nile-trading",
    name: "Settlement Agreement — Nile Trading",
    fileType: "pdf",
    sizeLabel: "268 KB",
    modified: "Jul 30, 2026",
    modifiedSort: "2026-07-30",
    uploadedBy: "Ahmed Al-Sayed",
    matter: "Nabil v. Nile Trading Co.",
    folder: "nile-trading",
    tags: ["Settlement", "Contract"],
    ocrStatus: null,
    hasAiSummary: true,
    sharing: "shared",
    sharedWithCount: 2,
    commentsCount: 2,
  },
  {
    id: "poa-khalil-holdings",
    name: "Power of Attorney — Khalil Holdings",
    fileType: "pdf",
    sizeLabel: "1.8 MB",
    modified: "Jul 27, 2026",
    modifiedSort: "2026-07-27",
    uploadedBy: "Layla Hassan",
    matter: "Khalil Holdings — Corporate Advisory",
    folder: "khalil-holdings",
    tags: ["Power of Attorney"],
    ocrStatus: "complete",
    hasAiSummary: false,
    sharing: "private",
    commentsCount: 0,
  },
  {
    id: "labour-contract-delta-draft",
    name: "Labour Contract Draft — Delta Foods",
    fileType: "docx",
    sizeLabel: "88 KB",
    modified: "Jul 25, 2026",
    modifiedSort: "2026-07-25",
    uploadedBy: "Youssef Adel",
    matter: "Delta Foods Labour Dispute",
    folder: "delta-foods",
    tags: ["Contract", "Draft"],
    ocrStatus: null,
    hasAiSummary: false,
    sharing: "private",
    commentsCount: 1,
  },
  {
    id: "court-filing-nabil-appeal",
    name: "Appeal Brief — Nabil v. Nile Trading",
    fileType: "pdf",
    sizeLabel: "2.1 MB",
    modified: "Jul 26, 2026",
    modifiedSort: "2026-07-26",
    uploadedBy: "Mona Farouk",
    matter: "Nabil v. Nile Trading Co.",
    folder: "nile-trading",
    tags: ["Court Filing"],
    ocrStatus: "processing",
    hasAiSummary: false,
    sharing: "firm-wide",
    commentsCount: 3,
  },
  {
    id: "estate-partition-filing",
    name: "El-Sayed Estate — Partition Filing",
    fileType: "pdf",
    sizeLabel: "540 KB",
    modified: "Jul 20, 2026",
    modifiedSort: "2026-07-20",
    uploadedBy: "Ahmed Al-Sayed",
    matter: "El-Sayed Estate Partition",
    folder: "el-sayed-estate",
    tags: ["Court Filing", "Family Law"],
    ocrStatus: "complete",
    hasAiSummary: true,
    sharing: "private",
    commentsCount: 0,
  },
  {
    id: "al-amal-tax-objection",
    name: "Tax Objection Submission — Al Amal Trading",
    fileType: "pdf",
    sizeLabel: "310 KB",
    modified: "Jul 22, 2026",
    modifiedSort: "2026-07-22",
    uploadedBy: "Youssef Adel",
    matter: "Al Amal Trading — Tax Advisory",
    folder: "al-amal-trading",
    tags: ["Tax", "Filing"],
    ocrStatus: null,
    hasAiSummary: false,
    sharing: "shared",
    sharedWithCount: 1,
    commentsCount: 1,
  },
  {
    id: "standard-nda-template",
    name: "Standard NDA Template (EN/AR)",
    fileType: "docx",
    sizeLabel: "54 KB",
    modified: "Jul 10, 2026",
    modifiedSort: "2026-07-10",
    uploadedBy: "Ahmed Al-Sayed",
    folder: "templates",
    tags: ["Template", "NDA"],
    ocrStatus: null,
    hasAiSummary: false,
    sharing: "firm-wide",
    commentsCount: 0,
  },
  {
    id: "engagement-letter-template",
    name: "Engagement Letter Template",
    fileType: "docx",
    sizeLabel: "42 KB",
    modified: "Jun 30, 2026",
    modifiedSort: "2026-06-30",
    uploadedBy: "Ahmed Al-Sayed",
    folder: "templates",
    tags: ["Template"],
    ocrStatus: null,
    hasAiSummary: false,
    sharing: "firm-wide",
    commentsCount: 0,
  },
  {
    id: "conflict-check-policy",
    name: "Conflict of Interest Check Procedure",
    fileType: "pdf",
    sizeLabel: "120 KB",
    modified: "Jun 12, 2026",
    modifiedSort: "2026-06-12",
    uploadedBy: "Ahmed Al-Sayed",
    folder: "policies",
    tags: ["Policy"],
    ocrStatus: null,
    hasAiSummary: false,
    sharing: "firm-wide",
    commentsCount: 0,
  },
  {
    id: "client-update-email-nile",
    name: "Client Update — Hearing Postponement (Nile Trading)",
    fileType: "docx",
    sizeLabel: "18 KB",
    modified: "Jul 18, 2026",
    modifiedSort: "2026-07-18",
    uploadedBy: "Mona Farouk",
    matter: "Nabil v. Nile Trading Co.",
    folder: "correspondence",
    tags: ["Correspondence"],
    ocrStatus: null,
    hasAiSummary: false,
    sharing: "private",
    commentsCount: 0,
  },
  {
    id: "khalil-registration-cert",
    name: "Commercial Registration Certificate — Khalil Holdings",
    fileType: "img",
    sizeLabel: "3.2 MB",
    modified: "Jul 5, 2026",
    modifiedSort: "2026-07-05",
    uploadedBy: "Layla Hassan",
    matter: "Khalil Holdings — Corporate Advisory",
    folder: "khalil-holdings",
    tags: ["Corporate"],
    ocrStatus: "complete",
    hasAiSummary: false,
    sharing: "private",
    commentsCount: 0,
  },
];

export type DocumentVersion = {
  version: number;
  label: string;
  uploadedBy: string;
  date: string;
  sizeLabel: string;
  note?: string;
};

export type DocumentComment = {
  id: string;
  author: string;
  text: string;
  time: string;
};

export const DOCUMENT_VERSIONS: Record<string, DocumentVersion[]> = {
  "nda-delta-foods": [
    { version: 3, label: "Version 3 (current)", uploadedBy: "Mona Farouk", date: "Jul 29, 2026", sizeLabel: "412 KB", note: "Incorporated Delta Foods' redline on the confidentiality term" },
    { version: 2, label: "Version 2", uploadedBy: "Ahmed Al-Sayed", date: "Jul 24, 2026", sizeLabel: "398 KB", note: "AI review pass — 2 clauses flagged" },
    { version: 1, label: "Version 1", uploadedBy: "Mona Farouk", date: "Jul 20, 2026", sizeLabel: "375 KB", note: "Initial draft from firm template" },
  ],
  "settlement-nile-trading": [
    { version: 2, label: "Version 2 (current)", uploadedBy: "Ahmed Al-Sayed", date: "Jul 30, 2026", sizeLabel: "268 KB", note: "Final terms after mediation session" },
    { version: 1, label: "Version 1", uploadedBy: "Ahmed Al-Sayed", date: "Jul 15, 2026", sizeLabel: "240 KB", note: "Initial settlement proposal" },
  ],
};

export const DOCUMENT_COMMENTS: Record<string, DocumentComment[]> = {
  "nda-delta-foods": [
    { id: "c1", author: "Ahmed Al-Sayed", text: "AI flagged the non-compete clause as broader than our standard template — can you tighten the geographic scope?", time: "2 days ago" },
    { id: "c2", author: "Mona Farouk", text: "Updated in v3. Also shortened the confidentiality term to 3 years to match Delta Foods' counter.", time: "1 day ago" },
    { id: "c3", author: "Youssef Adel", text: "Looks good from my side. Ready to send for signature once Ahmed confirms.", time: "18 hours ago" },
    { id: "c4", author: "Ahmed Al-Sayed", text: "Confirmed. Sending to Delta Foods today.", time: "6 hours ago" },
  ],
  "settlement-nile-trading": [
    { id: "c1", author: "Mona Farouk", text: "Client signed off on the settlement terms after this morning's call.", time: "3 hours ago" },
    { id: "c2", author: "Ahmed Al-Sayed", text: "Sent to opposing counsel for countersignature.", time: "1 hour ago" },
  ],
};

export function getDocument(id: string): DocumentItem | undefined {
  return DOCUMENTS.find((d) => d.id === id);
}

export function folderLabel(folderId?: string): string {
  if (!folderId) return "Unfiled";
  for (const group of FOLDER_GROUPS) {
    const match = group.folders.find((f) => f.id === folderId);
    if (match) return match.label;
  }
  return folderId;
}
