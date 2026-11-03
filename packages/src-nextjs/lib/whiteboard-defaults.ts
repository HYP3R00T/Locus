// Excalidraw 0.18 stroke palette: Open Color shades 0, 2, 4, 6, 8 plus bronze.
// Keep settings lightweight; importing the editor here would defeat lazy loading.
export const STROKE_COLORS = [
  {
    name: "Black and white",
    colors: ["#1e1e1e", "#ffffff"],
  },
  {
    name: "Bronze",
    colors: ["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"],
  },
  {
    name: "gray",
    colors: ["#f8f9fa", "#e9ecef", "#ced4da", "#868e96", "#343a40"],
  },
  {
    name: "cyan",
    colors: ["#e3fafc", "#99e9f2", "#3bc9db", "#15aabf", "#0c8599"],
  },
  {
    name: "blue",
    colors: ["#e7f5ff", "#a5d8ff", "#4dabf7", "#228be6", "#1971c2"],
  },
  {
    name: "violet",
    colors: ["#f3f0ff", "#d0bfff", "#9775fa", "#7950f2", "#6741d9"],
  },
  {
    name: "grape",
    colors: ["#f8f0fc", "#eebefa", "#da77f2", "#be4bdb", "#9c36b5"],
  },
  {
    name: "pink",
    colors: ["#fff0f6", "#fcc2d7", "#f783ac", "#e64980", "#c2255c"],
  },
  {
    name: "green",
    colors: ["#ebfbee", "#b2f2bb", "#69db7c", "#40c057", "#2f9e44"],
  },
  {
    name: "teal",
    colors: ["#e6fcf5", "#96f2d7", "#38d9a9", "#12b886", "#099268"],
  },
  {
    name: "yellow",
    colors: ["#fff9db", "#ffec99", "#ffd43b", "#fab005", "#f08c00"],
  },
  {
    name: "orange",
    colors: ["#fff4e6", "#ffd8a8", "#ffa94d", "#fd7e14", "#e8590c"],
  },
  {
    name: "red",
    colors: ["#fff5f5", "#ffc9c9", "#ff8787", "#fa5252", "#e03131"],
  },
] as const;
export const STROKE_WIDTHS = [
  { value: 1, label: "Thin" },
  { value: 2, label: "Medium" },
  { value: 4, label: "Thick" },
] as const;
