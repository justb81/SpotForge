import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent registriert die Wurzelkomponente für native Builds
// (Development-/Preview-/Production-Build). SpotForge nutzt durchgängig
// Development Builds; Expo Go ist kein Ziel (native Module wie ONNX Runtime).
registerRootComponent(App);
