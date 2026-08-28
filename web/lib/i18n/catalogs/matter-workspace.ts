import type { Catalog } from "@astryxdesign/core/i18n";

// The matter workspace added in 0007: numbering, contacts, expenses, the
// communications log, the client portal, the client-funds ledger, custom
// fields and conflict checks.
//
// Kept apart from matters.ts, which already covers the list page and the
// original six tabs — one file holding both would be past the point where
// anyone can find a key in it.

export const en: Catalog = {
  // --- header and tabs ------------------------------------------------------
  "@legalos.matterWorkspace.action.edit": { defaultMessage: "Edit matter" },
  "@legalos.matterWorkspace.action.duplicate": { defaultMessage: "Duplicate" },
  "@legalos.matterWorkspace.action.share": { defaultMessage: "Share" },
  "@legalos.matterWorkspace.action.more": { defaultMessage: "More actions" },
  "@legalos.matterWorkspace.duplicate.namePrefix": {
    defaultMessage: "{name} (copy)",
  },

  "@legalos.matterWorkspace.tab.dashboard": { defaultMessage: "Dashboard" },
  "@legalos.matterWorkspace.tab.customFields": { defaultMessage: "Custom fields" },
  "@legalos.matterWorkspace.tab.activities": { defaultMessage: "Activities" },
  "@legalos.matterWorkspace.tab.calendar": { defaultMessage: "Calendar" },
  "@legalos.matterWorkspace.tab.communications": {
    defaultMessage: "Communications",
  },
  "@legalos.matterWorkspace.tab.bills": { defaultMessage: "Bills" },
  "@legalos.matterWorkspace.tab.transactions": { defaultMessage: "Transactions" },
  "@legalos.matterWorkspace.tab.connect": { defaultMessage: "Client portal" },

  // --- financial strip ------------------------------------------------------
  "@legalos.matterWorkspace.financial.heading": {
    defaultMessage: "Financial ({currency})",
  },
  "@legalos.matterWorkspace.financial.workInProgress": {
    defaultMessage: "Work in progress",
  },
  "@legalos.matterWorkspace.financial.workInProgress.hint": {
    defaultMessage: "Billable time and expenses not yet on an invoice",
  },
  "@legalos.matterWorkspace.financial.unbilledTime": { defaultMessage: "Time" },
  "@legalos.matterWorkspace.financial.unbilledExpenses": {
    defaultMessage: "Expenses",
  },
  "@legalos.matterWorkspace.financial.outstanding": {
    defaultMessage: "Outstanding balance",
  },
  "@legalos.matterWorkspace.financial.outstanding.hint": {
    defaultMessage: "Invoiced and not yet paid",
  },
  "@legalos.matterWorkspace.financial.overdue": { defaultMessage: "Overdue" },
  "@legalos.matterWorkspace.financial.clientFunds": {
    defaultMessage: "Client funds (matter)",
  },
  "@legalos.matterWorkspace.financial.clientFunds.hint": {
    defaultMessage: "Held on the client's behalf",
  },
  "@legalos.matterWorkspace.financial.quickBill": { defaultMessage: "Quick bill" },
  "@legalos.matterWorkspace.financial.viewBills": { defaultMessage: "View bills" },
  "@legalos.matterWorkspace.financial.recordDeposit": {
    defaultMessage: "Record deposit",
  },
  "@legalos.matterWorkspace.financial.addTime": { defaultMessage: "Add time" },
  "@legalos.matterWorkspace.financial.addExpense": {
    defaultMessage: "Add expense",
  },
  "@legalos.matterWorkspace.financial.nothingToBill": {
    defaultMessage: "Nothing unbilled on this matter yet.",
  },

  // --- details --------------------------------------------------------------
  "@legalos.matterWorkspace.details.heading": { defaultMessage: "Details" },
  "@legalos.matterWorkspace.details.matterNumber": {
    defaultMessage: "Matter number",
  },
  "@legalos.matterWorkspace.details.tags": { defaultMessage: "Tags" },
  "@legalos.matterWorkspace.details.noTags": { defaultMessage: "None" },
  "@legalos.matterWorkspace.details.noDescription": {
    defaultMessage: "No description recorded.",
  },

  // --- contacts panel -------------------------------------------------------
  "@legalos.matterWorkspace.contacts.heading": { defaultMessage: "Contacts" },
  "@legalos.matterWorkspace.contacts.clients": {
    defaultMessage: "Client ({count})",
  },
  "@legalos.matterWorkspace.contacts.related": {
    defaultMessage: "Related contacts ({count})",
  },
  "@legalos.matterWorkspace.contacts.billRecipient": {
    defaultMessage: "Bill recipient",
  },
  "@legalos.matterWorkspace.contacts.makeBillRecipient": {
    defaultMessage: "Make bill recipient",
  },
  "@legalos.matterWorkspace.contacts.add": { defaultMessage: "Add contact" },
  "@legalos.matterWorkspace.contacts.remove": { defaultMessage: "Remove" },
  "@legalos.matterWorkspace.contacts.empty": {
    defaultMessage: "No other parties recorded on this matter.",
  },
  "@legalos.matterWorkspace.contacts.form.heading": {
    defaultMessage: "Add a contact to this matter",
  },
  "@legalos.matterWorkspace.contacts.form.existing": {
    defaultMessage: "Contact on file",
  },
  "@legalos.matterWorkspace.contacts.form.external": {
    defaultMessage: "Someone else",
  },
  "@legalos.matterWorkspace.contacts.form.pick": {
    defaultMessage: "Choose a contact",
  },
  "@legalos.matterWorkspace.contacts.form.name": { defaultMessage: "Name" },
  "@legalos.matterWorkspace.contacts.form.relationship": {
    defaultMessage: "Relationship",
  },
  "@legalos.matterWorkspace.contacts.form.relationshipPlaceholder": {
    defaultMessage: "Opposing counsel, expert witness, court clerk…",
  },
  "@legalos.matterWorkspace.contacts.form.email": { defaultMessage: "Email" },
  "@legalos.matterWorkspace.contacts.form.phone": { defaultMessage: "Phone" },
  "@legalos.matterWorkspace.contacts.form.noneOnFile": {
    defaultMessage: "This client has no contacts on file yet.",
  },

  // --- conflict checks ------------------------------------------------------
  "@legalos.matterWorkspace.conflicts.heading": {
    defaultMessage: "Conflict checks",
  },
  "@legalos.matterWorkspace.conflicts.run": {
    defaultMessage: "Run conflict check",
  },
  "@legalos.matterWorkspace.conflicts.link": { defaultMessage: "Link check" },
  "@legalos.matterWorkspace.conflicts.empty": {
    defaultMessage: "No conflict checks associated with this matter.",
  },
  "@legalos.matterWorkspace.conflicts.terms.label": {
    defaultMessage: "Names to search for",
  },
  "@legalos.matterWorkspace.conflicts.terms.placeholder": {
    defaultMessage: "One name per line",
  },
  "@legalos.matterWorkspace.conflicts.terms.hint": {
    defaultMessage:
      "Searches this firm's clients, matter parties, opposing parties and counsel.",
  },
  "@legalos.matterWorkspace.conflicts.result.clear": { defaultMessage: "Clear" },
  "@legalos.matterWorkspace.conflicts.result.potential_conflict": {
    defaultMessage: "Potential conflict",
  },
  "@legalos.matterWorkspace.conflicts.result.conflict": {
    defaultMessage: "Conflict",
  },
  "@legalos.matterWorkspace.conflicts.hits": {
    defaultMessage: "{count, plural, one {# match} other {# matches}}",
  },
  "@legalos.matterWorkspace.conflicts.noHits": {
    defaultMessage: "No matching records",
  },
  "@legalos.matterWorkspace.conflicts.ranBy": {
    defaultMessage: "Run by {name} · {date}",
  },
  "@legalos.matterWorkspace.conflicts.clearedBy": {
    defaultMessage: "Decided by {name} · {date}",
  },
  "@legalos.matterWorkspace.conflicts.decide": { defaultMessage: "Record decision" },
  "@legalos.matterWorkspace.conflicts.decideHint": {
    defaultMessage:
      "The search flags name matches; whether they bar the engagement is your call.",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.client": {
    defaultMessage: "Existing client",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.matter_party": {
    defaultMessage: "Party on a matter",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.opposing_party": {
    defaultMessage: "Opposing party",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.opposing_counsel": {
    defaultMessage: "Opposing counsel",
  },

  // --- custom fields --------------------------------------------------------
  "@legalos.matterWorkspace.customFields.heading": {
    defaultMessage: "Custom fields",
  },
  "@legalos.matterWorkspace.customFields.manage": {
    defaultMessage: "Define a field",
  },
  "@legalos.matterWorkspace.customFields.emptyTitle": {
    defaultMessage: "No custom fields defined",
  },
  "@legalos.matterWorkspace.customFields.emptyDescription": {
    defaultMessage:
      "Define the things this firm tracks that the standard matter form does not.",
  },
  "@legalos.matterWorkspace.customFields.define.heading": {
    defaultMessage: "Define a custom field",
  },
  "@legalos.matterWorkspace.customFields.define.key": {
    defaultMessage: "Field key",
  },
  "@legalos.matterWorkspace.customFields.define.keyHint": {
    defaultMessage: "Lowercase letters, numbers and underscores. Cannot be changed.",
  },
  "@legalos.matterWorkspace.customFields.define.label": { defaultMessage: "Label" },
  "@legalos.matterWorkspace.customFields.define.type": { defaultMessage: "Type" },
  "@legalos.matterWorkspace.customFields.define.options": {
    defaultMessage: "Choices",
  },
  "@legalos.matterWorkspace.customFields.define.optionsPlaceholder": {
    defaultMessage: "One choice per line",
  },
  "@legalos.matterWorkspace.customFields.define.required": {
    defaultMessage: "Required",
  },
  "@legalos.matterWorkspace.customFields.define.appliesTo": {
    defaultMessage: "Applies to",
  },
  "@legalos.matterWorkspace.customFields.define.allTypes": {
    defaultMessage: "Every matter type",
  },
  "@legalos.matterWorkspace.customFields.type.text": { defaultMessage: "Text" },
  "@legalos.matterWorkspace.customFields.type.number": { defaultMessage: "Number" },
  "@legalos.matterWorkspace.customFields.type.date": { defaultMessage: "Date" },
  "@legalos.matterWorkspace.customFields.type.checkbox": {
    defaultMessage: "Yes / no",
  },
  "@legalos.matterWorkspace.customFields.type.select": {
    defaultMessage: "Choice list",
  },
  "@legalos.matterWorkspace.customFields.notSet": { defaultMessage: "Not set" },
  "@legalos.matterWorkspace.customFields.yes": { defaultMessage: "Yes" },
  "@legalos.matterWorkspace.customFields.no": { defaultMessage: "No" },
  "@legalos.matterWorkspace.customFields.requiredTag": {
    defaultMessage: "Required",
  },
  "@legalos.matterWorkspace.customFields.deleteField": {
    defaultMessage: "Delete field",
  },

  // --- activities (time + expenses) ----------------------------------------
  "@legalos.matterWorkspace.activities.heading": { defaultMessage: "Activities" },
  "@legalos.matterWorkspace.activities.filter.all": { defaultMessage: "All" },
  "@legalos.matterWorkspace.activities.filter.time": { defaultMessage: "Time" },
  "@legalos.matterWorkspace.activities.filter.expenses": {
    defaultMessage: "Expenses",
  },
  "@legalos.matterWorkspace.activities.emptyTitle": {
    defaultMessage: "No activity recorded",
  },
  "@legalos.matterWorkspace.activities.emptyDescription": {
    defaultMessage: "Log time and expenses here as work is done on the matter.",
  },
  "@legalos.matterWorkspace.activities.billed": { defaultMessage: "Billed" },
  "@legalos.matterWorkspace.activities.nonBillable": {
    defaultMessage: "Non-billable",
  },
  "@legalos.matterWorkspace.activities.time.heading": { defaultMessage: "Add time" },
  "@legalos.matterWorkspace.activities.time.hours": { defaultMessage: "Hours" },
  "@legalos.matterWorkspace.activities.time.rate": { defaultMessage: "Rate" },
  "@legalos.matterWorkspace.activities.expense.heading": {
    defaultMessage: "Add expense",
  },
  "@legalos.matterWorkspace.activities.expense.category": {
    defaultMessage: "Category",
  },
  "@legalos.matterWorkspace.activities.expense.quantity": {
    defaultMessage: "Quantity",
  },
  "@legalos.matterWorkspace.activities.expense.unitAmount": {
    defaultMessage: "Unit amount",
  },
  "@legalos.matterWorkspace.activities.field.date": { defaultMessage: "Date" },
  "@legalos.matterWorkspace.activities.field.description": {
    defaultMessage: "Description",
  },
  "@legalos.matterWorkspace.activities.field.billable": {
    defaultMessage: "Billable",
  },
  "@legalos.matterWorkspace.expenseCategory.court_fees": {
    defaultMessage: "Court fees",
  },
  "@legalos.matterWorkspace.expenseCategory.filing": { defaultMessage: "Filing" },
  "@legalos.matterWorkspace.expenseCategory.expert": {
    defaultMessage: "Expert fees",
  },
  "@legalos.matterWorkspace.expenseCategory.travel": { defaultMessage: "Travel" },
  "@legalos.matterWorkspace.expenseCategory.translation": {
    defaultMessage: "Translation",
  },
  "@legalos.matterWorkspace.expenseCategory.courier": { defaultMessage: "Courier" },
  "@legalos.matterWorkspace.expenseCategory.other": { defaultMessage: "Other" },

  // --- calendar -------------------------------------------------------------
  "@legalos.matterWorkspace.calendar.heading": { defaultMessage: "Calendar" },
  "@legalos.matterWorkspace.calendar.upcoming": { defaultMessage: "Upcoming" },
  "@legalos.matterWorkspace.calendar.past": { defaultMessage: "Past" },
  "@legalos.matterWorkspace.calendar.emptyTitle": {
    defaultMessage: "Nothing scheduled",
  },
  "@legalos.matterWorkspace.calendar.emptyDescription": {
    defaultMessage:
      "Hearings, case deadlines and task due dates on this matter appear here.",
  },
  "@legalos.matterWorkspace.calendar.kind.hearing": { defaultMessage: "Hearing" },
  "@legalos.matterWorkspace.calendar.kind.deadline": { defaultMessage: "Deadline" },
  "@legalos.matterWorkspace.calendar.kind.task": { defaultMessage: "Task" },
  "@legalos.matterWorkspace.calendar.overdue": { defaultMessage: "Overdue" },
  "@legalos.matterWorkspace.calendar.today": { defaultMessage: "Today" },
  "@legalos.matterWorkspace.calendar.inDays": {
    defaultMessage: "in {count, plural, one {# day} other {# days}}",
  },

  // --- communications -------------------------------------------------------
  "@legalos.matterWorkspace.comms.sub.logs": { defaultMessage: "Logs" },
  "@legalos.matterWorkspace.comms.sub.messages": {
    defaultMessage: "Secure messages",
  },
  "@legalos.matterWorkspace.comms.sub.portals": {
    defaultMessage: "Client portals",
  },

  "@legalos.matterWorkspace.comms.logs.new": { defaultMessage: "Log a communication" },
  "@legalos.matterWorkspace.comms.logs.emptyTitle": {
    defaultMessage: "No phone or email logs found",
  },
  "@legalos.matterWorkspace.comms.logs.emptyDescription": {
    defaultMessage:
      "Record the calls, emails and meetings on this matter so the account of what the client was told survives.",
  },
  "@legalos.matterWorkspace.comms.logs.search": { defaultMessage: "Filter by subject or body" },
  "@legalos.matterWorkspace.comms.logs.duration": {
    defaultMessage: "{count, plural, one {# min} other {# min}}",
  },
  "@legalos.matterWorkspace.comms.channel.all": { defaultMessage: "All" },
  "@legalos.matterWorkspace.comms.channel.phone": { defaultMessage: "Phone" },
  "@legalos.matterWorkspace.comms.channel.email": { defaultMessage: "Email" },
  "@legalos.matterWorkspace.comms.channel.meeting": { defaultMessage: "Meeting" },
  "@legalos.matterWorkspace.comms.channel.letter": { defaultMessage: "Letter" },
  "@legalos.matterWorkspace.comms.direction.incoming": { defaultMessage: "Incoming" },
  "@legalos.matterWorkspace.comms.direction.outgoing": { defaultMessage: "Outgoing" },
  "@legalos.matterWorkspace.comms.form.channel": { defaultMessage: "Channel" },
  "@legalos.matterWorkspace.comms.form.direction": { defaultMessage: "Direction" },
  "@legalos.matterWorkspace.comms.form.subject": { defaultMessage: "Subject" },
  "@legalos.matterWorkspace.comms.form.body": { defaultMessage: "Notes" },
  "@legalos.matterWorkspace.comms.form.counterparty": {
    defaultMessage: "Who was on the other end",
  },
  "@legalos.matterWorkspace.comms.form.occurredAt": { defaultMessage: "When" },
  "@legalos.matterWorkspace.comms.form.duration": {
    defaultMessage: "Duration (minutes)",
  },

  "@legalos.matterWorkspace.comms.messages.new": { defaultMessage: "New message" },
  "@legalos.matterWorkspace.comms.messages.emptyTitle": {
    defaultMessage: "No secure messages",
  },
  "@legalos.matterWorkspace.comms.messages.emptyDescription": {
    defaultMessage:
      "Start a thread to exchange messages with the client inside the product rather than over email.",
  },
  "@legalos.matterWorkspace.comms.messages.subject": { defaultMessage: "Subject" },
  "@legalos.matterWorkspace.comms.messages.firstMessage": {
    defaultMessage: "Message",
  },
  "@legalos.matterWorkspace.comms.messages.reply": {
    defaultMessage: "Write a reply…",
  },
  "@legalos.matterWorkspace.comms.messages.send": { defaultMessage: "Send" },
  "@legalos.matterWorkspace.comms.messages.start": { defaultMessage: "Start thread" },
  "@legalos.matterWorkspace.comms.messages.unread": {
    defaultMessage: "{count, plural, one {# unread} other {# unread}}",
  },
  "@legalos.matterWorkspace.comms.messages.markRead": {
    defaultMessage: "Mark read",
  },
  "@legalos.matterWorkspace.comms.messages.count": {
    defaultMessage: "{count, plural, one {# message} other {# messages}}",
  },
  "@legalos.matterWorkspace.comms.messages.client": { defaultMessage: "Client" },
  "@legalos.matterWorkspace.comms.messages.sendTo": { defaultMessage: "Send to" },
  "@legalos.matterWorkspace.comms.messages.noPortal": {
    defaultMessage: "Internal thread (no portal)",
  },

  "@legalos.matterWorkspace.comms.portals.invite": {
    defaultMessage: "Invite to portal",
  },
  "@legalos.matterWorkspace.comms.portals.emptyTitle": {
    defaultMessage: "No portal access granted",
  },
  "@legalos.matterWorkspace.comms.portals.emptyDescription": {
    defaultMessage:
      "Give a named client contact access to this matter's documents, bills and messages.",
  },
  "@legalos.matterWorkspace.comms.portals.status.invited": {
    defaultMessage: "Invited",
  },
  "@legalos.matterWorkspace.comms.portals.status.active": {
    defaultMessage: "Active",
  },
  "@legalos.matterWorkspace.comms.portals.status.revoked": {
    defaultMessage: "Revoked",
  },
  "@legalos.matterWorkspace.comms.portals.canViewDocuments": {
    defaultMessage: "Documents",
  },
  "@legalos.matterWorkspace.comms.portals.canViewBills": { defaultMessage: "Bills" },
  "@legalos.matterWorkspace.comms.portals.canMessage": {
    defaultMessage: "Messages",
  },
  "@legalos.matterWorkspace.comms.portals.revoke": { defaultMessage: "Revoke" },
  "@legalos.matterWorkspace.comms.portals.activate": { defaultMessage: "Activate" },
  "@legalos.matterWorkspace.comms.portals.reinvite": { defaultMessage: "Re-invite" },
  "@legalos.matterWorkspace.comms.portals.invitedOn": {
    defaultMessage: "Invited {date}",
  },
  "@legalos.matterWorkspace.comms.portals.lastActive": {
    defaultMessage: "Last active {date}",
  },
  "@legalos.matterWorkspace.comms.portals.neverActive": {
    defaultMessage: "Has not signed in yet",
  },
  "@legalos.matterWorkspace.comms.portals.noContacts": {
    defaultMessage:
      "Add a contact to this client before granting portal access.",
  },

  // --- bills ----------------------------------------------------------------
  "@legalos.matterWorkspace.bills.heading": { defaultMessage: "Bills" },
  "@legalos.matterWorkspace.bills.emptyTitle": { defaultMessage: "No bills yet" },
  "@legalos.matterWorkspace.bills.emptyDescription": {
    defaultMessage:
      "Draft a bill from the matter's unbilled time and expenses with Quick bill.",
  },
  "@legalos.matterWorkspace.bills.issued": { defaultMessage: "Issued {date}" },
  "@legalos.matterWorkspace.bills.due": { defaultMessage: "Due {date}" },
  "@legalos.matterWorkspace.bills.paid": { defaultMessage: "Paid {date}" },
  "@legalos.matterWorkspace.bills.payFromFunds": {
    defaultMessage: "Pay from client funds",
  },
  "@legalos.matterWorkspace.bills.paymentTerms": {
    defaultMessage: "Payment terms (days)",
  },

  // --- transactions ---------------------------------------------------------
  "@legalos.matterWorkspace.transactions.heading": {
    defaultMessage: "Client funds",
  },
  "@legalos.matterWorkspace.transactions.balance": { defaultMessage: "Balance" },
  "@legalos.matterWorkspace.transactions.deposits": { defaultMessage: "Deposited" },
  "@legalos.matterWorkspace.transactions.disbursed": { defaultMessage: "Disbursed" },
  "@legalos.matterWorkspace.transactions.record": {
    defaultMessage: "Record transaction",
  },
  "@legalos.matterWorkspace.transactions.emptyTitle": {
    defaultMessage: "No client funds held",
  },
  "@legalos.matterWorkspace.transactions.emptyDescription": {
    defaultMessage:
      "Retainers and other money held on the client's behalf are recorded here and drawn down against bills.",
  },
  "@legalos.matterWorkspace.transactions.kind.deposit": { defaultMessage: "Deposit" },
  "@legalos.matterWorkspace.transactions.kind.withdrawal": {
    defaultMessage: "Withdrawal",
  },
  "@legalos.matterWorkspace.transactions.kind.invoice_payment": {
    defaultMessage: "Invoice payment",
  },
  "@legalos.matterWorkspace.transactions.kind.refund": { defaultMessage: "Refund" },
  "@legalos.matterWorkspace.transactions.form.kind": { defaultMessage: "Type" },
  "@legalos.matterWorkspace.transactions.form.amount": { defaultMessage: "Amount" },
  "@legalos.matterWorkspace.transactions.form.date": { defaultMessage: "Date" },
  "@legalos.matterWorkspace.transactions.form.description": {
    defaultMessage: "Description",
  },
  "@legalos.matterWorkspace.transactions.form.reference": {
    defaultMessage: "Reference",
  },
  "@legalos.matterWorkspace.transactions.form.referencePlaceholder": {
    defaultMessage: "Cheque or transfer number",
  },
  "@legalos.matterWorkspace.transactions.form.invoice": {
    defaultMessage: "Against invoice",
  },
  "@legalos.matterWorkspace.transactions.form.account": {
    defaultMessage: "Client account",
  },
  "@legalos.matterWorkspace.transactions.noAccountTitle": {
    defaultMessage: "No client-funds account",
  },
  "@legalos.matterWorkspace.transactions.noAccountDescription": {
    defaultMessage:
      "Client money is held separately from the firm's own. An owner must open the account before funds can be recorded.",
  },
  "@legalos.matterWorkspace.transactions.openAccount": {
    defaultMessage: "Open a client-funds account",
  },
  "@legalos.matterWorkspace.transactions.account.name": {
    defaultMessage: "Account name",
  },
  "@legalos.matterWorkspace.transactions.account.bank": { defaultMessage: "Bank" },
  "@legalos.matterWorkspace.transactions.account.number": {
    defaultMessage: "Account number",
  },
  "@legalos.matterWorkspace.transactions.ownerOnly": {
    defaultMessage: "Only an owner can open a client-funds account.",
  },
  "@legalos.matterWorkspace.transactions.staffOnly": {
    defaultMessage: "Only an owner or staff can move client funds.",
  },

  // --- shared actions and errors -------------------------------------------
  "@legalos.matterWorkspace.action.cancel": { defaultMessage: "Cancel" },
  "@legalos.matterWorkspace.action.save": { defaultMessage: "Save" },
  "@legalos.matterWorkspace.action.saving": { defaultMessage: "Saving…" },
  "@legalos.matterWorkspace.action.add": { defaultMessage: "Add" },

  "@legalos.matterWorkspace.errors.contact": {
    defaultMessage: "Could not save that contact.",
  },
  "@legalos.matterWorkspace.errors.expense": {
    defaultMessage: "Could not save that expense.",
  },
  "@legalos.matterWorkspace.errors.time": {
    defaultMessage: "Could not save that time entry.",
  },
  "@legalos.matterWorkspace.errors.communication": {
    defaultMessage: "Could not save that communication.",
  },
  "@legalos.matterWorkspace.errors.portal": {
    defaultMessage: "Could not update portal access.",
  },
  "@legalos.matterWorkspace.errors.message": {
    defaultMessage: "Could not send that message.",
  },
  "@legalos.matterWorkspace.errors.trust": {
    defaultMessage: "Could not record that transaction.",
  },
  "@legalos.matterWorkspace.errors.customField": {
    defaultMessage: "Could not save that field.",
  },
  "@legalos.matterWorkspace.errors.conflict": {
    defaultMessage: "Could not run that conflict check.",
  },
  "@legalos.matterWorkspace.errors.bill": {
    defaultMessage: "Could not draft that bill.",
  },
  "@legalos.matterWorkspace.errors.duplicate": {
    defaultMessage: "Could not duplicate this matter.",
  },
};

