import type { Catalog, MessagesByLocale } from "@astryxdesign/core/i18n";
import * as ai from "./catalogs/ai";
import * as astryx from "./catalogs/astryx";
import * as auth from "./catalogs/auth";
import * as clients from "./catalogs/clients";
import * as common from "./catalogs/common";
import * as crm from "./catalogs/crm";
import * as documents from "./catalogs/documents";
import * as enums from "./catalogs/enums";
import * as financeA from "./catalogs/finance-a";
import * as financeB from "./catalogs/finance-b";
import * as knowledgeBase from "./catalogs/knowledge-base";
import * as matterWorkspace from "./catalogs/matter-workspace";
import * as matters from "./catalogs/matters";
import * as overview from "./catalogs/overview";
import * as practice from "./catalogs/practice";
import * as settings from "./catalogs/settings";
import * as shell from "./catalogs/shell";
import * as team from "./catalogs/team";

// Each domain catalog module exports `en`/`ar` Catalog objects; merge them
// here into the two locale-wide catalogs the provider needs. Add new domain
// modules to this list as pages pick up translation.
//
// `astryx` is not a domain of this app: it is the Arabic for the design
// system's own built-in strings, which resolve through this same provider and
// otherwise fall back to the package's shipped English inside an Arabic page.
const domains = [ai, astryx, auth, clients, common, crm, documents, enums, financeA, financeB, knowledgeBase, matters, matterWorkspace, overview, practice, settings, shell, team];

function mergeCatalogs(catalogs: Catalog[]): Catalog {
  return Object.assign({}, ...catalogs);
}

export const messages: MessagesByLocale = {
  en: mergeCatalogs(domains.map((d) => d.en)),
  ar: mergeCatalogs(domains.map((d) => d.ar)),
};
