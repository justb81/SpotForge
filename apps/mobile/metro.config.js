// Metro-Config für das pnpm-Monorepo. Ohne diese Anpassungen findet Metro die
// per Symlink eingebundenen Workspace-Pakete (@spotforge/*) nicht.
// Siehe https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Den gesamten Workspace beobachten (Quelländerungen in packages/* live).
config.watchFolders = [workspaceRoot];

// 2. node_modules sowohl der App als auch der Workspace-Wurzel auflösen.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. ExecuTorch-Modelle als Assets bündeln (#50). Das gebündelte .pte wird per
//    require eingebunden und von react-native-executorch geladen.
config.resolver.assetExts.push("pte");

module.exports = config;
