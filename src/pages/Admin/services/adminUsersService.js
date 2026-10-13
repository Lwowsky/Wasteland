import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore/lite";

import { db } from "../../../config/firebaseDb.js";

import { sanitizePermissionsForRole } from "../../../features/auth/permissions.js";

export async function getAdminUsers() {
  const snapshot = await getDocs(collection(db, "adminUsers"));

  return snapshot.docs.map((docItem) => {
    const data = docItem.data();

    const role = data.role || "consul";

    const displayName =
      data.displayName || data.name || data.nickname || data.email || "";

    return {
      id: docItem.id,

      ...data,

      displayName,

      email: data.email || "",

      role,

      active: data.active === true,

      permissions: sanitizePermissionsForRole(role, data.permissions || {}),
    };
  });
}

export async function updateAdminUserAccess(
  userId,
  { role, active, permissions },
) {
  if (role !== "admin" && role !== "consul") {
    throw new Error("INVALID_ROLE");
  }

  const cleanPermissions = sanitizePermissionsForRole(role, permissions);

  await updateDoc(doc(db, "adminUsers", userId), {
    role,

    active: active === true,

    permissions: cleanPermissions,

    updatedAt: serverTimestamp(),
  });
}


export async function deleteAdminUser(userId) {
  await deleteDoc(doc(db, "adminUsers", userId));
}
