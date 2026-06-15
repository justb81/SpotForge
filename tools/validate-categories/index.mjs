#!/usr/bin/env node
// Validiert ALLE Kategorie-Schemata unter data/categories/*.json gegen den
// Vertrag aus @spotforge/game-core (CategoryDefinition / AttributeDefinition).
// Exit-Code != 0 bei jedem Schema-Verstoß (dient als CI-Gate). Reine Node-
// Built-ins, keine Abhängigkeiten.
//
// Verwendung:  node tools/validate-categories/index.mjs   (bzw. `pnpm validate-categories`)

import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const categoriesDir = resolve(repoRoot, "data/categories");

// Kanonische Kategorie-IDs. Quelle der Wahrheit: packages/game-core/src/category.ts
// (CATEGORY_IDS) – synchron halten. Es müssen nicht alle eine Datei haben (wir
// starten mit einer Teilmenge); vorhandene Dateien müssen aber eine gültige ID tragen.
const CATEGORY_IDS = [
  "vehicles",
  "aviation",
  "animals",
  "plants",
  "construction",
  "watercraft",
  "rail",
  "structures",
  "fungi",
  "minerals",
];

// Erlaubte Felder – überflüssige Keys (z.B. Tippfehler) sollen auffallen.
const CATEGORY_KEYS = new Set(["id", "name", "emoji", "examples", "attributes"]);
const ATTRIBUTE_KEYS = new Set(["key", "label", "unit", "trumpfable", "higherIsBetter"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

// Sammelt Fehler je Datei (statt beim ersten abzubrechen), damit ein Lauf alles zeigt.
function validateCategory(fileName, data, errors) {
  const fail = (msg) => errors.push(`${fileName}: ${msg}`);
  const expectedId = fileName.replace(/\.json$/, "");

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    fail("Wurzel muss ein Objekt sein.");
    return;
  }

  for (const key of Object.keys(data)) {
    if (!CATEGORY_KEYS.has(key)) fail(`unbekanntes Feld "${key}".`);
  }

  if (!isNonEmptyString(data.id)) {
    fail('Feld "id" fehlt oder ist leer.');
  } else {
    if (data.id !== expectedId) fail(`id "${data.id}" != Dateiname "${expectedId}".`);
    if (!CATEGORY_IDS.includes(data.id)) fail(`id "${data.id}" ist keine bekannte Kategorie.`);
  }

  if (!isNonEmptyString(data.name)) fail('Feld "name" fehlt oder ist leer.');
  if (!isNonEmptyString(data.emoji)) fail('Feld "emoji" fehlt oder ist leer.');

  if (data.examples !== undefined) {
    if (!Array.isArray(data.examples) || !data.examples.every(isNonEmptyString)) {
      fail('Feld "examples" muss ein Array nicht-leerer Strings sein.');
    }
  }

  if (!Array.isArray(data.attributes) || data.attributes.length === 0) {
    fail('Feld "attributes" muss ein nicht-leeres Array sein.');
    return;
  }

  const seenKeys = new Set();
  let trumpfableCount = 0;

  data.attributes.forEach((attr, i) => {
    const at = (msg) => fail(`attributes[${i}]: ${msg}`);
    if (attr === null || typeof attr !== "object" || Array.isArray(attr)) {
      at("muss ein Objekt sein.");
      return;
    }
    for (const key of Object.keys(attr)) {
      if (!ATTRIBUTE_KEYS.has(key)) at(`unbekanntes Feld "${key}".`);
    }
    if (!isNonEmptyString(attr.key)) {
      at('"key" fehlt oder ist leer.');
    } else if (seenKeys.has(attr.key)) {
      at(`doppelter key "${attr.key}".`);
    } else {
      seenKeys.add(attr.key);
    }
    if (!isNonEmptyString(attr.label)) at('"label" fehlt oder ist leer.');
    if (typeof attr.unit !== "string") at('"unit" muss ein String sein (leer erlaubt).');
    if (typeof attr.trumpfable !== "boolean") at('"trumpfable" muss boolean sein.');
    if (typeof attr.higherIsBetter !== "boolean") at('"higherIsBetter" muss boolean sein.');
    if (attr.trumpfable === true) trumpfableCount += 1;
  });

  if (trumpfableCount === 0) {
    fail("mindestens ein Attribut muss trumpffähig sein (sonst nicht spielbar).");
  }
}

const entries = await readdir(categoriesDir);
const files = entries.filter((f) => f.endsWith(".json")).sort();

if (files.length === 0) {
  console.error("✗ Keine Kategorie-Dateien in data/categories gefunden.");
  process.exit(1);
}

const errors = [];
for (const fileName of files) {
  const raw = await readFile(resolve(categoriesDir, fileName), "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    errors.push(`${fileName}: ungültiges JSON – ${err.message}`);
    continue;
  }
  validateCategory(fileName, data, errors);
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} Fehler in ${files.length} Kategorie-Datei(en):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`✓ ${files.length} Kategorie-Datei(en) valide: ${files.join(", ")}`);
