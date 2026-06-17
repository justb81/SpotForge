import { generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { OAuthVerifier } from "./oauth";

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

// Verifiziert gegen ein lokal erzeugtes Schlüsselpaar (kein Netzwerk): der
// Key-Resolver wird injiziert, sodass wir Signatur-, Issuer- und Audience-
// Prüfung deterministisch testen können.

const ISSUER = "https://accounts.google.com";
const AUDIENCE = "client-123.apps.googleusercontent.com";

let privateKey: KeyPair["privateKey"];
let publicKey: KeyPair["publicKey"];

async function signGoogleToken(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject((claims.sub as string) ?? "user-1")
    .setExpirationTime("5m")
    .sign(privateKey);
}

function makeVerifier(): OAuthVerifier {
  return new OAuthVerifier({
    googleClientIds: [AUDIENCE],
    appleClientIds: [],
    keyResolvers: { google: () => Promise.resolve(publicKey) },
  });
}

beforeAll(async () => {
  ({ privateKey, publicKey } = await generateKeyPair("RS256"));
});

describe("OAuthVerifier", () => {
  it("verifiziert ein gültiges ID-Token und liefert die Identität", async () => {
    const token = await signGoogleToken({
      sub: "google-sub-1",
      email: "a@example.com",
      name: "Ada",
    });
    const identity = await makeVerifier().verify("google", token);
    expect(identity).toEqual({
      provider: "google",
      subject: "google-sub-1",
      email: "a@example.com",
      displayName: "Ada",
    });
  });

  it("lehnt eine falsche Audience ab", async () => {
    const token = await new SignJWT({ sub: "x" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(ISSUER)
      .setAudience("someone-else")
      .setExpirationTime("5m")
      .sign(privateKey);
    await expect(makeVerifier().verify("google", token)).rejects.toThrow();
  });

  it("lehnt ab, wenn der Anbieter nicht konfiguriert ist", async () => {
    const token = await signGoogleToken({ sub: "x" });
    await expect(makeVerifier().verify("apple", token)).rejects.toThrow(/nicht konfiguriert/);
  });
});
