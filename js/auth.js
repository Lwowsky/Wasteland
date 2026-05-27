import { mergeForms, mergeRegistrations, setUser } from "./state.js";

const FIREBASE_VERSION = "10.12.5";
let firebaseReady = false;
let auth = null;
let db = null;
let currentUser = null;
let firebaseApi = null;
let notify = () => {};

function configIsReady() {
  const config = window.WKD_FIREBASE_CONFIG || {};
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function publicUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName || "Google user",
    email: user.email || "",
    photoURL: user.photoURL || ""
  };
}

async function loadFirebase() {
  const appUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
  const authUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;
  const storeUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`;
  const [appMod, authMod, storeMod] = await Promise.all([
    import(appUrl),
    import(authUrl),
    import(storeUrl)
  ]);
  return { ...appMod, ...authMod, ...storeMod };
}

async function pullCloudData(uid) {
  if (!firebaseReady || !db || !uid) return;
  const { collection, getDocs, query, where } = firebaseApi;
  const formsQuery = query(collection(db, "regionForms"), where("ownerUid", "==", uid));
  const formsSnap = await getDocs(formsQuery);
  mergeForms(formsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

  const regsQuery = query(collection(db, "playerRegistrations"), where("ownerUid", "==", uid));
  const regsSnap = await getDocs(regsQuery);
  mergeRegistrations(regsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
}

export async function initAuth(options = {}) {
  notify = options.notify || notify;
  const signInBtn = document.querySelector("#signInBtn");
  const signOutBtn = document.querySelector("#signOutBtn");
  const guestModeBtn = document.querySelector("#guestModeBtn");
  const notice = document.querySelector("#firebaseNotice");

  if (!configIsReady()) {
    notice?.classList.remove("is-hidden");
    signInBtn?.addEventListener("click", () => notify("google_not_configured"));
    guestModeBtn?.addEventListener("click", () => notify("guest_ready"));
    setUser(null);
    return api();
  }

  try {
    firebaseApi = await loadFirebase();
    const config = window.WKD_FIREBASE_CONFIG;
    const app = firebaseApi.getApps().length ? firebaseApi.getApp() : firebaseApi.initializeApp(config);
    auth = firebaseApi.getAuth(app);
    db = firebaseApi.getFirestore(app);
    firebaseReady = true;
    notice?.classList.add("is-hidden");

    firebaseApi.onAuthStateChanged(auth, async (user) => {
      currentUser = publicUser(user);
      setUser(currentUser);
      signInBtn?.classList.toggle("is-hidden", Boolean(user));
      signOutBtn?.classList.toggle("is-hidden", !user);
      if (user) await pullCloudData(user.uid);
    });
  } catch (error) {
    console.error("Firebase init failed", error);
    notify("firebase_error");
    setUser(null);
  }

  signInBtn?.addEventListener("click", signInWithGoogle);
  signOutBtn?.addEventListener("click", signOutUser);
  guestModeBtn?.addEventListener("click", () => notify("guest_ready"));

  return api();
}

async function signInWithGoogle() {
  if (!firebaseReady || !auth) return notify("google_not_configured");
  const provider = new firebaseApi.GoogleAuthProvider();
  await firebaseApi.signInWithPopup(auth, provider);
}

async function signOutUser() {
  if (!firebaseReady || !auth) return;
  await firebaseApi.signOut(auth);
}

async function saveRegionForm(form) {
  if (!firebaseReady || !db || !currentUser) return false;
  const { doc, setDoc } = firebaseApi;
  await setDoc(doc(db, "regionForms", form.id), {
    ...form,
    ownerUid: currentUser.uid,
    ownerName: currentUser.name,
    ownerEmail: currentUser.email
  }, { merge: true });
  return true;
}

async function savePlayerRegistration(entry) {
  if (!firebaseReady || !db) return false;
  const { doc, setDoc } = firebaseApi;
  await setDoc(doc(db, "playerRegistrations", entry.id), {
    ...entry,
    ownerUid: currentUser?.uid || "guest"
  }, { merge: true });
  return true;
}

function api() {
  return {
    isReady: () => firebaseReady,
    getUser: () => currentUser,
    saveRegionForm,
    savePlayerRegistration,
    pullCloudData: () => pullCloudData(currentUser?.uid)
  };
}
