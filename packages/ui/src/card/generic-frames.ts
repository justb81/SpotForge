// Die generischen Seltenheits-Kartenrahmen – die verbindliche Baseline für ALLE
// Apps. Als statische Asset-Imports gebündelt (Metro), damit jede Variante ohne
// eigene Grafiken trotzdem vollständige Frames hat. Reproduzierbar erzeugt über
// `tools/gen-ui-frames.py`. Varianten überschreiben einzelne Stufen über
// `AppDefinition.assets.cardFrames` (→ {@link resolveCardFrames}).

import { Rarity } from "@spotforge/game-core";
import common from "../../assets/frames/common.png";
import uncommon from "../../assets/frames/uncommon.png";
import rare from "../../assets/frames/rare.png";
import epic from "../../assets/frames/epic.png";
import legendary from "../../assets/frames/legendary.png";
import { mergeCardFrames, type CardFrameSources, type ResolvedCardFrames } from "./frames";

/** Vollständige Map der gebündelten generischen Default-Frames. */
export const GENERIC_CARD_FRAMES: ResolvedCardFrames = {
  [Rarity.Common]: common,
  [Rarity.Uncommon]: uncommon,
  [Rarity.Rare]: rare,
  [Rarity.Epic]: epic,
  [Rarity.Legendary]: legendary,
};

/**
 * Löst die Frame-Grafiken einer Variante auf: generische Defaults, von den
 * optionalen Per-App-Overrides überschrieben. Ergebnis ist immer vollständig –
 * der Host ruft dies einmal beim Variant-Wiring auf und reicht das Ergebnis an
 * {@link CardView} weiter.
 */
export function resolveCardFrames(overrides?: CardFrameSources): ResolvedCardFrames {
  return mergeCardFrames(GENERIC_CARD_FRAMES, overrides);
}
