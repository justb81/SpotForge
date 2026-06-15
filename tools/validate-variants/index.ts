#!/usr/bin/env tsx
// Validiert ALLE Varianten unter variants/<name>/app.definition.ts über den
// Loader aus @spotforge/app-config. Exit-Code != 0 bei jedem Fehler – dient als
// CI-Gate vor dem Build (analog zu validate-categories). Wird via tsx
// ausgeführt, da Varianten TypeScript-Module sind.
//
// Verwendung:  pnpm validate-variants   (bzw. tsx tools/validate-variants/index.ts)

import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadVariant } from "@spotforge/app-config/loader";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const variantsDir = resolve(repoRoot, "variants");

async function main(): Promise<void> {
  // Jeder Unterordner mit app.definition.ts ist eine Variante.
  const names = readdirSync(variantsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(resolve(variantsDir, entry.name, "app.definition.ts")),
    )
    .map((entry) => entry.name)
    .sort();

  if (names.length === 0) {
    console.error("✗ Keine Varianten (variants/<name>/app.definition.ts) gefunden.");
    process.exit(1);
  }

  const errors: string[] = [];
  for (const name of names) {
    try {
      await loadVariant(name, { variantsDir });
      console.log(`✓ ${name}`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} ungültige Variante(n):`);
    for (const message of errors) {
      console.error(
        message
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      );
    }
    process.exit(1);
  }

  console.log(`\n✓ ${names.length} Variante(n) valide: ${names.join(", ")}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
