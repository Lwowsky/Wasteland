import { signOut } from "firebase/auth";

import { auth } from "../../config/firebaseAuth.js";

export async function logout() {
  await signOut(auth);
}
