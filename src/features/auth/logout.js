import { signOut } from "firebase/auth";

import { auth } from "../../config/firebaseAuth.js";
import { setAdminMenuHint } from "./adminMenuHint.js";

export async function logout() {
  await signOut(auth);
  setAdminMenuHint(false);
}
