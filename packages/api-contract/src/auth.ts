import { z } from "zod";

// Geteilter Auth-Vertrag zwischen Backend (Validierung) und api-client (Typen).
// Eine einzige Quelle für Request-/Response-Formen – kein Drift zwischen Server
// und Client.

/** Unterstützte OAuth2-Anbieter (Sign-in with Google / Apple). */
export const oauthProviderSchema = z.enum(["google", "apple"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

/**
 * Login: der Client lässt sich beim Anbieter anmelden und schickt dessen
 * **ID-Token** (JWT) hier herein. Das Backend verifiziert es (Signatur via
 * JWKS + erlaubte Audience), legt/holt das mandanten-gebundene Konto und gibt
 * eigene Tokens zurück. Der Mandant kommt aus dem `x-app-id`-Header.
 */
export const loginRequestSchema = z.object({
  provider: oauthProviderSchema,
  idToken: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Refresh: ein gültiges Refresh-Token gegen ein neues Token-Paar tauschen. */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

/** Öffentliche Konto-Sicht (keine internen Felder). */
export const accountSchema = z.object({
  id: z.string().uuid(),
  appId: z.string().min(1),
  displayName: z.string().nullable(),
});
export type Account = z.infer<typeof accountSchema>;

/**
 * Token-Paar: kurzlebiges Access-Token (Bearer für fachliche Routen) +
 * langlebiges Refresh-Token (rotiert bei jedem Refresh, in Redis hinterlegt).
 */
export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  // Sekunden bis zum Ablauf des Access-Tokens (für den Client-Refresh-Timer).
  expiresIn: z.number().int().positive(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

/** Antwort auf Login & Refresh: Konto + Tokens. */
export const authResponseSchema = z.object({
  account: accountSchema,
  tokens: tokenPairSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
