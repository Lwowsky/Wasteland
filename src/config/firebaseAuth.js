import { getAuth } from "firebase/auth";

import firebaseApp from "./firebaseApp.js";

export const auth = getAuth(firebaseApp);
