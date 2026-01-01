import { API_URL } from '../constants';

export type RouteProfile = 'driving-car' | 'foot-walking' | 'cycling-regular';

export interface RouteResult {
    mode: 'driving' | 'walking' | 'bicycling';
    duration: string;
    distance: string;
    durationValue: number; // seconds
    distanceValue: number; // meters
    geometry: [number, number][]; // [lng, lat] pairs for polyline
}

interface ORSGeoJSONResponse {
    features: Array<{
        properties: {
            summary: {
                distance: number; // meters
                duration: number; // seconds
            };
        };
        geometry: {
            coordinates: [number, number][]; // [lng, lat] pairs
        };
    }>;
}

const MODE_MAP: Record<RouteProfile, 'driving' | 'walking' | 'bicycling'> = {
    'driving-car': 'driving',
    'foot-walking': 'walking',
    'cycling-regular': 'bicycling',
};

/**
 * Format duration from seconds to human-readable string
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
}

/**
 * Format distance from meters to human-readable string
 */
function formatDistance(meters: number): string {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
}

/**
 * Get directions between two points using backend proxy
 */
export async function getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    profile: RouteProfile = 'driving-car'
): Promise<RouteResult | null> {
    try {
        const params = new URLSearchParams({
            profile,
            start: `${origin.lng},${origin.lat}`,
            end: `${destination.lng},${destination.lat}`,
        });

        const response = await fetch(`${API_URL}/api/directions?${params.toString()}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Directions proxy error:', response.status, errorText);
            return null;
        }

        const data: ORSGeoJSONResponse = await response.json();

        if (!data.features || data.features.length === 0) {
            return null;
        }

        const feature = data.features[0];

        return {
            mode: MODE_MAP[profile],
            duration: formatDuration(feature.properties.summary.duration),
            distance: formatDistance(feature.properties.summary.distance),
            durationValue: feature.properties.summary.duration,
            distanceValue: feature.properties.summary.distance,
            geometry: feature.geometry.coordinates,
        };
    } catch (error) {
        console.error('ORS directions error:', error);
        return null;
    }
}

/**
 * Get directions for all available modes
 */
export async function getAllDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
): Promise<RouteResult[]> {
    const profiles: RouteProfile[] = ['driving-car', 'foot-walking', 'cycling-regular'];
    const results: RouteResult[] = [];

    for (const profile of profiles) {
        const result = await getDirections(origin, destination, profile);
        if (result) {
            results.push(result);
        }
    }

    return results;
}

/**
 * Geocode an address to coordinates using Nominatim (for routing)
 */
export async function geocodeAddress(
    address: string
): Promise<{ lat: number; lng: number } | null> {
    try {
        const params = new URLSearchParams({
            q: address,
            format: 'json',
            limit: '1',
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`
        );

        if (!response.ok) {
            return null;
        }

        const results = await response.json();
        if (results.length === 0) {
            return null;
        }

        return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}
