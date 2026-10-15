import { checkSharedConsul, getSharedSession } from "./sharedConsulClient.js";
import { useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore/lite";

import { auth } from "../../config/firebaseAuth.js";
import { db } from "../../config/firebaseDb.js";

function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authVersion = 0;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentVersion = ++authVersion;

      if (!firebaseUser) {
        const shared = getSharedSession() ? await checkSharedConsul() : null;
        if (active && currentVersion === authVersion) {
          setUser(shared ? { uid: "shared-consul" } : null);
          setAdmin(shared);
          setLoading(false);
        }

        return;
      }

      if (active) {
        setUser(firebaseUser);
        setAdmin(null);
        setLoading(true);
      }

      try {
        const adminRef = doc(db, "adminUsers", firebaseUser.uid);
        const adminSnap = await getDoc(adminRef);

        if (!active || currentVersion !== authVersion) {
          return;
        }

        if (!adminSnap.exists()) {
          setAdmin(null);
          return;
        }

        const adminData = adminSnap.data();

        if (adminData.active !== true) {
          setAdmin(null);
          return;
        }

        setAdmin({
          id: adminSnap.id,
          ...adminData,
        });
      } catch (error) {
        console.error("Admin access check failed:", error);

        if (active && currentVersion === authVersion) {
          setAdmin(null);
        }
      } finally {
        if (active && currentVersion === authVersion) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      authVersion += 1;
      unsubscribe();
    };
  }, []);

  return {
    user,
    admin,
    loading,
    isAdmin: Boolean(admin),
  };
}

export default useAdminAuth;
