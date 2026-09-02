"use client";

/**
 * The matter dashboard: the case file first, then who is on the file, what
 * has been checked for conflicts, and what has happened lately.
 *
 * The money used to lead. It now sits in the page header as a compact strip
 * (FinancialStrip) that stays on screen whatever tab is open, and the
 * dashboard belongs to what the matter is about -- the question a lawyer
 * preparing for a hearing opens it to answer.
 */

import { useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Link } from "@astryxdesign/core/Link";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ScaleIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMemberName, useOrg } from "@/lib/org";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  type ConflictHit,
  type ConflictResult,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { Panel, lines, useWrite, type TabProps } from "./shared";
import { CaseFile } from "./CaseFile";

const CONFLICT_VARIANT: Record<ConflictResult, "success" | "warning" | "error"> = {
  clear: "success",
  potential_conflict: "warning",
  conflict: "error",
};

export function DashboardTab({ data, reload, onError }: TabProps) {
  const { formatDate, formatDateTime, formatEGP } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const memberName = useMemberName();
  const { matter } = data;
  // Only the budget line still needs a currency here.
  const currency = data.invoices[0]?.currency ?? "EGP";

  const openTasks = data.tasks.filter((task) => task.status !== "done");
  const billRecipient = data.contacts.find((c) => c.is_bill_recipient);

  return (
    <VStack gap={6}>
      {/* --- the case file proper: what this matter is about ------------ */}
      <CaseFile data={data} reload={reload} onError={onError} />

      <Grid columns={3} gap={6}>
        <GridSpan columns={2}>
          <VStack gap={6}>
            {/* --- details ---------------------------------------------- */}
            <Panel title={t("@legalos.matterWorkspace.details.heading")}>
              <Text type="body">
                {matter.description ||
                  t("@legalos.matterWorkspace.details.noDescription")}
              </Text>
              <MetadataList>
                <MetadataListItem
                  label={t("@legalos.matterWorkspace.details.matterNumber")}
                >
                  {matter.matter_number}
                </MetadataListItem>
                <MetadataListItem label={t("@legalos.matters.field.type")}>
                  {enumLabel(matter.matter_type)}
                </MetadataListItem>
                <MetadataListItem label={t("@legalos.matters.field.responsible")}>
                  {memberName(matter.responsible_user)}
                </MetadataListItem>
                <MetadataListItem label={t("@legalos.matters.field.billing")}>
                  {enumLabel(matter.billing_type)}
                </MetadataListItem>
                <MetadataListItem label={t("@legalos.matters.field.opened")}>
                  {formatDate(matter.opened_date)}
                </MetadataListItem>
                {matter.budget_amount !== null && (
                  <MetadataListItem
                    label={t("@legalos.matters.detail.glance.budget")}
                  >
                    {formatEGP(Number(matter.budget_amount), currency)}
                    {matter.budget_is_estimate
                      ? t("@legalos.matters.detail.glance.estimateSuffix")
                      : ""}
                  </MetadataListItem>
                )}
                {matter.closed_date && (
                  <MetadataListItem label={t("@legalos.matters.field.closed")}>
                    {formatDate(matter.closed_date)}
                  </MetadataListItem>
                )}
                <MetadataListItem label={t("@legalos.matterWorkspace.details.tags")}>
                  {matter.tags.length > 0
                    ? matter.tags.join(", ")
                    : t("@legalos.matterWorkspace.details.noTags")}
                </MetadataListItem>
              </MetadataList>
            </Panel>

            {data.linkedCase && (
              <Panel
                title={t("@legalos.matters.detail.linkedCase.heading")}
                action={
                  <Link href={`/cases/${data.linkedCase.id}`}>
                    {t("@legalos.matters.detail.linkedCase.openCase")}
                  </Link>
                }
              >
                <MetadataList>
                  <MetadataListItem
                    label={t("@legalos.matters.detail.linkedCase.caseNumber")}
                  >
                    {data.linkedCase.case_number}
                  </MetadataListItem>
                  <MetadataListItem
                    label={t("@legalos.matters.detail.linkedCase.court")}
                  >
                    {data.linkedCase.court}
                  </MetadataListItem>
                  <MetadataListItem
                    label={t("@legalos.matters.detail.linkedCase.opposingParty")}
                  >
                    {data.linkedCase.opposing_party || "—"}
                  </MetadataListItem>
                </MetadataList>
              </Panel>
            )}

            <ConflictChecksCard data={data} reload={reload} onError={onError} />

            <Panel title={t("@legalos.matters.detail.openTasks.heading")}>
              {openTasks.length === 0 ? (
                <Text type="body" color="secondary">
                  {t("@legalos.matters.detail.openTasks.empty")}
                </Text>
              ) : (
                <List hasDividers density="compact">
                  {openTasks.map((task) => (
                    <ListItem
                      key={task.id}
                      label={task.title}
                      description={memberName(task.assignee)}
                      startContent={
                        <Icon icon={CheckCircleIcon} size="sm" color="secondary" />
                      }
                      endContent={
                        task.due_date ? (
                          <Text type="supporting" color="secondary">
                            {formatDate(task.due_date)}
                          </Text>
                        ) : undefined
                      }
                    />
                  ))}
                </List>
              )}
            </Panel>

            <Panel title={t("@legalos.matters.detail.activity.heading")}>
              {data.activity.length === 0 ? (
                <Text type="body" color="secondary">
                  {t("@legalos.matters.detail.activity.empty")}
                </Text>
              ) : (
                <List hasDividers density="compact">
                  {data.activity.map((entry) => (
                    <ListItem
                      key={entry.id}
                      label={memberName(entry.actor)}
                      description={entry.action}
                      startContent={
                        <Avatar
                          name={memberName(entry.actor)}
                          size="sm"
                          tooltip={false}
                        />
                      }
                      endContent={
                        <Text type="supporting" color="secondary">
                          {formatDateTime(entry.occurred_at)}
                        </Text>
                      }
                    />
                  ))}
                </List>
              )}
            </Panel>
          </VStack>
        </GridSpan>

        <VStack gap={6}>
          <ContactsCard data={data} reload={reload} onError={onError} />

          <Panel title={t("@legalos.matters.detail.team.heading")}>
            <List hasDividers density="compact">
              <ListItem
                label={memberName(matter.responsible_user)}
                description={t("@legalos.matters.field.responsible")}
                startContent={
                  <Avatar
                    name={memberName(matter.responsible_user)}
                    size="sm"
                    tooltip={false}
                  />
                }
              />
              {matter.staff.map((userId) => (
                <ListItem
                  key={userId}
                  label={memberName(userId)}
                  description={t("@legalos.matters.detail.team.supporting")}
                  startContent={
                    <Avatar name={memberName(userId)} size="sm" tooltip={false} />
                  }
                />
              ))}
            </List>
          </Panel>

          <Panel title={t("@legalos.matters.detail.hearings.heading")}>
            {data.hearings.length === 0 ? (
              <Text type="body" color="secondary">
                {t("@legalos.matters.detail.hearings.empty")}
              </Text>
            ) : (
              <List hasDividers density="compact">
                {data.hearings.map((hearing) => (
                  <ListItem
                    key={hearing.id}
                    label={
                      hearing.purpose ||
                      t("@legalos.matters.detail.hearings.defaultPurpose")
                    }
                    description={hearing.court}
                    startContent={
                      <Icon icon={ScaleIcon} size="sm" color="secondary" />
                    }
                    endContent={
                      <Text type="supporting" color="secondary">
                        {formatDate(hearing.hearing_date)}
                      </Text>
                    }
                  />
                ))}
              </List>
            )}
          </Panel>

          {billRecipient && (
            <Panel title={t("@legalos.matterWorkspace.contacts.billRecipient")}>
              <HStack gap={3} vAlign="center">
                <Icon icon={BanknotesIcon} size="sm" color="secondary" />
                <VStack gap={0}>
                  <Text type="body">{billRecipient.name}</Text>
                  {billRecipient.email && (
                    <Text type="supporting" color="secondary">
                      {billRecipient.email}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Panel>
          )}
        </VStack>
      </Grid>
    </VStack>
  );
}

// --- contacts ---------------------------------------------------------------

function ContactsCard({ data, reload, onError }: TabProps) {
  const t = useTranslator();
  const write = useWrite(reload, onError);
  const { practice } = useOrg();
  const [isAdding, setIsAdding] = useState(false);

  const clientParties = data.contacts.filter((c) => c.contact_id !== null);
  const otherParties = data.contacts.filter((c) => c.contact_id === null);

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.contacts.heading")}
        action={
          <Button
            label={t("@legalos.matterWorkspace.contacts.add")}
            variant="secondary"
            size="sm"
            onClick={() => setIsAdding(true)}
          />
        }
      >
        <VStack gap={2}>
          <Text type="supporting" color="secondary" weight="semibold">
            {t("@legalos.matterWorkspace.contacts.clients", {
              count: clientParties.length,
            })}
          </Text>
          <List hasDividers density="compact">
            <ListItem
              label={data.matter.client_name}
              href={`/clients/${data.matter.client_id}`}
              description={t("@legalos.matters.field.client")}
              startContent={
                <Avatar name={data.matter.client_name} size="sm" tooltip={false} />
              }
            />
            {clientParties.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                matterId={data.matter.id}
                write={write}
                practiceReady={Boolean(practice)}
              />
            ))}
          </List>
        </VStack>

        <VStack gap={2}>
          <Text type="supporting" color="secondary" weight="semibold">
            {t("@legalos.matterWorkspace.contacts.related", {
              count: otherParties.length,
            })}
          </Text>
          {otherParties.length === 0 ? (
            <Text type="supporting" color="secondary">
              {t("@legalos.matterWorkspace.contacts.empty")}
            </Text>
          ) : (
            <List hasDividers density="compact">
              {otherParties.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  matterId={data.matter.id}
                  write={write}
                  practiceReady={Boolean(practice)}
                />
              ))}
            </List>
          )}
        </VStack>
      </Panel>

      <AddContactDialog
        isOpen={isAdding}
        onOpenChange={setIsAdding}
        data={data}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function ContactRow({
  contact,
  matterId,
  write,
  practiceReady,
}: {
  contact: import("@/lib/practice").MatterContact;
  matterId: number;
  write: ReturnType<typeof useWrite>;
  practiceReady: boolean;
}) {
  const t = useTranslator();
  const { practice } = useOrg();

  return (
    <ListItem
      label={contact.name}
      description={contact.relationship || contact.email || undefined}
      startContent={<Avatar name={contact.name} size="sm" tooltip={false} />}
      // Icon buttons, not text ones. Two full-width Arabic labels
      // ("تعيينه مستلمًا للفاتورة" and "إزالة") took the whole row at around
      // 1000px and squeezed the name column to nothing, so the list showed an
      // avatar and two buttons with no indication of whose contact it was.
      // The labels survive as the accessible name and the tooltip.
      endContent={
        <HStack gap={2} vAlign="center">
          {contact.is_bill_recipient ? (
            <Badge
              variant="info"
              label={t("@legalos.matterWorkspace.contacts.billRecipient")}
            />
          ) : (
            <Button
              label={t("@legalos.matterWorkspace.contacts.makeBillRecipient")}
              variant="ghost"
              size="sm"
              isIconOnly
              icon={<Icon icon={BanknotesIcon} size="sm" color="inherit" />}
              isDisabled={!practiceReady}
              onClick={() =>
                write(
                  () =>
                    practice!.matters.updateContact(matterId, contact.id, {
                      is_bill_recipient: true,
                    }),
                  "@legalos.matterWorkspace.errors.contact",
                )
              }
            />
          )}
          <Button
            label={t("@legalos.matterWorkspace.contacts.remove")}
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Icon icon={TrashIcon} size="sm" color="inherit" />}
            isDisabled={!practiceReady}
            onClick={() =>
              write(
                () => practice!.matters.removeContact(matterId, contact.id),
                "@legalos.matterWorkspace.errors.contact",
              )
            }
          />
        </HStack>
      }
    />
  );
}

function AddContactDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: WorkspaceDataProp;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [mode, setMode] = useState<"existing" | "external">("existing");
  const [contactId, setContactId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Contacts already attached cannot be attached again, so they are not offered.
  const attached = new Set(
    data.contacts.map((c) => c.contact_id).filter((id): id is number => id !== null),
  );
  const available = data.clientContacts.filter((c) => !attached.has(c.id));

  function reset() {
    setMode("existing");
    setContactId(null);
    setName("");
    setRelationship("");
    setEmail("");
    setPhone("");
  }

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.matters.addContact(data.matter.id, {
          ...(mode === "existing"
            ? { contact_id: Number(contactId) }
            : { name: name.trim(), email, phone }),
          relationship,
        }),
      "@legalos.matterWorkspace.errors.contact",
    );
    setSaving(false);
    if (ok) {
      reset();
      onOpenChange(false);
    }
  }

  const canSubmit =
    mode === "existing" ? contactId !== null : name.trim().length > 0;

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.contacts.form.heading")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <SegmentedControl
                label={t("@legalos.matterWorkspace.contacts.form.heading")}
                value={mode}
                onChange={(value) => setMode(value as "existing" | "external")}
              >
                <SegmentedControlItem
                  value="existing"
                  label={t("@legalos.matterWorkspace.contacts.form.existing")}
                />
                <SegmentedControlItem
                  value="external"
                  label={t("@legalos.matterWorkspace.contacts.form.external")}
                />
              </SegmentedControl>

              {mode === "existing" ? (
                available.length === 0 ? (
                  <Text type="body" color="secondary">
                    {t("@legalos.matterWorkspace.contacts.form.noneOnFile")}
                  </Text>
                ) : (
                  <Selector
                    label={t("@legalos.matterWorkspace.contacts.form.pick")}
                    value={contactId}
                    onChange={setContactId}
                    hasClear
                    options={available.map((c) => ({
                      value: String(c.id),
                      label: c.title ? `${c.name} — ${c.title}` : c.name,
                    }))}
                  />
                )
              ) : (
                <>
                  <TextInput
                    label={t("@legalos.matterWorkspace.contacts.form.name")}
                    value={name}
                    onChange={setName}
                    isRequired
                  />
                  <TextInput
                    label={t("@legalos.matterWorkspace.contacts.form.email")}
                    value={email}
                    onChange={setEmail}
                  />
                  <TextInput
                    label={t("@legalos.matterWorkspace.contacts.form.phone")}
                    value={phone}
                    onChange={setPhone}
                  />
                </>
              )}

              <TextInput
                label={t("@legalos.matterWorkspace.contacts.form.relationship")}
                value={relationship}
                onChange={setRelationship}
                placeholder={t(
                  "@legalos.matterWorkspace.contacts.form.relationshipPlaceholder",
                )}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.action.add")
                }
                variant="primary"
                isDisabled={saving || !canSubmit}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

