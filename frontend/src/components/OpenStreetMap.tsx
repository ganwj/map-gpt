import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Locate, Loader2 } from 'lucide-react';
import type { MapAction, PlaceData, DirectionResult, DirectionError } from '@/types';
import { MAX_ROUTE_DISTANCE } from '@/types';
import { MAP_DEFAULTS } from '@/constants';
import { getCurrentLocation } from '@/lib/geolocation';
import { Button } from '@/components/ui/button';
import { searchPlaces, nominatimToPlaceData } from '@/lib/nominatim';
import { getAllDirections, geocodeAddress, type RouteResult } from '@/lib/routing';

// Fix Leaflet default marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom blue dot icon for current location
const currentLocationIcon = L.divIcon({
    className: 'current-location-marker',
    html: `<div style="
    width: 20px;
    height: 20px;
    background: #4285F4;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

interface OpenStreetMapProps {
    mapAction?: MapAction | null;
    onPlaceSelect?: (place: PlaceData) => void;
    onPlaceDetailsLoaded?: (place: PlaceData) => void;
    onDirectionsResult?: (result: DirectionResult) => void;
    onDirectionsError?: (error: DirectionError) => void;
    placeIdToFetch?: string | null;
    resizeTrigger?: any; // To trigger map.invalidateSize()
}

// Component to handle map actions that require map instance
function MapController({
    mapAction,
    setMarkers,
    setRouteGeometry,
    onDirectionsResult,
    onDirectionsError,
    onPlaceDetailsLoaded,
    resizeTrigger,
}: {
    mapAction?: MapAction | null;
    markers: Array<{ position: [number, number]; title?: string; id?: string }>;
    setMarkers: React.Dispatch<React.SetStateAction<Array<{ position: [number, number]; title?: string; id?: string }>>>;
    routeGeometry: [number, number][];
    setRouteGeometry: React.Dispatch<React.SetStateAction<[number, number][]>>;
    onDirectionsResult?: (result: DirectionResult) => void;
    onDirectionsError?: (error: DirectionError) => void;
    onPlaceDetailsLoaded?: (place: PlaceData) => void;
    resizeTrigger?: any;
}) {
    const map = useMap();
    const processedActionRef = useRef<string | null>(null);

    // Invalidate map size when sidebar opens/closes
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 300); // Wait for CSS transitions
    }, [resizeTrigger, map]);

    useEffect(() => {
        if (!mapAction) return;

        // Create unique action id to prevent re-processing
        const actionId = `${mapAction.action}-${mapAction._timestamp || Date.now()}`;
        if (processedActionRef.current === actionId) return;
        processedActionRef.current = actionId;

        const handleAction = async () => {
            switch (mapAction.action) {
                case 'searchOne':
                    if (mapAction.query) {
                        try {
                            const results = await searchPlaces(mapAction.query, { limit: 1 });
                            if (results.length > 0) {
                                const place = nominatimToPlaceData(results[0]);
                                const position: [number, number] = [place.location!.lat, place.location!.lng];

                                setMarkers([{ position, title: place.displayName, id: place.id }]);
                                setRouteGeometry([]);
                                map.setView(position, 16);

                                onPlaceDetailsLoaded?.(place);
                            }
                        } catch (error) {
                            console.error('Search error:', error);
                        }
                    }
                    break;

                case 'searchMany':
                    if (mapAction.queries && mapAction.queries.length > 0) {
                        try {
                            const allResults = await Promise.all(
                                mapAction.queries.map(q => searchPlaces(q, { limit: 1 }))
                            );

                            const newMarkers: Array<{ position: [number, number]; title?: string; id?: string }> = [];
                            const bounds = L.latLngBounds([]);

                            allResults.forEach((results) => {
                                if (results.length > 0) {
                                    const place = nominatimToPlaceData(results[0]);
                                    const position: [number, number] = [place.location!.lat, place.location!.lng];
                                    newMarkers.push({ position, title: place.displayName, id: place.id });
                                    bounds.extend(position);
                                    onPlaceDetailsLoaded?.(place);
                                }
                            });

                            if (newMarkers.length > 0) {
                                setMarkers(newMarkers);
                                setRouteGeometry([]);
                                if (newMarkers.length === 1) {
                                    map.setView(newMarkers[0].position, 16);
                                } else {
                                    map.fitBounds(bounds, { padding: [50, 50] });
                                }
                            }
                        } catch (error) {
                            console.error('Search many error:', error);
                        }
                    }
                    break;

                case 'goto':
                    if (mapAction.lat !== undefined && mapAction.lng !== undefined) {
                        const position: [number, number] = [mapAction.lat, mapAction.lng];
                        setMarkers([{ position, title: mapAction.title }]);
                        setRouteGeometry([]);
                        map.setView(position, mapAction.zoom || 15);
                    }
                    break;

                case 'marker':
                    if (mapAction.lat !== undefined && mapAction.lng !== undefined) {
                        const position: [number, number] = [mapAction.lat, mapAction.lng];
                        setMarkers(prev => [...prev, { position, title: mapAction.title }]);
                        map.panTo(position);
                    }
                    break;

                case 'directions':
                    if (mapAction.origin && mapAction.destination) {
                        setRouteGeometry([]);
                        setMarkers([]);

                        try {
                            // Resolve origin
                            let originCoords: { lat: number; lng: number } | null = null;
                            if (mapAction.origin.toLowerCase() === 'my location') {
                                try {
                                    const location = await getCurrentLocation({ reverseGeocode: false });
                                    originCoords = { lat: location.latitude, lng: location.longitude };
                                } catch {
                                    // Fallback to map center
                                    const center = map.getCenter();
                                    originCoords = { lat: center.lat, lng: center.lng };
                                }
                            } else {
                                originCoords = await geocodeAddress(mapAction.origin);
                            }

                            if (!originCoords) {
                                onDirectionsError?.({
                                    type: 'INVALID_REQUEST',
                                    message: 'Could not find the starting location.',
                                    origin: mapAction.origin,
                                    destination: mapAction.destination,
                                });
                                return;
                            }

                            // Resolve destination
                            const destCoords = await geocodeAddress(mapAction.destination);
                            if (!destCoords) {
                                onDirectionsError?.({
                                    type: 'INVALID_REQUEST',
                                    message: 'Could not find the destination.',
                                    origin: mapAction.origin,
                                    destination: mapAction.destination,
                                });
                                return;
                            }

                            // Get all routes
                            const routes = await getAllDirections(originCoords, destCoords);

                            if (routes.length === 0) {
                                onDirectionsError?.({
                                    type: 'NO_ROUTE',
                                    message: 'No routes found between these locations.',
                                    origin: mapAction.origin,
                                    destination: mapAction.destination,
                                });
                                return;
                            }

                            // Filter routes that are too long
                            const validRoutes = routes.filter((route: RouteResult) => {
                                const maxDistance = MAX_ROUTE_DISTANCE[route.mode];
                                return route.distanceValue <= maxDistance;
                            });

                            if (validRoutes.length === 0) {
                                const shortestRoute = routes.reduce((min: RouteResult, route: RouteResult) =>
                                    route.distanceValue < min.distanceValue ? route : min
                                );
                                onDirectionsError?.({
                                    type: 'ROUTE_TOO_LONG',
                                    message: `The route is too long (${shortestRoute.distance}). Please choose closer locations.`,
                                    origin: mapAction.origin,
                                    destination: mapAction.destination,
                                });
                                return;
                            }

                            // Use first route (driving) for display
                            const primaryRoute = validRoutes[0];
                            const geometry = primaryRoute.geometry.map(
                                (coord): [number, number] => [coord[1], coord[0]] // Convert [lng, lat] to [lat, lng]
                            );
                            setRouteGeometry(geometry);

                            // Add origin and destination markers
                            setMarkers([
                                { position: [originCoords.lat, originCoords.lng], title: 'Start' },
                                { position: [destCoords.lat, destCoords.lng], title: 'End' },
                            ]);

                            // Fit map to route bounds
                            if (geometry.length > 0) {
                                const bounds = L.latLngBounds(geometry);
                                map.fitBounds(bounds, { padding: [50, 50] });
                            }

                            // Report results
                            onDirectionsResult?.({
                                origin: mapAction.origin,
                                destination: mapAction.destination,
                                routes: validRoutes.map((r: RouteResult) => ({
                                    mode: r.mode,
                                    duration: r.duration,
                                    distance: r.distance,
                                    durationValue: r.durationValue,
                                    distanceValue: r.distanceValue,
                                })),
                            });
                        } catch (error) {
                            console.error('Directions error:', error);
                            onDirectionsError?.({
                                type: 'UNKNOWN_ERROR',
                                message: 'Failed to get directions. Please try again.',
                                origin: mapAction.origin,
                                destination: mapAction.destination,
                            });
                        }
                    }
                    break;
            }
        };

        handleAction();
    }, [mapAction, map, setMarkers, setRouteGeometry, onDirectionsResult, onDirectionsError, onPlaceDetailsLoaded]);

    return null;
}

export function OpenStreetMap({
    mapAction,
    onPlaceSelect: _onPlaceSelect,
    onPlaceDetailsLoaded,
    onDirectionsResult,
    onDirectionsError,
    placeIdToFetch: _placeIdToFetch,
    resizeTrigger,
}: OpenStreetMapProps) {
    const [markers, setMarkers] = useState<Array<{ position: [number, number]; title?: string; id?: string }>>([]);
    const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const mapRef = useRef<L.Map | null>(null);

    const handleLocateMe = useCallback(async () => {
        setIsLocating(true);
        try {
            const location = await getCurrentLocation({ reverseGeocode: false });
            const position: [number, number] = [location.latitude, location.longitude];
            setCurrentLocation(position);

            if (mapRef.current) {
                mapRef.current.setView(position, 15);
            }
        } catch (error) {
            console.error('Error getting location:', error);
        } finally {
            setIsLocating(false);
        }
    }, []);

    // Detect mobile for control positioning
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[MAP_DEFAULTS.CENTER.lat, MAP_DEFAULTS.CENTER.lng]}
                zoom={MAP_DEFAULTS.ZOOM}
                className="h-full w-full"
                ref={mapRef}
                zoomControl={!isMobile}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                    mapAction={mapAction}
                    markers={markers}
                    setMarkers={setMarkers}
                    routeGeometry={routeGeometry}
                    setRouteGeometry={setRouteGeometry}
                    onDirectionsResult={onDirectionsResult}
                    onDirectionsError={onDirectionsError}
                    onPlaceDetailsLoaded={onPlaceDetailsLoaded}
                    resizeTrigger={resizeTrigger}
                />

                {/* Route polyline */}
                {routeGeometry.length > 0 && (
                    <Polyline
                        positions={routeGeometry}
                        pathOptions={{ color: '#4285F4', weight: 5, opacity: 0.8 }}
                    />
                )}

                {/* Place markers */}
                {markers.map((marker, index) => (
                    <Marker key={`marker-${index}`} position={marker.position}>
                        {marker.title && <Popup>{marker.title}</Popup>}
                    </Marker>
                ))}

                {/* Current location marker */}
                {currentLocation && (
                    <Marker position={currentLocation} icon={currentLocationIcon}>
                        <Popup>Your Location</Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Current Location Button */}
            <Button
                variant="secondary"
                size="icon"
                className="fixed md:absolute right-4 md:right-4 top-[4.25rem] md:top-3 z-[1000] shadow-lg bg-background hover:bg-accent"
                onClick={handleLocateMe}
                disabled={isLocating}
                title="Go to my location"
            >
                {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Locate className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}