export const ar: Catalog = {
  // --- header and tabs ------------------------------------------------------
  "@legalos.matterWorkspace.action.edit": { defaultMessage: "تعديل الملف" },
  "@legalos.matterWorkspace.action.duplicate": { defaultMessage: "نسخ" },
  "@legalos.matterWorkspace.action.share": { defaultMessage: "مشاركة" },
  "@legalos.matterWorkspace.action.more": { defaultMessage: "إجراءات أخرى" },
  "@legalos.matterWorkspace.duplicate.namePrefix": {
    defaultMessage: "{name} (نسخة)",
  },

  "@legalos.matterWorkspace.tab.dashboard": { defaultMessage: "لوحة الملف" },
  "@legalos.matterWorkspace.tab.customFields": { defaultMessage: "حقول مخصصة" },
  "@legalos.matterWorkspace.tab.activities": { defaultMessage: "الأنشطة" },
  "@legalos.matterWorkspace.tab.calendar": { defaultMessage: "التقويم" },
  "@legalos.matterWorkspace.tab.communications": { defaultMessage: "المراسلات" },
  "@legalos.matterWorkspace.tab.bills": { defaultMessage: "الفواتير" },
  "@legalos.matterWorkspace.tab.transactions": { defaultMessage: "الحركات المالية" },
  "@legalos.matterWorkspace.tab.connect": { defaultMessage: "بوابة الموكّل" },

  // --- financial strip ------------------------------------------------------
  "@legalos.matterWorkspace.financial.heading": {
    defaultMessage: "المالية ({currency})",
  },
  "@legalos.matterWorkspace.financial.workInProgress": {
    defaultMessage: "أعمال تحت التنفيذ",
  },
  "@legalos.matterWorkspace.financial.workInProgress.hint": {
    defaultMessage: "وقت ومصروفات قابلة للفوترة ولم تُدرج في فاتورة بعد",
  },
  "@legalos.matterWorkspace.financial.unbilledTime": { defaultMessage: "الوقت" },
  "@legalos.matterWorkspace.financial.unbilledExpenses": {
    defaultMessage: "المصروفات",
  },
  "@legalos.matterWorkspace.financial.outstanding": {
    defaultMessage: "الرصيد المستحق",
  },
  "@legalos.matterWorkspace.financial.outstanding.hint": {
    defaultMessage: "صدرت فواتيره ولم يُسدَّد بعد",
  },
  "@legalos.matterWorkspace.financial.overdue": { defaultMessage: "متأخر" },
  "@legalos.matterWorkspace.financial.clientFunds": {
    defaultMessage: "أموال الموكّل (الملف)",
  },
  "@legalos.matterWorkspace.financial.clientFunds.hint": {
    defaultMessage: "محفوظة لحساب الموكّل",
  },
  "@legalos.matterWorkspace.financial.quickBill": { defaultMessage: "فاتورة سريعة" },
  "@legalos.matterWorkspace.financial.viewBills": { defaultMessage: "عرض الفواتير" },
  "@legalos.matterWorkspace.financial.recordDeposit": { defaultMessage: "تسجيل إيداع" },
  "@legalos.matterWorkspace.financial.addTime": { defaultMessage: "إضافة وقت" },
  "@legalos.matterWorkspace.financial.addExpense": { defaultMessage: "إضافة مصروف" },
  "@legalos.matterWorkspace.financial.nothingToBill": {
    defaultMessage: "لا يوجد ما يمكن فوترته على هذا الملف بعد.",
  },

  // --- details --------------------------------------------------------------
  "@legalos.matterWorkspace.details.heading": { defaultMessage: "التفاصيل" },
  "@legalos.matterWorkspace.details.matterNumber": { defaultMessage: "رقم الملف" },
  "@legalos.matterWorkspace.details.tags": { defaultMessage: "الوسوم" },
  "@legalos.matterWorkspace.details.noTags": { defaultMessage: "لا يوجد" },
  "@legalos.matterWorkspace.details.noDescription": {
    defaultMessage: "لا يوجد وصف مسجَّل.",
  },

  // --- contacts panel -------------------------------------------------------
  "@legalos.matterWorkspace.contacts.heading": { defaultMessage: "جهات الاتصال" },
  "@legalos.matterWorkspace.contacts.clients": { defaultMessage: "الموكّل ({count})" },
  "@legalos.matterWorkspace.contacts.related": {
    defaultMessage: "جهات اتصال ذات صلة ({count})",
  },
  "@legalos.matterWorkspace.contacts.billRecipient": {
    defaultMessage: "مستلم الفاتورة",
  },
  "@legalos.matterWorkspace.contacts.makeBillRecipient": {
    defaultMessage: "تعيينه مستلمًا للفاتورة",
  },
  "@legalos.matterWorkspace.contacts.add": { defaultMessage: "إضافة جهة اتصال" },
  "@legalos.matterWorkspace.contacts.remove": { defaultMessage: "إزالة" },
  "@legalos.matterWorkspace.contacts.empty": {
    defaultMessage: "لا توجد أطراف أخرى مسجَّلة على هذا الملف.",
  },
  "@legalos.matterWorkspace.contacts.form.heading": {
    defaultMessage: "إضافة جهة اتصال إلى هذا الملف",
  },
  "@legalos.matterWorkspace.contacts.form.existing": {
    defaultMessage: "جهة اتصال مسجَّلة",
  },
  "@legalos.matterWorkspace.contacts.form.external": { defaultMessage: "شخص آخر" },
  "@legalos.matterWorkspace.contacts.form.pick": { defaultMessage: "اختر جهة اتصال" },
  "@legalos.matterWorkspace.contacts.form.name": { defaultMessage: "الاسم" },
  "@legalos.matterWorkspace.contacts.form.relationship": { defaultMessage: "الصفة" },
  "@legalos.matterWorkspace.contacts.form.relationshipPlaceholder": {
    defaultMessage: "محامي الخصم، خبير، كاتب المحكمة…",
  },
  "@legalos.matterWorkspace.contacts.form.email": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.matterWorkspace.contacts.form.phone": { defaultMessage: "الهاتف" },
  "@legalos.matterWorkspace.contacts.form.noneOnFile": {
    defaultMessage: "لا توجد جهات اتصال مسجَّلة لهذا الموكّل بعد.",
  },

  // --- conflict checks ------------------------------------------------------
  "@legalos.matterWorkspace.conflicts.heading": { defaultMessage: "فحص تعارض المصالح" },
  "@legalos.matterWorkspace.conflicts.run": { defaultMessage: "تشغيل فحص التعارض" },
  "@legalos.matterWorkspace.conflicts.link": { defaultMessage: "ربط فحص" },
  "@legalos.matterWorkspace.conflicts.empty": {
    defaultMessage: "لا توجد فحوص تعارض مرتبطة بهذا الملف.",
  },
  "@legalos.matterWorkspace.conflicts.terms.label": {
    defaultMessage: "الأسماء المطلوب البحث عنها",
  },
  "@legalos.matterWorkspace.conflicts.terms.placeholder": {
    defaultMessage: "اسم واحد في كل سطر",
  },
  "@legalos.matterWorkspace.conflicts.terms.hint": {
    defaultMessage: "يبحث في موكّلين المكتب وأطراف الملفات والخصوم ومحاميهم.",
  },
  "@legalos.matterWorkspace.conflicts.result.clear": { defaultMessage: "لا تعارض" },
  "@legalos.matterWorkspace.conflicts.result.potential_conflict": {
    defaultMessage: "تعارض محتمل",
  },
  "@legalos.matterWorkspace.conflicts.result.conflict": { defaultMessage: "تعارض" },
  "@legalos.matterWorkspace.conflicts.hits": {
    defaultMessage: "{count, plural, one {تطابق واحد} other {# تطابقات}}",
  },
  "@legalos.matterWorkspace.conflicts.noHits": { defaultMessage: "لا توجد سجلات مطابقة" },
  "@legalos.matterWorkspace.conflicts.ranBy": {
    defaultMessage: "أجراه {name} · {date}",
  },
  "@legalos.matterWorkspace.conflicts.clearedBy": {
    defaultMessage: "قرَّره {name} · {date}",
  },
  "@legalos.matterWorkspace.conflicts.decide": { defaultMessage: "تسجيل القرار" },
  "@legalos.matterWorkspace.conflicts.decideHint": {
    defaultMessage: "البحث يرصد تطابق الأسماء؛ وتقدير أثرها على قبول الملف قرارك أنت.",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.client": { defaultMessage: "موكّل قائم" },
  "@legalos.matterWorkspace.conflicts.hitKind.matter_party": {
    defaultMessage: "طرف في ملف",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.opposing_party": {
    defaultMessage: "الطرف الخصم",
  },
  "@legalos.matterWorkspace.conflicts.hitKind.opposing_counsel": {
    defaultMessage: "محامي الخصم",
  },

  // --- custom fields --------------------------------------------------------
  "@legalos.matterWorkspace.customFields.heading": { defaultMessage: "الحقول المخصصة" },
  "@legalos.matterWorkspace.customFields.manage": { defaultMessage: "تعريف حقل" },
  "@legalos.matterWorkspace.customFields.emptyTitle": {
    defaultMessage: "لا توجد حقول مخصصة",
  },
  "@legalos.matterWorkspace.customFields.emptyDescription": {
    defaultMessage: "عرِّف ما يتابعه المكتب مما لا تغطيه بيانات الملف القياسية.",
  },
  "@legalos.matterWorkspace.customFields.define.heading": {
    defaultMessage: "تعريف حقل مخصص",
  },
  "@legalos.matterWorkspace.customFields.define.key": { defaultMessage: "مفتاح الحقل" },
  "@legalos.matterWorkspace.customFields.define.keyHint": {
    defaultMessage: "حروف لاتينية صغيرة وأرقام وشرطة سفلية. لا يمكن تغييره لاحقًا.",
  },
  "@legalos.matterWorkspace.customFields.define.label": { defaultMessage: "التسمية" },
  "@legalos.matterWorkspace.customFields.define.type": { defaultMessage: "النوع" },
  "@legalos.matterWorkspace.customFields.define.options": { defaultMessage: "الخيارات" },
  "@legalos.matterWorkspace.customFields.define.optionsPlaceholder": {
    defaultMessage: "خيار واحد في كل سطر",
  },
  "@legalos.matterWorkspace.customFields.define.required": { defaultMessage: "إلزامي" },
  "@legalos.matterWorkspace.customFields.define.appliesTo": { defaultMessage: "ينطبق على" },
  "@legalos.matterWorkspace.customFields.define.allTypes": {
    defaultMessage: "كل أنواع الملفات",
  },
  "@legalos.matterWorkspace.customFields.type.text": { defaultMessage: "نص" },
  "@legalos.matterWorkspace.customFields.type.number": { defaultMessage: "رقم" },
  "@legalos.matterWorkspace.customFields.type.date": { defaultMessage: "تاريخ" },
  "@legalos.matterWorkspace.customFields.type.checkbox": { defaultMessage: "نعم / لا" },
  "@legalos.matterWorkspace.customFields.type.select": { defaultMessage: "قائمة اختيار" },
  "@legalos.matterWorkspace.customFields.notSet": { defaultMessage: "غير محدَّد" },
  "@legalos.matterWorkspace.customFields.yes": { defaultMessage: "نعم" },
  "@legalos.matterWorkspace.customFields.no": { defaultMessage: "لا" },
  "@legalos.matterWorkspace.customFields.requiredTag": { defaultMessage: "إلزامي" },
  "@legalos.matterWorkspace.customFields.deleteField": { defaultMessage: "حذف الحقل" },

  // --- activities -----------------------------------------------------------
  "@legalos.matterWorkspace.activities.heading": { defaultMessage: "الأنشطة" },
  "@legalos.matterWorkspace.activities.filter.all": { defaultMessage: "الكل" },
  "@legalos.matterWorkspace.activities.filter.time": { defaultMessage: "الوقت" },
  "@legalos.matterWorkspace.activities.filter.expenses": { defaultMessage: "المصروفات" },
  "@legalos.matterWorkspace.activities.emptyTitle": { defaultMessage: "لا توجد أنشطة مسجَّلة" },
  "@legalos.matterWorkspace.activities.emptyDescription": {
    defaultMessage: "سجِّل هنا الوقت والمصروفات مع سير العمل على الملف.",
  },
  "@legalos.matterWorkspace.activities.billed": { defaultMessage: "مفوتَر" },
  "@legalos.matterWorkspace.activities.nonBillable": {
    defaultMessage: "غير قابل للفوترة",
  },
  "@legalos.matterWorkspace.activities.time.heading": { defaultMessage: "إضافة وقت" },
  "@legalos.matterWorkspace.activities.time.hours": { defaultMessage: "الساعات" },
  "@legalos.matterWorkspace.activities.time.rate": { defaultMessage: "السعر" },
  "@legalos.matterWorkspace.activities.expense.heading": { defaultMessage: "إضافة مصروف" },
  "@legalos.matterWorkspace.activities.expense.category": { defaultMessage: "الفئة" },
  "@legalos.matterWorkspace.activities.expense.quantity": { defaultMessage: "الكمية" },
  "@legalos.matterWorkspace.activities.expense.unitAmount": {
    defaultMessage: "قيمة الوحدة",
  },
  "@legalos.matterWorkspace.activities.field.date": { defaultMessage: "التاريخ" },
  "@legalos.matterWorkspace.activities.field.description": { defaultMessage: "الوصف" },
  "@legalos.matterWorkspace.activities.field.billable": {
    defaultMessage: "قابل للفوترة",
  },
  "@legalos.matterWorkspace.expenseCategory.court_fees": { defaultMessage: "رسوم قضائية" },
  "@legalos.matterWorkspace.expenseCategory.filing": { defaultMessage: "رسوم قيد" },
  "@legalos.matterWorkspace.expenseCategory.expert": { defaultMessage: "أتعاب خبير" },
  "@legalos.matterWorkspace.expenseCategory.travel": { defaultMessage: "سفر وانتقالات" },
  "@legalos.matterWorkspace.expenseCategory.translation": { defaultMessage: "ترجمة" },
  "@legalos.matterWorkspace.expenseCategory.courier": { defaultMessage: "بريد وشحن" },
  "@legalos.matterWorkspace.expenseCategory.other": { defaultMessage: "أخرى" },

  // --- calendar -------------------------------------------------------------
  "@legalos.matterWorkspace.calendar.heading": { defaultMessage: "التقويم" },
  "@legalos.matterWorkspace.calendar.upcoming": { defaultMessage: "القادم" },
  "@legalos.matterWorkspace.calendar.past": { defaultMessage: "السابق" },
  "@legalos.matterWorkspace.calendar.emptyTitle": { defaultMessage: "لا يوجد شيء مجدول" },
  "@legalos.matterWorkspace.calendar.emptyDescription": {
    defaultMessage: "تظهر هنا جلسات هذا الملف ومواعيده النهائية وتواريخ استحقاق مهامه.",
  },
  "@legalos.matterWorkspace.calendar.kind.hearing": { defaultMessage: "جلسة" },
  "@legalos.matterWorkspace.calendar.kind.deadline": { defaultMessage: "موعد نهائي" },
  "@legalos.matterWorkspace.calendar.kind.task": { defaultMessage: "مهمة" },
  "@legalos.matterWorkspace.calendar.overdue": { defaultMessage: "متأخر" },
  "@legalos.matterWorkspace.calendar.today": { defaultMessage: "اليوم" },
  "@legalos.matterWorkspace.calendar.inDays": {
    defaultMessage: "خلال {count, plural, one {يوم} other {# أيام}}",
  },

  // --- communications -------------------------------------------------------
  "@legalos.matterWorkspace.comms.sub.logs": { defaultMessage: "السجلات" },
  "@legalos.matterWorkspace.comms.sub.messages": { defaultMessage: "رسائل آمنة" },
  "@legalos.matterWorkspace.comms.sub.portals": { defaultMessage: "بوابات الموكّلين" },

  "@legalos.matterWorkspace.comms.logs.new": { defaultMessage: "تسجيل مراسلة" },
  "@legalos.matterWorkspace.comms.logs.emptyTitle": {
    defaultMessage: "لا توجد سجلات هاتف أو بريد",
  },
  "@legalos.matterWorkspace.comms.logs.emptyDescription": {
    defaultMessage:
      "سجِّل المكالمات والرسائل والاجتماعات على هذا الملف ليبقى ما أُبلغ به الموكّل موثَّقًا.",
  },
  "@legalos.matterWorkspace.comms.logs.search": { defaultMessage: "بحث في الموضوع أو النص" },
  "@legalos.matterWorkspace.comms.logs.duration": {
    defaultMessage: "{count, plural, one {دقيقة} other {# دقيقة}}",
  },
  "@legalos.matterWorkspace.comms.channel.all": { defaultMessage: "الكل" },
  "@legalos.matterWorkspace.comms.channel.phone": { defaultMessage: "هاتف" },
  "@legalos.matterWorkspace.comms.channel.email": { defaultMessage: "بريد إلكتروني" },
  "@legalos.matterWorkspace.comms.channel.meeting": { defaultMessage: "اجتماع" },
  "@legalos.matterWorkspace.comms.channel.letter": { defaultMessage: "خطاب" },
  "@legalos.matterWorkspace.comms.direction.incoming": { defaultMessage: "وارد" },
  "@legalos.matterWorkspace.comms.direction.outgoing": { defaultMessage: "صادر" },
  "@legalos.matterWorkspace.comms.form.channel": { defaultMessage: "القناة" },
  "@legalos.matterWorkspace.comms.form.direction": { defaultMessage: "الاتجاه" },
  "@legalos.matterWorkspace.comms.form.subject": { defaultMessage: "الموضوع" },
  "@legalos.matterWorkspace.comms.form.body": { defaultMessage: "ملاحظات" },
  "@legalos.matterWorkspace.comms.form.counterparty": { defaultMessage: "الطرف الآخر" },
  "@legalos.matterWorkspace.comms.form.occurredAt": { defaultMessage: "التوقيت" },
  "@legalos.matterWorkspace.comms.form.duration": { defaultMessage: "المدة (دقائق)" },

  "@legalos.matterWorkspace.comms.messages.new": { defaultMessage: "رسالة جديدة" },
  "@legalos.matterWorkspace.comms.messages.emptyTitle": { defaultMessage: "لا توجد رسائل آمنة" },
  "@legalos.matterWorkspace.comms.messages.emptyDescription": {
    defaultMessage: "ابدأ محادثة لتبادل الرسائل مع الموكّل داخل المنصة بدلًا من البريد.",
  },
  "@legalos.matterWorkspace.comms.messages.subject": { defaultMessage: "الموضوع" },
  "@legalos.matterWorkspace.comms.messages.firstMessage": { defaultMessage: "الرسالة" },
  "@legalos.matterWorkspace.comms.messages.reply": { defaultMessage: "اكتب ردًا…" },
  "@legalos.matterWorkspace.comms.messages.send": { defaultMessage: "إرسال" },
  "@legalos.matterWorkspace.comms.messages.start": { defaultMessage: "بدء المحادثة" },
  "@legalos.matterWorkspace.comms.messages.unread": {
    defaultMessage: "{count, plural, one {غير مقروءة} other {# غير مقروءة}}",
  },
  "@legalos.matterWorkspace.comms.messages.markRead": {
    defaultMessage: "تعليم كمقروء",
  },
  "@legalos.matterWorkspace.comms.messages.count": {
    defaultMessage: "{count, plural, one {رسالة} other {# رسائل}}",
  },
  "@legalos.matterWorkspace.comms.messages.client": { defaultMessage: "الموكّل" },
  "@legalos.matterWorkspace.comms.messages.sendTo": { defaultMessage: "الإرسال إلى" },
  "@legalos.matterWorkspace.comms.messages.noPortal": {
    defaultMessage: "محادثة داخلية (بدون بوابة)",
  },

  "@legalos.matterWorkspace.comms.portals.invite": { defaultMessage: "دعوة إلى البوابة" },
  "@legalos.matterWorkspace.comms.portals.emptyTitle": {
    defaultMessage: "لم يُمنح وصول للبوابة",
  },
  "@legalos.matterWorkspace.comms.portals.emptyDescription": {
    defaultMessage: "امنح جهة اتصال محدَّدة لدى الموكّل وصولًا لمستندات هذا الملف وفواتيره ورسائله.",
  },
  "@legalos.matterWorkspace.comms.portals.status.invited": { defaultMessage: "مدعو" },
  "@legalos.matterWorkspace.comms.portals.status.active": { defaultMessage: "نشط" },
  "@legalos.matterWorkspace.comms.portals.status.revoked": { defaultMessage: "ملغى" },
  "@legalos.matterWorkspace.comms.portals.canViewDocuments": { defaultMessage: "المستندات" },
  "@legalos.matterWorkspace.comms.portals.canViewBills": { defaultMessage: "الفواتير" },
  "@legalos.matterWorkspace.comms.portals.canMessage": { defaultMessage: "الرسائل" },
  "@legalos.matterWorkspace.comms.portals.revoke": { defaultMessage: "إلغاء الوصول" },
  "@legalos.matterWorkspace.comms.portals.activate": { defaultMessage: "تفعيل" },
  "@legalos.matterWorkspace.comms.portals.reinvite": { defaultMessage: "إعادة الدعوة" },
  "@legalos.matterWorkspace.comms.portals.invitedOn": { defaultMessage: "دُعي في {date}" },
  "@legalos.matterWorkspace.comms.portals.lastActive": {
    defaultMessage: "آخر نشاط {date}",
  },
  "@legalos.matterWorkspace.comms.portals.neverActive": {
    defaultMessage: "لم يسجّل الدخول بعد",
  },
  "@legalos.matterWorkspace.comms.portals.noContacts": {
    defaultMessage: "أضف جهة اتصال لهذا الموكّل قبل منح الوصول للبوابة.",
  },

  // --- bills ----------------------------------------------------------------
  "@legalos.matterWorkspace.bills.heading": { defaultMessage: "الفواتير" },
  "@legalos.matterWorkspace.bills.emptyTitle": { defaultMessage: "لا توجد فواتير بعد" },
  "@legalos.matterWorkspace.bills.emptyDescription": {
    defaultMessage: "أنشئ مسوّدة فاتورة من الوقت والمصروفات غير المفوترة عبر «فاتورة سريعة».",
  },
  "@legalos.matterWorkspace.bills.issued": { defaultMessage: "صدرت في {date}" },
  "@legalos.matterWorkspace.bills.due": { defaultMessage: "تستحق في {date}" },
  "@legalos.matterWorkspace.bills.paid": { defaultMessage: "سُدِّدت في {date}" },
  "@legalos.matterWorkspace.bills.payFromFunds": { defaultMessage: "السداد من أموال الموكّل" },
  "@legalos.matterWorkspace.bills.paymentTerms": {
    defaultMessage: "مهلة السداد (أيام)",
  },

  // --- transactions ---------------------------------------------------------
  "@legalos.matterWorkspace.transactions.heading": { defaultMessage: "أموال الموكّل" },
  "@legalos.matterWorkspace.transactions.balance": { defaultMessage: "الرصيد" },
  "@legalos.matterWorkspace.transactions.deposits": { defaultMessage: "المودَع" },
  "@legalos.matterWorkspace.transactions.disbursed": { defaultMessage: "المصروف" },
  "@legalos.matterWorkspace.transactions.record": { defaultMessage: "تسجيل حركة" },
  "@legalos.matterWorkspace.transactions.emptyTitle": {
    defaultMessage: "لا توجد أموال محفوظة للموكّل",
  },
  "@legalos.matterWorkspace.transactions.emptyDescription": {
    defaultMessage:
      "تُسجَّل هنا الدفعات المقدَّمة وغيرها من الأموال المحفوظة لحساب الموكّل ويُخصم منها مقابل الفواتير.",
  },
  "@legalos.matterWorkspace.transactions.kind.deposit": { defaultMessage: "إيداع" },
  "@legalos.matterWorkspace.transactions.kind.withdrawal": { defaultMessage: "سحب" },
  "@legalos.matterWorkspace.transactions.kind.invoice_payment": {
    defaultMessage: "سداد فاتورة",
  },
  "@legalos.matterWorkspace.transactions.kind.refund": { defaultMessage: "رد مبلغ" },
  "@legalos.matterWorkspace.transactions.form.kind": { defaultMessage: "النوع" },
  "@legalos.matterWorkspace.transactions.form.amount": { defaultMessage: "المبلغ" },
  "@legalos.matterWorkspace.transactions.form.date": { defaultMessage: "التاريخ" },
  "@legalos.matterWorkspace.transactions.form.description": { defaultMessage: "الوصف" },
  "@legalos.matterWorkspace.transactions.form.reference": { defaultMessage: "المرجع" },
  "@legalos.matterWorkspace.transactions.form.referencePlaceholder": {
    defaultMessage: "رقم الشيك أو التحويل",
  },
  "@legalos.matterWorkspace.transactions.form.invoice": { defaultMessage: "مقابل فاتورة" },
  "@legalos.matterWorkspace.transactions.form.account": { defaultMessage: "حساب الموكّلين" },
  "@legalos.matterWorkspace.transactions.noAccountTitle": {
    defaultMessage: "لا يوجد حساب لأموال الموكّلين",
  },
  "@legalos.matterWorkspace.transactions.noAccountDescription": {
    defaultMessage:
      "تُحفظ أموال الموكّلين منفصلة عن أموال المكتب. على المالك فتح الحساب قبل تسجيل أي مبالغ.",
  },
  "@legalos.matterWorkspace.transactions.openAccount": {
    defaultMessage: "فتح حساب لأموال الموكّلين",
  },
  "@legalos.matterWorkspace.transactions.account.name": { defaultMessage: "اسم الحساب" },
  "@legalos.matterWorkspace.transactions.account.bank": { defaultMessage: "البنك" },
  "@legalos.matterWorkspace.transactions.account.number": { defaultMessage: "رقم الحساب" },
  "@legalos.matterWorkspace.transactions.ownerOnly": {
    defaultMessage: "فتح حساب أموال الموكّلين متاح للمالك فقط.",
  },
  "@legalos.matterWorkspace.transactions.staffOnly": {
    defaultMessage: "تحريك أموال الموكّلين متاح للمالك أو الموظفين فقط.",
  },

  // --- shared actions and errors -------------------------------------------
  "@legalos.matterWorkspace.action.cancel": { defaultMessage: "إلغاء" },
  "@legalos.matterWorkspace.action.save": { defaultMessage: "حفظ" },
  "@legalos.matterWorkspace.action.saving": { defaultMessage: "جارٍ الحفظ…" },
  "@legalos.matterWorkspace.action.add": { defaultMessage: "إضافة" },

  "@legalos.matterWorkspace.errors.contact": {
    defaultMessage: "تعذّر حفظ جهة الاتصال.",
  },
  "@legalos.matterWorkspace.errors.expense": { defaultMessage: "تعذّر حفظ هذا المصروف." },
  "@legalos.matterWorkspace.errors.time": { defaultMessage: "تعذّر حفظ سجل الوقت." },
  "@legalos.matterWorkspace.errors.communication": {
    defaultMessage: "تعذّر حفظ هذه المراسلة.",
  },
  "@legalos.matterWorkspace.errors.portal": { defaultMessage: "تعذّر تحديث وصول البوابة." },
  "@legalos.matterWorkspace.errors.message": { defaultMessage: "تعذّر إرسال هذه الرسالة." },
  "@legalos.matterWorkspace.errors.trust": { defaultMessage: "تعذّر تسجيل هذه الحركة." },
  "@legalos.matterWorkspace.errors.customField": { defaultMessage: "تعذّر حفظ هذا الحقل." },
  "@legalos.matterWorkspace.errors.conflict": {
    defaultMessage: "تعذّر تشغيل فحص التعارض.",
  },
  "@legalos.matterWorkspace.errors.bill": { defaultMessage: "تعذّر إنشاء هذه الفاتورة." },
  "@legalos.matterWorkspace.errors.duplicate": { defaultMessage: "تعذّر نسخ هذا الملف." },
};
