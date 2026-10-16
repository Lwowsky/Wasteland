import { handleCloudflareMetrics } from "./admin/cloudflareMetrics.js";
import { handleSharedLogin, handleSharedStatus, handleSharedManage } from "./auth/sharedConsul.js";
import {
  handleAdminTurretPlanGet, handleAdminTurretDraftPut,
  handleAdminTurretPublish, handleAdminTurretRestore, handlePublicFinalPlan,
} from "./turrets/routes.js";

import { JSON_HEADERS } from "./config/headers.js";

import { json } from "./utils/response.js";

import { handleCachedGet } from "./utils/cache.js";

import { handleRegistration } from "./public/registration.js";
import { handlePublicRegistrationSettings } from "./public/registrationSettings.js";
import { handlePublicSiteSettings } from "./public/siteSettings.js";

import { handleRecent } from "./public/recent.js";

import { handleStats } from "./public/stats.js";

import { handlePlayers } from "./public/players.js";
import { handlePublicSnapshot, handlePublicSnapshotAck } from "./public/publicSnapshot.js";
import { dispatchPendingPublicSnapshot, syncPublicVisibilityRevision } from "./services/publicSnapshotSync.js";
import {
  handleContentAccessActivation,
  handleContentAccessStatus,
} from "./public/contentAccess.js";
import { getContentAccessState } from "./services/contentAccess.js";
import { cleanupOldRegistrationPeriods } from "./db/periods.js";

import {
  handleAdminRegistrationSettingsGet,
  handleAdminRegistrationSettingsPut,
} from "./admin/registrationSettings.js";
import {
  handleAdminSiteSettingsGet,
  handleAdminSiteSettingsPut,
} from "./admin/siteSettings.js";

import {
  handleFactoryReset,
  handleFactoryResetPreview,
} from "./admin/factoryReset.js";

import {
  handleRegionBackupCreate,
  handleRegionBackupRestore,
} from "./admin/regionBackup.js";

