import { requestJson } from "../../utils/apiClient.js";
const STORAGE = "wasteland_shared_consul_session";
export function getSharedSession() {
 try { const data=JSON.parse(sessionStorage.getItem(STORAGE) || "null");
   if(data?.token?.startsWith("shared_") && data.expiresAt > Date.now()/1000) return data;
 } catch { /* invalid session */ }
 return null;
}
export function forgetSharedSession() { sessionStorage.removeItem(STORAGE); window.dispatchEvent(new Event("wasteland-shared-auth")); }
export async function signInSharedConsul(password) {
 const data=await requestJson("/api/shared-consul/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
 sessionStorage.setItem(STORAGE,JSON.stringify({token:data.token,expiresAt:data.expiresAt}));
 window.dispatchEvent(new Event("wasteland-shared-auth"));
 return data;
}
export async function checkSharedConsul() {
 const session=getSharedSession();
 if (!session) return null;
 try {
  const data=await requestJson("/api/shared-consul/status",{headers:{Authorization:`Bearer ${session.token}`}});
  return data.admin;
 } catch { forgetSharedSession();return null; }
}
