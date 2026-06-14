#!/usr/bin/env node
// Bezieht die gebündelten ML-Modelle gemäß models.manifest.json und verifiziert
// sie per SHA-256. Die Binaries liegen nicht im Git (data/models/* ist ignoriert);
// dieser Schritt läuft vor dem Bundle (CI vor `expo prebuild`, lokal vor `dev`).
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

async function fetchModel(model) {
  const absDest = resolve(repoRoot, model.dest);

  if (await existingIsValid(absDest, model.sha256)) {
    console.log(`✓ ${model.name}: bereits vorhanden & verifiziert`);
    return;
  }

  console.log(`↓ ${model.name}: lade ${model.url}`);
  const response = await fetch(model.url);
  if (!response.ok) {
    throw new Error(`${model.name}: HTTP ${response.status} für ${model.url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const actual = sha256(buffer);
  if (actual !== model.sha256) {
    throw new Error(
      `${model.name}: SHA-256 stimmt nicht. Erwartet ${model.sha256}, erhalten ${actual}.`,
    );
  }

  await mkdir(dirname(absDest), { recursive: true });
  await writeFile(absDest, buffer);
  console.log(`✓ ${model.name}: ${model.dest} (${buffer.length} Bytes) verifiziert`);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const model of manifest.models) {
  await fetchModel(model);
}
console.log("Fertig.");
