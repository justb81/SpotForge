/** Access-Token-Claims (Payload unseres eigenen, kurzlebigen JWT). */
export interface AccessTokenClaims {
  /** Konto-ID (Subject). */
  sub: string;
  /** Mandant, an den dieses Token gebunden ist (= AppDefinition.id). */
  appId: string;
}

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/**
 * Wandelt eine kurze Dauer-Angabe (`"15m"`, `"1h"`, `"30s"`, `"7d"`) in Sekunden.
 * Eine reine Zahl wird als Sekunden interpretiert. Dient dazu, dem Client die
 * verbleibende Access-Token-Lebensdauer (`expiresIn`) konsistent zur
 * `@fastify/jwt`-Signatur mitzugeben.
 */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Ungültige Dauer-Angabe: '${value}'`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  return unit ? amount * UNIT_SECONDS[unit]! : amount;
}
