export function getLineFitClass(wordCount, lineLength) {
  if (lineLength > 82) return "fit-52";
  if (lineLength > 70) return "fit-58";
  if (lineLength > 62) return "fit-64";
  if (wordCount > 13) return "fit-72";
  if (wordCount > 11) return "fit-72";
  if (wordCount > 9) return "fit-84";
  if (wordCount > 7) return "fit-89";
  if (wordCount > 6) return "fit-93";
  return "";
}
