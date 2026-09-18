/** Lê um token HSL do CSS (:root) e gera uma cor concreta (hsla com vírgulas) para o chart.js. */
export function themeColor(name: string, alpha = 1): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 3) {
    return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  return `rgba(120,120,140,${alpha})`;
}