/**
 * Utilitas format.
 *
 * Semua pemakaian `Intl` dibungkus dengan fallback manual agar halaman tetap
 * dapat dirender pada runtime edge (mis. WinterJS/Workers) yang mungkin tidak
 * menyediakan data locale/ICU lengkap. Format waktu dipatok ke UTC supaya output
 * identik di mana pun aplikasi dijalankan.
 */

/** Menjalankan factory Intl dan beralih ke fallback bila locale tidak tersedia. */
function safeIntl<T>(factory: () => T, fallback: () => T): T {
  try {
    return factory();
  } catch {
    return fallback();
  }
}

/** Pengelompokan ribuan manual (id-ID memakai titik). */
function groupDigits(value: number): string {
  const negative = value < 0;
  const digits = Math.trunc(Math.abs(value)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return negative ? `-${grouped}` : grouped;
}

export function formatCurrency(value: number): string {
  return safeIntl(
    () =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value),
    () => `Rp ${groupDigits(value)}`,
  );
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} rb`;
  }
  return `Rp ${value}`;
}

export function formatNumber(value: number): string {
  return safeIntl(
    () => new Intl.NumberFormat("id-ID").format(value),
    () => groupDigits(value),
  );
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatDateID(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS_ID[m - 1].slice(0, 3)} ${y}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Jam:menit:detik dalam UTC (deterministik di semua runtime). */
function utcClock(date: Date, withSeconds: boolean): string {
  const base = `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad2(date.getUTCSeconds())}` : base;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = safeIntl(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(date),
    () => utcClock(date, true),
  );
  return `${formatDateShort(iso)} • ${time}`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return safeIntl(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(date),
    () => utcClock(date, false),
  );
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
