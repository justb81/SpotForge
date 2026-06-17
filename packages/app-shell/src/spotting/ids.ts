// Lokale ID-/Zeitquellen für client-seitig erzeugte Drafts. Rein & ohne RN/I/O,
// injizierbar für deterministische Tests. Beim (online) Forgen vergibt der Server
// ggf. eine eigene ID (ADR 0010).

/** Lokale, kollisionsarme Draft-ID. */
export function localDraftId(): string {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Aktueller Zeitstempel als ISO-8601-String. */
export function nowIso(): string {
  return new Date().toISOString();
}
