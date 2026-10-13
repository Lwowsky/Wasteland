import ukCommon from "./locales/uk/ui/common.json";
import ukHeader from "./locales/uk/ui/header.json";
import ukFooter from "./locales/uk/ui/footer.json";
import ukContentAccess from "./locales/uk/ui/contentAccess.json";
import ukAuth from "./locales/uk/ui/auth.json";

import ukHome from "./locales/uk/content/home.json";
import ukRegistration from "./locales/uk/content/registration.json";
import ukPlayers from "./locales/uk/content/players.json";
import ukFinalPlan from "./locales/uk/content/finalPlan.json";
import ukSettings from "./locales/uk/content/settings.json";
import ukNotFound from "./locales/uk/content/notFound.json";

import ukAdminCommon from "./locales/uk/admin/common.json";
import ukAdminAccess from "./locales/uk/admin/access.json";
import ukAdminPlayers from "./locales/uk/admin/players.json";
import ukAdminDistribution from "./locales/uk/admin/distribution.json";
import ukAdminRegistration from "./locales/uk/admin/registration.json";
import ukAdminRequests from "./locales/uk/admin/requests.json";
import ukAdminSettings from "./locales/uk/admin/settings.json";

import ukSeo from "./locales/uk/seo.json";

import enCommon from "./locales/en/ui/common.json";
import enHeader from "./locales/en/ui/header.json";
import enFooter from "./locales/en/ui/footer.json";
import enContentAccess from "./locales/en/ui/contentAccess.json";
import enAuth from "./locales/en/ui/auth.json";

import enHome from "./locales/en/content/home.json";
import enRegistration from "./locales/en/content/registration.json";
import enPlayers from "./locales/en/content/players.json";
import enFinalPlan from "./locales/en/content/finalPlan.json";
import enSettings from "./locales/en/content/settings.json";
import enNotFound from "./locales/en/content/notFound.json";

import enAdminCommon from "./locales/en/admin/common.json";
import enAdminAccess from "./locales/en/admin/access.json";
import enAdminPlayers from "./locales/en/admin/players.json";
import enAdminDistribution from "./locales/en/admin/distribution.json";
import enAdminRegistration from "./locales/en/admin/registration.json";
import enAdminRequests from "./locales/en/admin/requests.json";
import enAdminSettings from "./locales/en/admin/settings.json";

import enSeo from "./locales/en/seo.json";

const translations = {
  uk: {
    common: ukCommon,
    header: ukHeader,
    footer: ukFooter,
    contentAccess: ukContentAccess,
    auth: ukAuth,

    home: ukHome,
    registration: ukRegistration,
    players: ukPlayers,
    finalPlan: ukFinalPlan,
    settings: ukSettings,
    notFound: ukNotFound,

    admin: {
      common: ukAdminCommon,
      access: ukAdminAccess,
      players: ukAdminPlayers,
      distribution: ukAdminDistribution,
      registration: ukAdminRegistration,
      requests: ukAdminRequests,
      settings: ukAdminSettings,
    },

    seo: ukSeo,
  },

  en: {
    common: enCommon,
    header: enHeader,
    footer: enFooter,
    contentAccess: enContentAccess,
    auth: enAuth,

    home: enHome,
    registration: enRegistration,
    players: enPlayers,
    finalPlan: enFinalPlan,
    settings: enSettings,
    notFound: enNotFound,

    admin: {
      common: enAdminCommon,
      access: enAdminAccess,
      players: enAdminPlayers,
      distribution: enAdminDistribution,
      registration: enAdminRegistration,
      requests: enAdminRequests,
      settings: enAdminSettings,
    },

    seo: enSeo,
  },
};

export default translations;
