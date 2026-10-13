import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore/lite";

import { db } from "../../../config/firebaseDb.js";

import { getDefaultPermissionsForRole, canGrantRole } from "../../../features/auth/permissions.js";

const APPROVABLE_ROLES = ["admin", "consul"];

export async function getAccessRequests() {
  const snapshot = await getDocs(collection(db, "accessRequests"));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
}

export async function approveAccessRequest({
  request,
  selectedRole,
  currentUserRole,
  canManageRequests = true,
  canGrantAdmin = true,
}) {
  if (!APPROVABLE_ROLES.includes(selectedRole)) {
    throw new Error("INVALID_ACCESS_ROLE");
  }

  if (!canManageRequests || !canGrantRole(currentUserRole, selectedRole) ||
      (selectedRole === "admin" && !canGrantAdmin)) {
    throw new Error("ACCESS_DENIED");
  }

  if (!request.uid) {
    throw new Error("REQUEST_UID_MISSING");
  }

  const userRef = doc(db, "adminUsers", request.uid);

  const requestRef = doc(db, "accessRequests", request.id);

  const batch = writeBatch(db);

  batch.set(
    userRef,
    {
      displayName: request.displayName || request.email || "",

      email: request.email || "",

      role: selectedRole,

      active: true,

      permissions: getDefaultPermissionsForRole(selectedRole),

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  batch.update(requestRef, {
    requestedRole: selectedRole,

    status: "approved",

    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function rejectAccessRequest(requestId) {
  const requestRef = doc(db, "accessRequests", requestId);

  const batch = writeBatch(db);

  batch.update(requestRef, {
    status: "rejected",

    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function deleteAccessRequest(requestId) {
  await deleteDoc(doc(db, "accessRequests", requestId));
}
