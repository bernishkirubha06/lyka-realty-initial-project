/**
 * Timezone utilities for Lyka Realty
 * - Handles Dubai Time (GST, UTC+4) database storage
 * - Formats timestamps into the user's local laptop/system time (e.g. Indian IST, Dubai GST)
 */

export function parseBackendDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  let str = String(dateInput).trim();
  // If string from SQLite is like "2026-10-12 13:27:51" without timezone,
  // it was stored in Dubai time (UTC+4), so append +04:00 for accurate point-in-time parsing
  if (!str.includes("Z") && !str.includes("+") && !str.match(/-\d\d:\d\d$/)) {
    str = str.replace(" ", "T") + "+04:00";
  }
  
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Returns the user's laptop/system timezone label (e.g. "IST", "GST", etc.)
 */
export function getSystemTimezoneLabel(): string {
  if (typeof Intl === "undefined") return "Local";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.includes("India")) {
      return "IST (Indian Time)";
    }
    if (tz.includes("Dubai") || tz.includes("UET") || tz.includes("Muscat")) {
      return "GST (Dubai Time)";
    }
    // Return short abbreviation or city name
    return tz.split("/").pop()?.replace("_", " ") || "Local Time";
  } catch {
    return "Local";
  }
}

/**
 * Formats a date in the user's laptop system time with their system timezone abbreviation.
 * e.g. "12 Oct 2026, 02:35 PM IST"
 */
export function formatSystemDateTime(dateInput: string | Date | null | undefined): string {
  const d = parseBackendDate(dateInput);
  
  const datePart = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const timePart = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const tzLabel = getSystemTimezoneLabel();
  const shortTz = tzLabel.split(" ")[0]; // "IST" or "GST"

  return `${datePart}, ${timePart} ${shortTz}`;
}

/**
 * Formats time showing both the user's laptop system time and Dubai reference time.
 * e.g. "02:35 PM IST (01:05 PM Dubai)"
 */
export function formatDualTime(dateInput: string | Date | null | undefined): string {
  const d = parseBackendDate(dateInput);

  const datePart = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short"
  });

  const localTime = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const dubaiTime = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const tzLabel = getSystemTimezoneLabel();
  const shortTz = tzLabel.split(" ")[0];

  if (shortTz === "GST") {
    return `${datePart}, ${localTime} GST (Dubai Time)`;
  }

  return `${datePart}, ${localTime} ${shortTz} • ${dubaiTime} Dubai Time`;
}

/**
 * Returns current real time on the user's laptop
 */
export function getCurrentLaptopTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}
