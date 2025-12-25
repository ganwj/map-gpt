import { describe, it, expect } from 'vitest';
import { 
  API_URL, 
  PANEL_DIMENSIONS, 
  CHAT_SUGGESTIONS, 
  MAP_DEFAULTS, 
  getRandomSuggestions 
} from './index';

describe('constants', () => {
  describe('API_URL', () => {
    it('should have a default API URL', () => {
      expect(API_URL).toBeDefined();
      expect(typeof API_URL).toBe('string');
    });
  });

  describe('PANEL_DIMENSIONS', () => {
    it('should have min, max, and default width values', () => {
      expect(PANEL_DIMENSIONS.MIN_WIDTH).toBe(320);
      expect(PANEL_DIMENSIONS.MAX_WIDTH).toBe(700);
      expect(PANEL_DIMENSIONS.DEFAULT_WIDTH).toBe(450);
    });

    it('should have min width less than max width', () => {
      expect(PANEL_DIMENSIONS.MIN_WIDTH).toBeLessThan(PANEL_DIMENSIONS.MAX_WIDTH);
    });

    it('should have default width between min and max', () => {
      expect(PANEL_DIMENSIONS.DEFAULT_WIDTH).toBeGreaterThanOrEqual(PANEL_DIMENSIONS.MIN_WIDTH);
      expect(PANEL_DIMENSIONS.DEFAULT_WIDTH).toBeLessThanOrEqual(PANEL_DIMENSIONS.MAX_WIDTH);
    });
  });

  describe('CHAT_SUGGESTIONS', () => {
    it('should have multiple suggestions', () => {
      expect(CHAT_SUGGESTIONS.length).toBeGreaterThan(0);
    });

    it('should contain strings', () => {
      CHAT_SUGGESTIONS.forEach((suggestion) => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });

    it('should include various types of queries', () => {
      const suggestions = CHAT_SUGGESTIONS.join(' ').toLowerCase();
      
      // Should include different types of queries
      expect(suggestions).toMatch(/show|find|directions/i);
    });
  });

  describe('MAP_DEFAULTS', () => {
    it('should have valid center coordinates', () => {
      expect(MAP_DEFAULTS.CENTER.lat).toBeDefined();
      expect(MAP_DEFAULTS.CENTER.lng).toBeDefined();
      expect(typeof MAP_DEFAULTS.CENTER.lat).toBe('number');
      expect(typeof MAP_DEFAULTS.CENTER.lng).toBe('number');
    });

    it('should have valid latitude range', () => {
      expect(MAP_DEFAULTS.CENTER.lat).toBeGreaterThanOrEqual(-90);
      expect(MAP_DEFAULTS.CENTER.lat).toBeLessThanOrEqual(90);
    });

    it('should have valid longitude range', () => {
      expect(MAP_DEFAULTS.CENTER.lng).toBeGreaterThanOrEqual(-180);
      expect(MAP_DEFAULTS.CENTER.lng).toBeLessThanOrEqual(180);
    });

    it('should have a reasonable default zoom level', () => {
      expect(MAP_DEFAULTS.ZOOM).toBeDefined();
      expect(MAP_DEFAULTS.ZOOM).toBeGreaterThanOrEqual(1);
      expect(MAP_DEFAULTS.ZOOM).toBeLessThanOrEqual(22);
    });
  });

  describe('getRandomSuggestions', () => {
    it('should return the requested number of suggestions', () => {
      const result = getRandomSuggestions(3);
      expect(result).toHaveLength(3);
    });

    it('should return unique suggestions', () => {
      const result = getRandomSuggestions(5);
      const uniqueSet = new Set(result);
      expect(uniqueSet.size).toBe(5);
    });

    it('should return suggestions from CHAT_SUGGESTIONS', () => {
      const result = getRandomSuggestions(3);
      result.forEach((suggestion) => {
        expect(CHAT_SUGGESTIONS).toContain(suggestion);
      });
    });

    it('should return empty array when count is 0', () => {
      const result = getRandomSuggestions(0);
      expect(result).toHaveLength(0);
    });

    it('should not return more than available suggestions', () => {
      const result = getRandomSuggestions(CHAT_SUGGESTIONS.length + 10);
      expect(result.length).toBeLessThanOrEqual(CHAT_SUGGESTIONS.length);
    });

    it('should return different results on multiple calls (randomness)', () => {
      // Run multiple times to check randomness
      const results = Array.from({ length: 10 }, () => getRandomSuggestions(3));
      const stringifiedResults = results.map((r) => r.join(','));
      const uniqueResults = new Set(stringifiedResults);
      
      // With randomness, we should get at least some different combinations
      // (though this test might occasionally fail due to randomness)
      expect(uniqueResults.size).toBeGreaterThan(1);
    });
  });
});