type WorkspaceDataProp = TabProps["data"];

// --- conflict checks --------------------------------------------------------

function ConflictChecksCard({ data, reload, onError }: TabProps) {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [isRunning, setIsRunning] = useState(false);
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  // The hits behind the most recent run, which the API returns but does not
  // store — only their summary is persisted.
  const [hits, setHits] = useState<ConflictHit[] | null>(null);

  async function run() {
    if (!practice) return;
    setBusy(true);
    try {
      const result = await practice.matters.runConflictCheck(
        data.matter.id,
        lines(terms),
      );
      setHits(result.hits);
      setTerms("");
      setIsRunning(false);
      reload();
    } catch (exc) {
      onError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matterWorkspace.errors.conflict"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.conflicts.heading")}
        action={
          <Button
            label={t("@legalos.matterWorkspace.conflicts.run")}
            variant="secondary"
            size="sm"
            onClick={() => setIsRunning(true)}
          />
        }
      >
        {data.conflictChecks.length === 0 ? (
          <Text type="body" color="secondary">
            {t("@legalos.matterWorkspace.conflicts.empty")}
          </Text>
        ) : (
          <List hasDividers density="compact">
            {data.conflictChecks.map((check) => (
              <ListItem
                key={check.id}
                label={check.search_terms.join(", ")}
                description={
                  check.hit_summary ||
                  t("@legalos.matterWorkspace.conflicts.noHits")
                }
                startContent={
                  <Icon icon={ShieldCheckIcon} size="sm" color="secondary" />
                }
                endContent={
                  <HStack gap={3} vAlign="center">
                    <VStack gap={0} hAlign="end">
                      <Badge
                        variant={CONFLICT_VARIANT[check.result]}
                        label={t(
                          `@legalos.matterWorkspace.conflicts.result.${check.result}`,
                        )}
                      />
                      <Text type="supporting" color="secondary">
                        {check.cleared_by
                          ? t("@legalos.matterWorkspace.conflicts.clearedBy", {
                              name: memberName(check.cleared_by),
                              date: formatDate(check.cleared_at),
                            })
                          : t("@legalos.matterWorkspace.conflicts.ranBy", {
                              name: memberName(check.run_by),
                              date: formatDate(check.run_at),
                            })}
                      </Text>
                    </VStack>
                    {!check.cleared_by && (
                      <Selector
                        label={t("@legalos.matterWorkspace.conflicts.decide")}
                        isLabelHidden
                        value={null}
                        hasClear
                        width={170}
                        placeholder={t("@legalos.matterWorkspace.conflicts.decide")}
                        onChange={(value) =>
                          value &&
                          write(
                            () =>
                              practice!.conflicts.resolve(check.id, {
                                result: value as ConflictResult,
                              }),
                            "@legalos.matterWorkspace.errors.conflict",
                          )
                        }
                        options={(
                          ["clear", "potential_conflict", "conflict"] as const
                        ).map((value) => ({
                          value,
                          label: t(
                            `@legalos.matterWorkspace.conflicts.result.${value}`,
                          ),
                        }))}
                      />
                    )}
                  </HStack>
                }
              />
            ))}
          </List>
        )}

        {hits && hits.length > 0 && (
          <VStack gap={2}>
            <Text type="supporting" color="secondary" weight="semibold">
              {t("@legalos.matterWorkspace.conflicts.hits", { count: hits.length })}
            </Text>
            <List hasDividers density="compact">
              {hits.map((hit, index) => (
                <ListItem
                  key={`${hit.kind}-${hit.name}-${index}`}
                  label={hit.name}
                  description={
                    hit.matter_name ? `${hit.detail} · ${hit.matter_name}` : hit.detail
                  }
                  endContent={
                    <Badge
                      variant="neutral"
                      label={t(
                        `@legalos.matterWorkspace.conflicts.hitKind.${hit.kind}`,
                      )}
                    />
                  }
                />
              ))}
            </List>
          </VStack>
        )}
      </Panel>

      <Dialog isOpen={isRunning} onOpenChange={setIsRunning} width={480}>
        <Layout
          header={
            <DialogHeader
              title={t("@legalos.matterWorkspace.conflicts.run")}
              onOpenChange={setIsRunning}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <TextArea
                  label={t("@legalos.matterWorkspace.conflicts.terms.label")}
                  value={terms}
                  onChange={setTerms}
                  rows={4}
                  placeholder={t(
                    "@legalos.matterWorkspace.conflicts.terms.placeholder",
                  )}
                />
                <Text type="supporting" color="secondary">
                  {t("@legalos.matterWorkspace.conflicts.terms.hint")}
                </Text>
                <Text type="supporting" color="secondary">
                  {t("@legalos.matterWorkspace.conflicts.decideHint")}
                </Text>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={3} hAlign="end">
                <Button
                  label={t("@legalos.matterWorkspace.action.cancel")}
                  variant="secondary"
                  onClick={() => setIsRunning(false)}
                />
                <Button
                  label={t("@legalos.matterWorkspace.conflicts.run")}
                  variant="primary"
                  isDisabled={busy || lines(terms).length === 0}
                  onClick={run}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