import {
  handleAdminCreateRegistration,
  handleAdminClearRegistrations,
  handleAdminDeleteRegistration,
  handleAdminImportRegistrations,
  handleAdminRegistrations,
  handleAdminUpdateRegistration,
} from "./admin/registrations.js";
import {
  handleAdminContentAccessGenerate,
  handleAdminContentAccessGet,
  handleAdminContentAccessPut,
  handleAdminContentAccessRevoke,
} from "./admin/contentAccess.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,

        headers: JSON_HEADERS,
      });
    }

    try {
      /* PUBLIC REGISTRATION */

      if (request.method === "POST" && url.pathname === "/api/registration") {
        return await handleRegistration(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/registration-settings"
      ) {
        return await handleCachedGet(
          request,
          () => handlePublicRegistrationSettings(env),
          30,
        );
      }

      if (request.method === "GET" && url.pathname === "/api/site-settings") {
        return await handleCachedGet(
          request,
          () => handlePublicSiteSettings(env),
          300,
        );
      }

      // Authenticated export for the GitHub Pages static-data workflow.
      if (request.method === "GET" && url.pathname === "/api/internal/public-snapshot") {
        return handlePublicSnapshot(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/internal/public-snapshot/ack") {
        return handlePublicSnapshotAck(request, env);
      }

      /* PUBLIC API */

      if (request.method === "GET" && url.pathname === "/api/recent") {
        const access = await getContentAccessState(request, env, "players");

        if (!access.allowed) {
          return json(
            {
              success: false,
              error: access.reason || "CONTENT_ACCESS_REQUIRED",
              mode: access.mode,
            },
            403,
          );
        }

        if (access.mode === "public") {
          return await handleCachedGet(
            request,
            () => handleRecent(env, url),
            15,
          );
        }

        return await handleRecent(env, url);
      }

      if (request.method === "GET" && url.pathname === "/api/stats") {
        return await handleCachedGet(
          request,

          () => handleStats(env),

          30,
        );
      }

      const contentAccessMatch = url.pathname.match(
        /^\/api\/content-access\/(players|final_plan)$/,
      );

      if (request.method === "GET" && contentAccessMatch) {
        return await handleContentAccessStatus(
          request,
          env,
          contentAccessMatch[1],
        );
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/content-access/activate"
      ) {
        return await handleContentAccessActivation(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/players") {
        const access = await getContentAccessState(request, env, "players");

        if (!access.allowed) {
          return json(
            {
              success: false,
              error: access.reason || "CONTENT_ACCESS_REQUIRED",
              mode: access.mode,
            },
            403,
          );
        }

        if (access.mode === "public") {
          return await handleCachedGet(
            request,
            () => handlePlayers(env, url),
            30,
          );
        }

        return await handlePlayers(env, url);
      }

      if (request.method === "GET" && url.pathname === "/api/final-plan") {
        return await handlePublicFinalPlan(request, env);
      }

      if (url.pathname === "/api/shared-consul/login" && request.method === "POST") return handleSharedLogin(request,env);
      if (url.pathname === "/api/shared-consul/status" && request.method === "GET") return handleSharedStatus(request,env);
      if (url.pathname === "/api/admin/shared-consul" && ["GET","POST","DELETE"].includes(request.method)) return handleSharedManage(request,env);

      /* ADMIN */
      if (request.method === "GET" && url.pathname === "/api/admin/cloudflare-metrics") {
        return await handleCloudflareMetrics(request, env);
      }




      if (url.pathname === "/api/admin/turret-plan") {
        if (request.method === "GET") return handleAdminTurretPlanGet(request, env);
      }
      if (request.method === "PUT" && url.pathname === "/api/admin/turret-plan/draft") {
        return handleAdminTurretDraftPut(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/admin/turret-plan/publish") {
        return handleAdminTurretPublish(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/admin/turret-plan/restore") {
        return handleAdminTurretRestore(request, env);
      }

      const adminContentAccessMatch = url.pathname.match(
        /^\/api\/admin\/content-access\/(players|final_plan)$/,
      );

      const adminContentAccessTokenMatch = url.pathname.match(
        /^\/api\/admin\/content-access\/(players|final_plan)\/token$/,
      );

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/content-access"
      ) {
        return await handleAdminContentAccessGet(request, env);
      }

      if (request.method === "PUT" && adminContentAccessMatch) {
        return await handleAdminContentAccessPut(
          request,
          env,
          adminContentAccessMatch[1],
        );
      }

      if (request.method === "POST" && adminContentAccessTokenMatch) {
        return await handleAdminContentAccessGenerate(
          request,
          env,
          adminContentAccessTokenMatch[1],
        );
      }

      if (request.method === "DELETE" && adminContentAccessTokenMatch) {
        return await handleAdminContentAccessRevoke(
          request,
          env,
          adminContentAccessTokenMatch[1],
        );
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/region-backup"
      ) {
        return await handleRegionBackupCreate(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/admin/region-backup/restore"
      ) {
        return await handleRegionBackupRestore(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/factory-reset-preview"
      ) {
        return await handleFactoryResetPreview(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/admin/factory-reset"
      ) {
        return await handleFactoryReset(request, env);
      }

      if (url.pathname === "/api/admin/registration-settings") {
        if (request.method === "GET") {
          return await handleAdminRegistrationSettingsGet(request, env);
        }

        if (request.method === "PUT") {
          return await handleAdminRegistrationSettingsPut(request, env);
        }
      }

      if (url.pathname === "/api/admin/site-settings") {
        if (request.method === "GET") {
          return await handleAdminSiteSettingsGet(request, env);
        }

        if (request.method === "PUT") {
          return await handleAdminSiteSettingsPut(request, env);
        }
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/registrations"
      ) {
        return await handleAdminRegistrations(request, env);
      }

      if (
        request.method === "DELETE" &&
        url.pathname === "/api/admin/registrations"
      ) {
        return await handleAdminClearRegistrations(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/admin/registrations/import"
      ) {
        return await handleAdminImportRegistrations(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/admin/registrations"
      ) {
        return await handleAdminCreateRegistration(request, env);
      }

      const adminRegistrationMatch = url.pathname.match(
        /^\/api\/admin\/registrations\/(\d+)$/,
      );

      if (adminRegistrationMatch) {
        const registrationId = Number(adminRegistrationMatch[1]);

        if (request.method === "PUT") {
          return await handleAdminUpdateRegistration(
            request,
            env,
            registrationId,
          );
        }

        if (request.method === "DELETE") {
          return await handleAdminDeleteRegistration(
            request,
            env,
            registrationId,
          );
        }
      }

      return json(
        {
          success: false,
          error: "NOT_FOUND",
        },
        404,
      );
    } catch (error) {
      console.error(error);

      return json(
        {
          success: false,
          error: "SERVER_ERROR",
        },
        500,
      );
    }
  },

  async scheduled(event, env, ctx) {
    if (event.cron === "17 0 * * *") {
      ctx.waitUntil(cleanupOldRegistrationPeriods(env));
    }
    if (event.cron === "* * * * *") {
      ctx.waitUntil((async () => {
        // The snapshot must also update when +24h after Wasteland elapses,
        // even when nobody has edited or registered a player.
        await syncPublicVisibilityRevision(env);
        await dispatchPendingPublicSnapshot(env);
      })().catch((error) => {
        // An unacknowledged revision stays dirty for the next cron attempt.
        console.error("Public snapshot dispatch:", error);
      }));
    }
  },
};
