const guestUser = { id: 'guest', type: 'guest', name: 'Guest player', email: 'local guest mode', photo: '' };

export function createAuth({ onChange } = {}) {
  let user = loadUser();
  let firebaseReady = false;
  let fb = null;

  async function ensureFirebase() {
    const cfg = window.WKD_FIREBASE_CONFIG || {};
    const hasConfig = ['apiKey', 'authDomain', 'projectId', 'appId'].every(k => cfg[k]);
    if (!hasConfig) return false;
    if (firebaseReady) return true;
    try {
      const appMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
      const authMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
      const app = appMod.initializeApp(cfg);
      const auth = authMod.getAuth(app);
      fb = { ...authMod, auth };
      firebaseReady = true;
      return true;
    } catch (error) {
      console.warn('Firebase init failed', error);
      return false;
    }
  }

  function setUser(next) {
    user = next || guestUser;
    localStorage.setItem('wkd_user_v1', JSON.stringify(user));
    onChange?.(user);
  }

  return {
    getUser: () => user,
    signInAsGuest: () => setUser(guestUser),
    async signInWithGoogle() {
      const ready = await ensureFirebase();
      if (!ready) {
        setUser(guestUser);
        return { ok: false, message: 'google_not_ready' };
      }
      try {
        const provider = new fb.GoogleAuthProvider();
        const result = await fb.signInWithPopup(fb.auth, provider);
        const u = result.user;
        setUser({ id: u.uid, type: 'google', name: u.displayName || 'Google player', email: u.email || '', photo: u.photoURL || '' });
        return { ok: true, message: 'guest_ready' };
      } catch (error) {
        console.warn('Google sign-in failed', error);
        return { ok: false, message: 'google_error' };
      }
    },
    async signOut() {
      if (firebaseReady && fb?.auth?.currentUser) await fb.signOut(fb.auth).catch(() => {});
      setUser(guestUser);
    }
  };
}

function loadUser() {
  try { return JSON.parse(localStorage.getItem('wkd_user_v1')) || guestUser; }
  catch { return guestUser; }
}
