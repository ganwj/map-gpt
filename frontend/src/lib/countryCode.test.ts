import { describe, it, expect } from 'vitest';
import { getCountryCodeFromAddress, COUNTRY_CODE_MAP } from './countryCode';

describe('countryCode', () => {
  describe('COUNTRY_CODE_MAP', () => {
    it('should contain common country mappings', () => {
      expect(COUNTRY_CODE_MAP['united states']).toBe('us');
      expect(COUNTRY_CODE_MAP['usa']).toBe('us');
      expect(COUNTRY_CODE_MAP['united kingdom']).toBe('gb');
      expect(COUNTRY_CODE_MAP['uk']).toBe('gb');
      expect(COUNTRY_CODE_MAP['japan']).toBe('jp');
      expect(COUNTRY_CODE_MAP['france']).toBe('fr');
      expect(COUNTRY_CODE_MAP['germany']).toBe('de');
    });

    it('should handle alternate country names', () => {
      expect(COUNTRY_CODE_MAP['u.s.a.']).toBe('us');
      expect(COUNTRY_CODE_MAP['u.s.']).toBe('us');
      expect(COUNTRY_CODE_MAP['england']).toBe('gb');
      expect(COUNTRY_CODE_MAP['scotland']).toBe('gb');
      expect(COUNTRY_CODE_MAP['wales']).toBe('gb');
      expect(COUNTRY_CODE_MAP['czechia']).toBe('cz');
      expect(COUNTRY_CODE_MAP['czech republic']).toBe('cz');
      expect(COUNTRY_CODE_MAP['south korea']).toBe('kr');
      expect(COUNTRY_CODE_MAP['korea']).toBe('kr');
    });
  });

  describe('getCountryCodeFromAddress', () => {
    it('should extract country code from US address', () => {
      expect(getCountryCodeFromAddress('1600 Amphitheatre Parkway, Mountain View, CA, USA')).toBe('us');
      expect(getCountryCodeFromAddress('New York, NY, United States')).toBe('us');
    });

    it('should extract country code from UK address', () => {
      expect(getCountryCodeFromAddress('10 Downing Street, London, United Kingdom')).toBe('gb');
      expect(getCountryCodeFromAddress('Edinburgh Castle, Edinburgh, Scotland')).toBe('gb');
    });

    it('should extract country code from European addresses', () => {
      expect(getCountryCodeFromAddress('Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France')).toBe('fr');
      expect(getCountryCodeFromAddress('Piazza del Colosseo, Rome, Italy')).toBe('it');
      expect(getCountryCodeFromAddress('Marienplatz, Munich, Germany')).toBe('de');
      expect(getCountryCodeFromAddress('Gran Via, Madrid, Spain')).toBe('es');
    });

    it('should extract country code from Asian addresses', () => {
      expect(getCountryCodeFromAddress('1 Chome-1-2 Oshiage, Sumida City, Tokyo, Japan')).toBe('jp');
      expect(getCountryCodeFromAddress('The Bund, Shanghai, China')).toBe('cn');
      expect(getCountryCodeFromAddress('Gyeongbokgung Palace, Seoul, South Korea')).toBe('kr');
      expect(getCountryCodeFromAddress('Marina Bay Sands, Singapore')).toBe('sg');
    });

    it('should handle case insensitivity', () => {
      expect(getCountryCodeFromAddress('Tokyo, JAPAN')).toBe('jp');
      expect(getCountryCodeFromAddress('Paris, FRANCE')).toBe('fr');
      expect(getCountryCodeFromAddress('London, UK')).toBe('gb');
    });

    it('should handle addresses with extra whitespace', () => {
      expect(getCountryCodeFromAddress('Tokyo,  Japan ')).toBe('jp');
      expect(getCountryCodeFromAddress('Paris, France  ')).toBe('fr');
    });

    it('should return undefined for undefined input', () => {
      expect(getCountryCodeFromAddress(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getCountryCodeFromAddress('')).toBeUndefined();
    });

    it('should return undefined for unknown country', () => {
      expect(getCountryCodeFromAddress('Some Place, Unknown Country')).toBeUndefined();
      expect(getCountryCodeFromAddress('123 Main St, Atlantis')).toBeUndefined();
    });

    it('should return undefined for address without country', () => {
      expect(getCountryCodeFromAddress('123 Main Street')).toBeUndefined();
    });
  });
});
