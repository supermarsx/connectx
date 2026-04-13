/** Darken a hex color by a fraction (0-1). darkenColor('#FF0000', 0.15) darkens by 15% */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xFF) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xFF) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xFF) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Lighten a hex color by a fraction (0-1). lightenColor('#000000', 0.3) adds 30% white */
export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
