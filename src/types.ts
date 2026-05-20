export interface ColorItem {
  hex: string;
  name: string;
  symbolism: string;
}

export interface PaletteResult {
  paletteName: string;
  overallMood: string;
  colors: ColorItem[];
}

export interface SavedPalette extends PaletteResult {
  id: string;
  timestamp: string;
  drawingData?: string; // Optional SVG/Canvas path string
}

export interface StoryChapter {
  title: string;
  chapterContent: string;
  illustrationConcept: string;
  choices: string[];
  isEnding: boolean;
}

export interface StoryTurn {
  role: "user" | "model";
  text: string;
  chapter?: StoryChapter;
}

export type PoemStyleBn = "rabindrik" | "nazrulian" | "surrealist" | "abstract" | "modern_lyrical";
export type PoemStyleEn = "romantic" | "modern" | "ghazal" | "descriptive";

export interface SystemMoodTheme {
  id: string;
  nameBn: string;
  nameEn: string;
  seasonbn: string;
  seasonEn: string;
  colorHex: string; // Used for dynamic ambient glows
  bgGradient: string;
  soundCue?: string;
  motifs: string[];
}
