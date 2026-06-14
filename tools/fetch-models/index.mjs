#!/usr/bin/env node
// Bezieht die GEBÜNDELTEN ML-Modell-Artefakte gemäß models.manifest.json
// (schemaVersion 2) und verifiziert sie per SHA-256. Die Binaries liegen nicht
// im Git (data/models/* ist ignoriert); dieser Schritt läuft vor dem Bundle
// (CI vor `expo prebuild`, lokal vor `dev`).
//
// Nur Einträge mit `distribution: "bundled"` werden hier geladen – `ota`-Modelle
// bezieht der Lifecycle (packages/ai-engine) zur Laufzeit auf dem Gerät.
//
// Verwendung:  node tools/fetch-models/index.mjs   (bzw. `pnpm fetch-models`)
// Bereits vorhandene, prüfsummen-gültige Dateien werden übersprungen.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = resolve(repoRoot, "tools/fetch-models/models.manifest.json");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function existingIsValid(absDest, expected) {
  try {
    const existing = await readFile(absDest);
    return sha256(existing) === expected;
  } catch {
    return false;
  }
}

async function fetchArtifact(label, artifact) {
  const absDest = resolve(repoRoot, artifact.dest);

  if (await existingIsValid(absDest, artifact.sha256)) {
    console.log(`✓ ${label}: bereits vorhanden & verifiziert`);
    return;
  }

  console.log(`↓ ${label}: lade ${artifact.url}`);
  const response = await fetch(artifact.url);
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status} für ${artifact.url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const actual = sha256(buffer);
  if (actual !== artifact.sha256) {
    throw new Error(
      `${label}: SHA-256 stimmt nicht. Erwartet ${artifact.sha256}, erhalten ${actual}.`,
    );
  }

  await mkdir(dirname(absDest), { recursive: true });
  await writeFile(absDest, buffer);
  console.log(`✓ ${label}: ${artifact.dest} (${buffer.length} Bytes) verifiziert`);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.schemaVersion !== 2) {
  throw new Error(`models.manifest.json: schemaVersion ${manifest.schemaVersion} != 2.`);
}

const bundled = manifest.models.filter((m) => m.distribution === "bundled");
if (bundled.length === 0) {
  console.log("Keine gebündelten Modelle im Manifest – nichts zu tun.");
}

for (const model of bundled) {
  await fetchArtifact(`${model.id} (model)`, model.artifacts.model);
  if (model.artifacts.labels) {
    await fetchArtifact(`${model.id} (labels)`, model.artifacts.labels);
  }
}
console.log("Fertig.");
