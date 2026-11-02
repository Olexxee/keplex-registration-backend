import { BadRequestError } from "../../classes/errorClasses.js";

export const SOUVENIR_COLOR_PALETTE = new Map([
  ["Black", "#000000"],
  ["White", "#FFFFFF"],
  ["Charcoal", "#36454F"],
  ["Grey", "#808080"],
  ["Navy", "#17324D"],
  ["Blue", "#1565C0"],
  ["Sky Blue", "#4FC3F7"],
  ["Teal", "#2A7F7F"],
  ["Emerald", "#008F6B"],
  ["Green", "#2E7D32"],
  ["Lime", "#A4C639"],
  ["Yellow", "#FDD835"],
  ["Gold", "#D4A85A"],
  ["Orange", "#F57C00"],
  ["Red", "#E53935"],
  ["Maroon", "#800000"],
  ["Wine", "#722F37"],
  ["Pink", "#F4A6C1"],
  ["Magenta", "#C2185B"],
  ["Purple", "#6A1B9A"],
  ["Brown", "#795548"],
]);

export const validateSelectedColors = (colorSelections) => {
  if (!Array.isArray(colorSelections) || colorSelections.length < 1 || colorSelections.length > 5) {
    throw new BadRequestError("Select between one and five colours");
  }

  const normalized = colorSelections.map((selection) => {
    const name = String(selection?.name ?? "").trim();
    const colorHex = String(selection?.colorHex ?? "").toUpperCase();
    const allowedHex = SOUVENIR_COLOR_PALETTE.get(name);
    if (!allowedHex || allowedHex !== colorHex) {
      throw new BadRequestError("Choose colours from the available customer palette");
    }
    return {
      colorOptionId: null,
      nameSnapshot: name,
      colorHexSnapshot: colorHex,
      swatchImageUrlSnapshot: null,
    };
  });

  if (new Set(normalized.map((color) => color.name.toLowerCase())).size !== normalized.length) {
    throw new BadRequestError("Selected colours must be unique");
  }
  return normalized;
};
