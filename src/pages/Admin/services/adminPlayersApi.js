import { adminRequest } from "./adminApi.js";

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && !value.includes("T")) {
    return `${value.replace(" ", "T")}Z`;
  }

  return value;
}

function normalizeRegistration(registration) {
  return {
    ...registration,

    id: String(registration.id),

    lairLevel: Number(registration.lairLevel || 0),
    marchSize: Number(registration.marchSize || 0),
    rallySize: Number(registration.rallySize || 0),

    readyAttack: registration.readyAttack === true,
    captain: registration.captain === true,

    readiness: {
      attack: registration.readyAttack === true,
      captain: registration.captain === true,
    },

    createdAt: normalizeDate(registration.createdAt),
    updatedAt: normalizeDate(registration.updatedAt),
    submittedAt: normalizeDate(registration.createdAt),
  };
}

export async function getAdminRegistrations() {
  const data = await adminRequest("/api/admin/registrations");

  return {
    ...data,

    registrations: (data.registrations || []).map(normalizeRegistration),
  };
}

export async function getAdminRegistrationChanges(periodId, cursor) {
  const data = await adminRequest(
    `/api/admin/registrations/changes?periodId=${encodeURIComponent(periodId)}&after=${encodeURIComponent(cursor)}`,
    { cache: "no-store" },
  );
  return { ...data, upserts: (data.upserts || []).map(normalizeRegistration) };
}

export async function createAdminRegistration(player) {
  return adminRequest("/api/admin/registrations", {
    method: "POST",
    body: JSON.stringify(player),
  });
}

export async function updateAdminRegistration(playerId, player) {
  return adminRequest(`/api/admin/registrations/${playerId}`, {
    method: "PUT",
    body: JSON.stringify(player),
  });
}

export async function deleteAdminRegistration(playerId) {
  return adminRequest(`/api/admin/registrations/${playerId}`, {
    method: "DELETE",
  });
}

export async function importAdminRegistrations(players, mode = "skipExisting") {
  return adminRequest("/api/admin/registrations/import", {
    method: "POST",
    body: JSON.stringify({ players, mode }),
  });
}

export async function clearAdminPlayerTable() {
  return adminRequest("/api/admin/registrations", {
    method: "DELETE",
  });
}
