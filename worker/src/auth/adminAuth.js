export function getBearerToken(request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    while (base64.length % 4) {
      base64 += "=";
    }

    const payload = atob(base64);

    const decoded = decodeURIComponent(
      Array.from(payload)
        .map(
          (character) =>
            `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
        )
        .join(""),
    );

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getFirestoreString(field) {
  return field?.stringValue ?? "";
}

function getFirestoreBoolean(field) {
  return field?.booleanValue === true;
}

export async function verifyAdminRequest(request, env) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "AUTH_REQUIRED",
    };
  }

  const payload = decodeJwtPayload(token);

  const uid = payload?.user_id || payload?.sub;

  if (!uid) {
    return {
      ok: false,
      status: 401,
      error: "INVALID_TOKEN",
    };
  }

  if (!env.FIREBASE_PROJECT_ID) {
    return {
      ok: false,
      status: 500,
      error: "AUTH_CONFIGURATION_ERROR",
    };
  }

  const firestoreUrl =
    `https://firestore.googleapis.com/v1/projects/` +
    `${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/adminUsers/` +
    encodeURIComponent(uid);

  const response = await fetch(firestoreUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 403,
      error: "ADMIN_ACCESS_DENIED",
    };
  }

  const document = await response.json();

  const fields = document.fields || {};

  const role = getFirestoreString(fields.role);

  const active = getFirestoreBoolean(fields.active);

  const allowedRoles = ["owner", "admin", "consul"];

  if (!active || !allowedRoles.includes(role)) {
    return {
      ok: false,
      status: 403,
      error: "ADMIN_ACCESS_DENIED",
    };
  }

  return {
    ok: true,
    uid,
    role,

    displayName: getFirestoreString(fields.displayName),

    email: getFirestoreString(fields.email),
  };
}
