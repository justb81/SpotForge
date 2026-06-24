// Babel-Konfiguration des Expo-Hosts. `babel-preset-expo` ist die Basis; das
// **react-native-worklets**-Plugin (von react-native-reanimated 4 bzw. dem
// Skia-Renderer #89 benötigt) MUSS der **letzte** Plugin-Eintrag sein – es
// transformiert die Worklet-Funktionen. Ohne dieses Plugin wirft Reanimated/
// Worklets zur Laufzeit (u.a. „react-native-reanimated is not installed!").
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-worklets/plugin"],
  };
};
