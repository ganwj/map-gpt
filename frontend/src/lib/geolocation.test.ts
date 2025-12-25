import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentLocation, formatCoordinates, isGeolocationSupported } from './geolocation';

describe('geolocation utilities', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentLocation', () => {
    it('should return location with coordinates when geolocation succeeds', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      // Mock Google Geocoder as undefined to skip reverse geocoding
      const originalGoogle = (window as unknown as { google?: unknown }).google;
      (window as unknown as { google?: unknown }).google = undefined;

      const result = await getCurrentLocation({ reverseGeocode: false });

      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
      
      (window as unknown as { google?: unknown }).google = originalGoogle;
    });

    it('should reject with PERMISSION_DENIED error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, PERMISSION_DENIED: 1 });
      });

      await expect(getCurrentLocation()).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
        message: expect.stringContaining('permission denied'),
      });
    });

    it('should reject with POSITION_UNAVAILABLE error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 2, POSITION_UNAVAILABLE: 2 });
      });

      await expect(getCurrentLocation()).rejects.toMatchObject({
        code: 'POSITION_UNAVAILABLE',
        message: expect.stringContaining('unavailable'),
      });
    });

    it('should reject with TIMEOUT error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 3, TIMEOUT: 3 });
      });

      await expect(getCurrentLocation()).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: expect.stringContaining('timed out'),
      });
    });

    it('should reject when geolocation is not supported', async () => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
      });

      await expect(getCurrentLocation()).rejects.toMatchObject({
        code: 'NOT_SUPPORTED',
        message: expect.stringContaining('not supported'),
      });
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with 6 decimal places', () => {
      expect(formatCoordinates(40.7128, -74.006)).toBe('40.712800, -74.006000');
    });

    it('should handle negative coordinates', () => {
      expect(formatCoordinates(-33.8688, 151.2093)).toBe('-33.868800, 151.209300');
    });
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is available', () => {
      // In test environment, geolocation is mocked and available
      expect(isGeolocationSupported()).toBe(true);
    });

    it('should check for geolocation in navigator', () => {
      // Verify the function checks the right property
      expect('geolocation' in navigator).toBe(isGeolocationSupported());
    });
  });
});
