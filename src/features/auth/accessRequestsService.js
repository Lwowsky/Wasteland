import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore/lite";

import { db } from "../../config/firebaseDb.js";

const ALLOWED_REQUEST_ROLES = ["admin", "consul"];

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export async function getAccessRequest(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const requestRef = doc(db, "accessRequests", normalizedEmail);

  const snapshot = await getDoc(requestRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function submitAccessRequest({
  uid,
  displayName,
  email,
  requestedRole,
  comment,
}) {
  const normalizedEmail = normalizeEmail(email);

  if (!uid) {
    throw new Error("ACCESS_REQUEST_UID_REQUIRED");
  }

  if (!normalizedEmail) {
    throw new Error("ACCESS_REQUEST_EMAIL_REQUIRED");
  }

  if (!ALLOWED_REQUEST_ROLES.includes(requestedRole)) {
    throw new Error("ACCESS_REQUEST_INVALID_ROLE");
  }

  const requestRef = doc(db, "accessRequests", normalizedEmail);

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(requestRef);

    if (existing.exists()) {
      throw new Error("ACCESS_REQUEST_ALREADY_EXISTS");
    }

    transaction.set(requestRef, {
      uid,

      displayName: String(displayName || "").trim(),

      email: normalizedEmail,

      requestedRole,

      comment: String(comment || "").trim(),

      status: "pending",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    });
  });
}
