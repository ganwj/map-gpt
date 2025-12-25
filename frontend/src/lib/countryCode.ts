/**
 * Country name to ISO 3166-1 alpha-2 code mapping
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  'united states': 'us',
  'usa': 'us',
  'u.s.a.': 'us',
  'u.s.': 'us',
  'united kingdom': 'gb',
  'uk': 'gb',
  'england': 'gb',
  'scotland': 'gb',
  'wales': 'gb',
  'canada': 'ca',
  'australia': 'au',
  'germany': 'de',
  'france': 'fr',
  'italy': 'it',
  'spain': 'es',
  'japan': 'jp',
  'china': 'cn',
  'india': 'in',
  'brazil': 'br',
  'mexico': 'mx',
  'netherlands': 'nl',
  'belgium': 'be',
  'switzerland': 'ch',
  'austria': 'at',
  'sweden': 'se',
  'norway': 'no',
  'denmark': 'dk',
  'finland': 'fi',
  'ireland': 'ie',
  'portugal': 'pt',
  'greece': 'gr',
  'poland': 'pl',
  'czech republic': 'cz',
  'czechia': 'cz',
  'hungary': 'hu',
  'romania': 'ro',
  'bulgaria': 'bg',
  'croatia': 'hr',
  'slovenia': 'si',
  'slovakia': 'sk',
  'turkey': 'tr',
  'russia': 'ru',
  'ukraine': 'ua',
  'south korea': 'kr',
  'korea': 'kr',
  'taiwan': 'tw',
  'hong kong': 'hk',
  'singapore': 'sg',
  'malaysia': 'my',
  'thailand': 'th',
  'vietnam': 'vn',
  'philippines': 'ph',
  'indonesia': 'id',
  'new zealand': 'nz',
  'south africa': 'za',
  'egypt': 'eg',
  'israel': 'il',
  'united arab emirates': 'ae',
  'uae': 'ae',
  'saudi arabia': 'sa',
  'argentina': 'ar',
  'chile': 'cl',
  'colombia': 'co',
  'peru': 'pe',
};

/**
 * Extracts the ISO country code from a formatted address string.
 * The country is typically the last part of a comma-separated address.
 * 
 * @param formattedAddress - The full formatted address string
 * @returns The ISO 3166-1 alpha-2 country code, or undefined if not found
 * 
 * @example
 * getCountryCodeFromAddress("1600 Amphitheatre Parkway, Mountain View, CA, USA")
 * // Returns: "us"
 * 
 * @example
 * getCountryCodeFromAddress("Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France")
 * // Returns: "fr"
 */
export function getCountryCodeFromAddress(formattedAddress: string | undefined): string | undefined {
  if (!formattedAddress) return undefined;
  
  const addressParts = formattedAddress.split(',');
  const lastPart = addressParts[addressParts.length - 1]?.trim().toLowerCase();
  
  if (!lastPart) return undefined;
  
  return COUNTRY_CODE_MAP[lastPart];
}
