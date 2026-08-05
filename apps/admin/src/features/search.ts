/**
 * Shared client-side filter for the top bar search box. The console has no
 * server-side search endpoint, so search narrows the records already loaded
 * rather than implying a global lookup.
 */
export function matchesSearch(haystack: Array<string | number | undefined>, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((value) => String(value ?? "").toLowerCase().includes(needle));
}
