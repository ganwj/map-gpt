// Geolocation utilities

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * Get the current user location with optional reverse geocoding
 */
export async function getCurrentLocation(options?: {
  reverseGeocode?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<GeolocationResult> {
  const { reverseGeocode = true, timeout = 15000, maximumAge = 300000 } = options || {};

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by your browser',
      } as GeolocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        let address: string | undefined;
        
        if (reverseGeocode && window.google?.maps?.Geocoder) {
          try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({
              location: { lat: latitude, lng: longitude },
            });
            if (response.results[0]) {
              address = response.results[0].formatted_address;
            }
          } catch {
            // Geocoding failed, continue without address
          }
        }

        resolve({
          latitude,
          longitude,
          address: address || `${latitude}, ${longitude}`,
        });
      },
      (error) => {
        let code: GeolocationError['code'];
        let message: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            code = 'PERMISSION_DENIED';
            message = 'Location permission denied. Please enable it in browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            code = 'POSITION_UNAVAILABLE';
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            code = 'TIMEOUT';
            message = 'Location request timed out.';
            break;
          default:
            code = 'POSITION_UNAVAILABLE';
            message = 'Could not get your location';
        }

        reject({ code, message } as GeolocationError);
      },
      { enableHighAccuracy: false, timeout, maximumAge }
    );
  });
}

/**
 * Format coordinates as a string
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}
