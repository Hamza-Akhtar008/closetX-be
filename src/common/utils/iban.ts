/**
 * Saudi IBAN helpers. A KSA IBAN is `SA` + 2 check digits + 2-digit bank code +
 * 18-digit BBAN = 24 chars. We validate the ISO 13616 mod-97 checksum and map
 * the bank code to a name. Bank codes are best-effort (SAMA scheme); unknown
 * codes return null and the caller falls back to "Unknown bank".
 */

const SAUDI_BANKS: Record<string, string> = {
  '10': 'Saudi National Bank',
  '15': 'Bank AlBilad',
  '20': 'Riyad Bank',
  '30': 'Arab National Bank',
  '40': 'Saudi Awwal Bank (SABB)',
  '45': 'Saudi Investment Bank',
  '50': 'Alinma Bank',
  '55': 'Banque Saudi Fransi',
  '60': 'Bank AlJazira',
  '65': 'Gulf International Bank',
  '76': 'Emirates NBD',
  '80': 'Al Rajhi Bank',
};

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function isValidSaudiIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^SA\d{22}$/.test(iban)) return false;
  // Move the first 4 chars to the end, convert letters to numbers (A=10..),
  // then the whole number mod 97 must equal 1.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function saudiBankFromIban(value: string): string | null {
  const iban = normalizeIban(value);
  if (!/^SA\d{4}/.test(iban)) return null;
  return SAUDI_BANKS[iban.slice(4, 6)] ?? null;
}

export function ibanLast4(value: string): string {
  return normalizeIban(value).slice(-4);
}
