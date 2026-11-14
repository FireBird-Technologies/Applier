import { api } from "../api/client";
import type { AuthOut } from "../api/types";
import { GOOGLE_CLIENT_ID } from "../config";
import { setToken } from "./storage";

/** Google sign-in via an OAuth implicit flow that returns an ID token the backend verifies. */
export async function signInWithGoogle(): Promise<AuthOut> {
  if (!GOOGLE_CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID is not set");
  const nonce = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: "id_token",
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });
  const redirect = await chrome.identity.launchWebAuthFlow({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    interactive: true,
  });
  const hash = new URLSearchParams((redirect ?? "").split("#")[1] ?? "");
  const idToken = hash.get("id_token");
  if (!idToken) throw new Error("Google sign-in was cancelled");
  const auth = await api.loginWithGoogle(idToken);
  await setToken(auth.access_token);
  return auth;
}
