"use client";

/**
 * The firm's own settings, as sections on one route rather than sub-pages.
 *
 * A firm sets most of this once, at onboarding -- navigating between six
 * pages for one setup session is a burden, not organisation (T-034). Each
 * section saves independently: one button for every field on the page
 * would make each save a gamble that some unrelated section did not just
 * get overwritten, and a lawyer or staff member sees every section
 * read-only with a reason, rather than a page that vanishes and leaves
 * "where did settings go?" unanswered.
 *
 * Two sections the spec asked for are not here, both recorded rather than
 * silently dropped:
 *   - Calendar (ICS subscription): no backend route exists, and building a
 *     token-authenticated read-only feed is a separate piece of work: T-034
 *     names it as in scope only if a route already existed, and explicitly
 *     allows omitting the section otherwise.
 *   - Account export / deletion: deferred in T-027 already -- an
 *     irreversible action deserves its own design, not a button bolted on
 *     here. A delete button with no backend behind it is the worst thing
 *     this screen could show.
 */

import { useOrg, useResource } from "@/lib/org";
import { api } from "@/lib/api";
import { DataView } from "@/components/DataState";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { IdentitySection } from "@/components/settings/IdentitySection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { RequiredFieldsSection } from "@/components/settings/RequiredFieldsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { PlanSection } from "@/components/settings/PlanSection";

export default function FirmSettingsPage() {
  const { organizationId, role, reloadOrganizations } = useOrg();

  // Never called before an organization is bound: useResource holds the
  // fetcher until one is, which is the same guarantee every practice screen
  // relies on.
  const firm = useResource(() => api.organization(organizationId!), [organizationId]);
  const canEdit = role === "owner";

  return (
    <DataView resource={firm}>
      {(loaded) => {
        // The name is on every screen's header and in the sidebar, both of
        // which read it from the membership list rather than from here, so
        // a rename that stopped at this form would look like it had not
        // taken.
        function onSaved() {
          firm.reload();
          reloadOrganizations();
        }

        return (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full py-6 px-4" key={loaded.id}>
            <ProfileSection
              firm={loaded}
              organizationId={loaded.id}
              canEdit={canEdit}
              onSaved={onSaved}
            />
            <IdentitySection
              firm={loaded}
              organizationId={loaded.id}
              canEdit={canEdit}
              onSaved={onSaved}
            />
            <PreferencesSection
              firm={loaded}
              organizationId={loaded.id}
              canEdit={canEdit}
              onSaved={onSaved}
            />
            <BillingSection
              firm={loaded}
              organizationId={loaded.id}
              canEdit={canEdit}
              onSaved={onSaved}
            />
            <RequiredFieldsSection
              firm={loaded}
              organizationId={loaded.id}
              canEdit={canEdit}
              onSaved={onSaved}
            />
            {/* Read-only summary; the only way to change plan_intent is
              * /plans (T-041). Shown to every role, like the trial bar. */}
            <PlanSection firm={loaded} />
            {/* Not gated by canEdit -- a personal channel preference, not a
              * firm setting. Every member, any role, sets their own. */}
            <NotificationsSection />
          </div>
        );
      }}
    </DataView>
  );
}
