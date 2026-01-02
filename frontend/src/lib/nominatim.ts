// Nominatim geocoding and search service
// API docs: https://nominatim.org/release-docs/latest/api/Search/

export interface NominatimSearchResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  boundingbox: [string, string, string, string];
}

export interface NominatimReverseResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Rate limiting: Nominatim requires max 1 request/second
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  // Browsers don't allow setting User-Agent. 
  // Nominatim will use our browser's UA and we'll provide an email parameter for identification.
  return fetch(url);
}

const CACHE_KEY_PREFIX = 'mapgpt_places_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

interface CachedResult {
  data: NominatimSearchResult[];
  timestamp: number;
}

function getFromCache(query: string): NominatimSearchResult[] | null {
  try {
    const key = CACHE_KEY_PREFIX + query.toLowerCase();
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed: CachedResult = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (e) {
    return null;
  }
}

/**
 * Clear the places cache from localStorage
 */
export function clearPlacesCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Failed to clear places cache:', e);
  }
}

function saveToCache(query: string, data: NominatimSearchResult[]) {
  try {
    const key = CACHE_KEY_PREFIX + query.toLowerCase();
    const result: CachedResult = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(result));
  } catch (e) {
    // LocalStorage might be full or unavailable
  }
}

/**
 * Search for places using Nominatim
 */
export async function searchPlaces(
  query: string,
  options?: {
    limit?: number;
    countryCode?: string;
    viewbox?: string;
    bounded?: boolean;
  }
): Promise<NominatimSearchResult[]> {
  const limit = options?.limit ?? 5;

  // Check cache first (ignore options for simple query caching)
  const cached = getFromCache(query);
  if (cached) {
    return cached.slice(0, limit);
  }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: limit.toString(),
    addressdetails: '1',
    email: 'contact@map-gpt.app'
  });

  if (options?.countryCode) {
    params.set('countrycodes', options.countryCode);
  }

  if (options?.viewbox) {
    params.set('viewbox', options.viewbox);
  }

  if (options?.bounded) {
    params.set('bounded', '1');
  }

  try {
    const response = await rateLimitedFetch(
      `${NOMINATIM_BASE_URL}/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Nominatim search failed: ${response.status}`);
    }

    const results = await response.json();

    // Cache the results
    if (results && Array.isArray(results) && results.length > 0) {
      saveToCache(query, results);
    }

    return results;
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<NominatimReverseResult | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    format: 'json',
    addressdetails: '1',
    email: 'contact@map-gpt.app'
  });

  try {
    const response = await rateLimitedFetch(
      `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocoding failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error);
    return null;
  }
}

/**
 * Convert Nominatim result to simplified place data
 */
export function nominatimToPlaceData(result: NominatimSearchResult) {
  return {
    id: result.osm_id.toString(),
    displayName: result.display_name.split(',')[0], // First part is usually the name
    formattedAddress: result.display_name,
    location: {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    },
    types: [result.type, result.class].filter(Boolean),
  };
}
