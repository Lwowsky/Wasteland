import { signOut } from "firebase/auth";

import { auth } from "../../config/firebaseAuth.js";
import { setAdminMenuHint } from "./adminMenuHint.js";
import { clearAdminPlayersCache } from "../../pages/Admin/services/adminPlayersCache.js";

export async function logout() {
  clearAdminPlayersCache();
  await signOut(auth);
  setAdminMenuHint(false);
}
