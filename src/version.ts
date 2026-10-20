declare const __APP_VERSION__: string;
declare const __BUILD_BORN__: string;
declare const __BUILD_UPDATED__: string;

export const VERSION = __APP_VERSION__;
/** ISO 8601 with the author's UTC offset, from git at build: BORN is the root commit, UPDATED is HEAD. */
export const BORN = __BUILD_BORN__;
export const UPDATED = __BUILD_UPDATED__;

/** "20 Oct 2026". Read in the offset it was committed in, not converted to the reader's zone. */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}
/** "20 Oct 2026, 09:14 (UTC−04:00)", for the tooltip. */
export function fmtStamp(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)$/.exec(iso);
  if (!m) return iso;
  const off = m[6] === "Z" ? "UTC" : `UTC${m[6].replace("-", "−")}`;
  return `${fmtDate(iso)}, ${m[4]}:${m[5]} (${off})`;
}
