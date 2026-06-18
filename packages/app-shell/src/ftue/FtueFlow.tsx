// First-Time-User-Experience (GDD §11.1): eine kurze, geführte Sequenz durch den
// Core Loop. Bewusst „kein langer Tutorial-Text" – pro Schritt ein Glyph, ein
// Titel, ein Satz. Der „Schmieden"-Schritt zeigt eine dezente Schmiede-Animation.
// Sequenzlogik liegt rein in `steps.ts`; hier nur die Darstellung. Texte/Theme
// kommen von außen (kategorie-neutral).

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import {
  FIRST_FTUE_STEP,
  FTUE_STEPS,
  FTUE_STEP_CONTENT,
  isFirstFtueStep,
  isLastFtueStep,
  nextFtueStep,
  prevFtueStep,
  type FtueStep,
} from "./steps";

export interface FtueFlowProps {
  t: TextResolver;
  /** Wird aufgerufen, wenn die Sequenz abgeschlossen oder übersprungen wurde. */
  onComplete: () => void;
}

/** Kategorie-neutrales Leitglyph je Schritt (spiegelt den Core Loop wider). */
const STEP_ICON: Record<FtueStep, string> = {
  welcome: "✦",
  spot: "◎",
  forge: "✦",
  battle: "⚔",
  trade: "⇄",
  gift: "★",
};

export function FtueFlow({ t, onComplete }: FtueFlowProps) {
  const theme = useTheme();
  const [step, setStep] = useState<FtueStep>(FIRST_FTUE_STEP);

  const content = FTUE_STEP_CONTENT[step];
  const last = isLastFtueStep(step);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topRow}>
        {!last ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onComplete}>
            <Text style={[styles.skip, { color: theme.colors.text }]}>{t("ftue.skip")}</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <View style={styles.stage}>
        <ForgeGlyph
          icon={STEP_ICON[step]}
          animate={step === "forge"}
          color={theme.colors.primary}
        />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>
          {t(content.titleKey)}
        </Text>
        <Text style={[styles.body, { color: theme.colors.text }]}>{t(content.bodyKey)}</Text>
      </View>

      <View style={styles.dots} accessibilityRole="progressbar">
        {FTUE_STEPS.map((s) => (
          <View
            key={s}
            style={[
              styles.dot,
              {
                backgroundColor: s === step ? theme.colors.primary : theme.colors.surface,
                width: s === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.nav}>
        {!isFirstFtueStep(step) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep(prevFtueStep(step) ?? FIRST_FTUE_STEP)}
            style={[styles.secondaryButton, { borderColor: theme.colors.surface }]}
          >
            <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>
              {t("ftue.back")}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const next = nextFtueStep(step);
            if (next) setStep(next);
            else onComplete();
          }}
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.primaryLabel, { color: theme.colors.text }]}>
            {t(last ? "ftue.finish" : "ftue.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Leitglyph der Slide. Beim „Schmieden"-Schritt pulsiert es (Scale + Glow), um die
 * Schmiede-Animation aus GDD §11.1 anzudeuten – dezent, ohne eigene Asset-Pipeline.
 */
function ForgeGlyph({ icon, animate, color }: { icon: string; animate: boolean; color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Animated.Text style={[styles.glyph, { color, transform: [{ scale }], opacity }]}>
      {icon}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: 32,
  },
  skip: {
    fontSize: 15,
    fontWeight: "600",
    opacity: 0.7,
    padding: 4,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  glyph: {
    fontSize: 96,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.85,
    paddingHorizontal: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  nav: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  navSpacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 2,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
});
