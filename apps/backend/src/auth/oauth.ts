import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

import type { OAuthProvider } from "@spotforge/api-contract";

// Verifikation der vom Client gelieferten **ID-Tokens** (Sign-in with Google /
// Apple). Wir prüfen Signatur (gegen die JWKS des Anbieters), Aussteller und
// erlaubte Audience(s) – erst dann gilt die Identität als belegt.
//
// Der Key-Resolver ist injizierbar, damit Tests ohne Netzwerk gegen ein lokales
// Schlüsselpaar verifizieren können.

/** Belegte Identität aus einem verifizierten ID-Token. */
export interface VerifiedIdentity {
  readonly provider: OAuthProvider;
  readonly subject: string;
  readonly email?: string;
  readonly displayName?: string;
}

/** Anbieter-spezifische Verifikationsparameter. */
interface ProviderSpec {
  readonly issuer: string | string[];
  readonly audiences: readonly string[];
  readonly getKey: JWTVerifyGetKey;
}

export interface OAuthVerifierConfig {
  readonly googleClientIds: readonly string[];
  readonly appleClientIds: readonly string[];
  /** Test-Hook: ersetzt den JWKS-Resolver je Anbieter (Default: Remote-JWKS). */
  readonly keyResolvers?: Partial<Record<OAuthProvider, JWTVerifyGetKey>>;
}

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

export class OAuthVerifier {
  private readonly specs: Record<OAuthProvider, ProviderSpec>;

  constructor(config: OAuthVerifierConfig) {
    this.specs = {
      google: {
        issuer: GOOGLE_ISSUERS,
        audiences: config.googleClientIds,
        getKey: config.keyResolvers?.google ?? createRemoteJWKSet(GOOGLE_JWKS_URL),
      },
      apple: {
        issuer: APPLE_ISSUER,
        audiences: config.appleClientIds,
        getKey: config.keyResolvers?.apple ?? createRemoteJWKSet(APPLE_JWKS_URL),
      },
    };
  }

  /**
   * Verifiziert ein ID-Token und liefert die belegte Identität. Wirft, wenn die
   * Signatur ungültig, der Aussteller/die Audience nicht passt oder für den
   * Anbieter keine erlaubten Client-IDs konfiguriert sind.
   */
  async verify(provider: OAuthProvider, idToken: string): Promise<VerifiedIdentity> {
    const spec = this.specs[provider];
    if (spec.audiences.length === 0) {
      throw new Error(`OAuth-Anbieter '${provider}' ist nicht konfiguriert`);
    }

    const { payload } = await jwtVerify(idToken, spec.getKey, {
      issuer: spec.issuer,
      audience: spec.audiences as string[],
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("ID-Token ohne 'sub'");
    }

    const email = typeof payload.email === "string" ? payload.email : undefined;
    const name = typeof payload.name === "string" ? payload.name : undefined;

    return { provider, subject: payload.sub, email, displayName: name };
  }
}
