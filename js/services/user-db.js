import { getFirebase } from './firebase-service.js';

export async function saveSignedInUser(user) {
  if (!user) return null;
  const firebase = await getFirebase();
  if (!firebase) return null;

  const { db, firestoreMod } = firebase;
  const ref = firestoreMod.doc(db, 'users', user.uid);
  const snapshot = await firestoreMod.getDoc(ref);
  const now = firestoreMod.serverTimestamp();
  const profile = {
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    providerId: user.providerData?.[0]?.providerId || 'google.com',
    lastLoginAt: now,
    updatedAt: now
  };

  if (!snapshot.exists()) {
    profile.createdAt = now;
    profile.role = 'player';
    profile.gameProfile = {
      nickname: '',
      alliance: '',
      region: '',
      state: 'new'
    };
  }

  await firestoreMod.setDoc(ref, profile, { merge: true });
  return profile;
}
