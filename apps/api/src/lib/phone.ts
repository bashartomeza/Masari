import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export const SUPPORTED_PHONE_REGIONS = ["PS"] as const satisfies readonly CountryCode[];

export class PhoneNormalizationError extends Error {
  constructor() {
    super("Phone number is invalid or outside the supported regions");
    this.name = "PhoneNormalizationError";
  }
}

function latinDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

export function normalizePhoneToE164(
  input: string,
  options: { region?: CountryCode; supportedRegions?: readonly CountryCode[] } = {}
) {
  if (/[\u0000-\u001f\u007f]/.test(input)) throw new PhoneNormalizationError();
  let value = latinDigits(input.trim());
  if (!value || /[^0-9+()\-\s]/.test(value)) throw new PhoneNormalizationError();
  value = value.replace(/[()\-\s]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if ((value.match(/\+/g) ?? []).length > 1 || (value.includes("+") && !value.startsWith("+"))) {
    throw new PhoneNormalizationError();
  }
  const supportedRegions = options.supportedRegions ?? SUPPORTED_PHONE_REGIONS;
  if (!value.startsWith("+") && !options.region) throw new PhoneNormalizationError();
  if (options.region && !supportedRegions.includes(options.region)) throw new PhoneNormalizationError();
  const phone = parsePhoneNumberFromString(value, {
    ...(options.region ? { defaultCountry: options.region } : {}),
    extract: false
  });

  if (!phone || !phone.isValid() || !supportedRegions.includes(phone.country as CountryCode)) {
    throw new PhoneNormalizationError();
  }

  return phone.number;
}

export function phoneLast4(phoneE164: string) {
  return phoneE164.slice(-4);
}

export function maskPhone(phoneE164: string) {
  return `+${phoneE164.slice(1, 4)} ••• •• ${phoneLast4(phoneE164)}`;
}

export function analyzePhoneNormalization(rows: readonly { id: string; phone: string }[]) {
  const owners = new Map<string, string>();
  let valid = 0;
  let invalid = 0;
  let collisions = 0;
  for (const row of rows) {
    try {
      const canonical = normalizePhoneToE164(row.phone);
      valid += 1;
      const owner = owners.get(canonical);
      if (owner && owner !== row.id) collisions += 1;
      else owners.set(canonical, row.id);
    } catch {
      invalid += 1;
    }
  }
  return { total: rows.length, valid, invalid, collisions };
}
