import { useState, useCallback } from 'react';
import { getCurrentLocation, type GeolocationResult, type GeolocationError } from '@/lib/geolocation';

interface UseGeolocationReturn {
  location: GeolocationResult | null;
  error: string | null;
  isLoading: boolean;
  getLocation: () => Promise<GeolocationResult | null>;
  clearError: () => void;
}

/**
 * Custom hook for getting user's current location
 */
export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLocation = useCallback(async (): Promise<GeolocationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getCurrentLocation();
      setLocation(result);
      return result;
    } catch (err) {
      const geoError = err as GeolocationError;
      setError(geoError.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    location,
    error,
    isLoading,
    getLocation,
    clearError,
  };
}
