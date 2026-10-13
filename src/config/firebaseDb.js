import { getFirestore } from "firebase/firestore/lite";

import firebaseApp from "./firebaseApp.js";

export const db = getFirestore(firebaseApp);
