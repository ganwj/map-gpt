import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapAction, PlaceData, DirectionResult, DirectionError } from '@/types';
import { MAX_ROUTE_DISTANCE } from '@/types';
import { MAP_DEFAULTS } from '@/constants';

interface GoogleMapProps {
  apiKey: string;
  mapAction?: MapAction | null;
  onPlaceSelect?: (place: PlaceData) => void;
  onPlacesFound?: (places: PlaceData[], query?: string) => void;
  onPlaceDetailsLoaded?: (place: PlaceData) => void;
  onDirectionsResult?: (result: DirectionResult) => void;
  onDirectionsError?: (error: DirectionError) => void;
  placeIdToFetch?: string | null;
}

export function GoogleMap({ apiKey, mapAction, onPlaceSelect: _onPlaceSelect, onPlacesFound, onPlaceDetailsLoaded, onDirectionsResult, onDirectionsError, placeIdToFetch }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use refs for callbacks to avoid dependency array size changes
  const onPlaceDetailsLoadedRef = useRef(onPlaceDetailsLoaded);
  onPlaceDetailsLoadedRef.current = onPlaceDetailsLoaded;
  const onDirectionsResultRef = useRef(onDirectionsResult);
  onDirectionsResultRef.current = onDirectionsResult;
  const onDirectionsErrorRef = useRef(onDirectionsError);
  onDirectionsErrorRef.current = onDirectionsError;

  useEffect(() => {
    if (!apiKey) return;

    if (window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Use callback-based loading for proper initialization
    const callbackName = '__googleMapsCallback';
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      setIsLoaded(true);
      delete (window as unknown as Record<string, () => void>)[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places,marker&callback=${callbackName}&v=beta`;
    script.async = true;
    script.defer = true;
    script.onerror = () => console.error('Failed to load Google Maps script');
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    // Use higher minZoom on mobile to prevent map from being too zoomed out
    const isMobile = window.innerWidth < 768;
    
    const newMap = new google.maps.Map(mapRef.current, {
      center: MAP_DEFAULTS.CENTER,
      zoom: MAP_DEFAULTS.ZOOM,
      mapTypeControl: !isMobile,
      streetViewControl: !isMobile,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapId: '8d1d947eb36d2fce02b18b5e',
      tilt: 0,
      maxZoom: 21,
      minZoom: isMobile ? 3 : 2,
      restriction: isMobile ? {
        latLngBounds: {
          north: 85,
          south: -85,
          west: -180,
          east: 180,
        },
        strictBounds: true,
      } : undefined,
    });

    setMap(newMap);
    
    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      preserveViewport: false,
    });
    renderer.setMap(newMap);
    setDirectionsRenderer(renderer);

    // Listen for clicks on POI (Points of Interest) markers on the map
    newMap.addListener('click', async (e: google.maps.MapMouseEvent & { placeId?: string }) => {
      // If a POI was clicked, fetch its details
      if (e.placeId) {
        e.stop?.(); // Prevent default info window
        
        try {
          const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
          const place = new Place({ id: e.placeId });
          
          await place.fetchFields({
            fields: [
              'id', 'displayName', 'formattedAddress', 'location',
              'rating', 'userRatingCount', 'priceLevel', 'types',
              'photos', 'reviews', 'regularOpeningHours',
              'internationalPhoneNumber', 'websiteURI',
            ],
          });

          const photoUrls: string[] = [];
          if (place.photos) {
            for (const photo of place.photos.slice(0, 10)) {
              try {
                const url = photo.getURI({ maxWidth: 800, maxHeight: 600 });
                if (url) photoUrls.push(url);
              } catch {}
            }
          }

          const reviews: PlaceData['reviews'] = [];
          if (place.reviews) {
            for (const review of place.reviews) {
              reviews.push({
                authorName: review.authorAttribution?.displayName || 'Anonymous',
                rating: review.rating || 0,
                text: review.text || '',
                relativeTime: review.relativePublishTimeDescription || '',
                profilePhotoUrl: review.authorAttribution?.photoURI || undefined,
              });
            }
          }

          let isOpenNow: boolean | undefined;
          try {
            const openResult = await place.isOpen();
            isOpenNow = openResult ?? undefined;
          } catch {}

          const placeData: PlaceData = {
            id: place.id || e.placeId,
            displayName: place.displayName || '',
            formattedAddress: place.formattedAddress || '',
            location: place.location ? { lat: place.location.lat(), lng: place.location.lng() } : null,
            rating: place.rating ?? undefined,
            userRatingCount: place.userRatingCount ?? undefined,
            priceLevel: place.priceLevel?.toString() || undefined,
            types: place.types || undefined,
            photoUrls,
            reviews,
            openingHours: place.regularOpeningHours ? {
              weekdayText: place.regularOpeningHours.weekdayDescriptions || undefined,
              isOpen: isOpenNow,
            } : undefined,
            phoneNumber: place.internationalPhoneNumber || undefined,
            website: place.websiteURI || undefined,
          };

          onPlaceDetailsLoadedRef.current?.(placeData);
        } catch (error) {
          console.error('Error fetching POI place details:', error);
        }
      }
    });
  }, [isLoaded, map]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];
  }, []);

  const fetchPlaceDetails = useCallback(
    async (placeId: string) => {
      if (!isLoaded) return;

      try {
        const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
        
        const place = new Place({
          id: placeId,
        });

        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'priceLevel',
            'types',
            'photos',
            'reviews',
            'regularOpeningHours',
            'internationalPhoneNumber',
            'websiteURI',
          ],
        });

        const photoUrls: string[] = [];
        if (place.photos) {
          for (const photo of place.photos.slice(0, 10)) {
            try {
              const url = photo.getURI({ maxWidth: 800, maxHeight: 600 });
              if (url) photoUrls.push(url);
            } catch {
              // Skip failed photos
            }
          }
        }

        const reviews: PlaceData['reviews'] = [];
        if (place.reviews) {
          for (const review of place.reviews) {
            reviews.push({
              authorName: review.authorAttribution?.displayName || 'Anonymous',
              rating: review.rating || 0,
              text: review.text || '',
              relativeTime: review.relativePublishTimeDescription || '',
              profilePhotoUrl: review.authorAttribution?.photoURI || undefined,
            });
          }
        }

        let isOpen: boolean | undefined;
        try {
          const isOpenResult = place.isOpen();
          isOpen = isOpenResult instanceof Promise ? await isOpenResult : isOpenResult;
        } catch {
          isOpen = undefined;
        }

        const placeData: PlaceData = {
          id: place.id || placeId,
          displayName: place.displayName || '',
          formattedAddress: place.formattedAddress || '',
          location: place.location ? {
            lat: place.location.lat(),
            lng: place.location.lng(),
          } : null,
          rating: place.rating ?? undefined,
          userRatingCount: place.userRatingCount ?? undefined,
          priceLevel: place.priceLevel?.toString(),
          types: place.types,
          photoUrls,
          reviews,
          openingHours: place.regularOpeningHours ? {
            weekdayText: place.regularOpeningHours.weekdayDescriptions,
            isOpen,
          } : undefined,
          phoneNumber: place.internationalPhoneNumber || undefined,
          website: place.websiteURI || undefined,
        };

        onPlaceDetailsLoadedRef.current?.(placeData);
      } catch (error) {
        console.error('Error fetching place details:', error);
      }
    },
    [isLoaded]
  );

  const addMarker = useCallback(
    async (lat: number, lng: number, title?: string, placeId?: string) => {
      if (!map) return;

      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
      
      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title,
      });

      marker.addListener('click', () => {
        if (placeId) {
          fetchPlaceDetails(placeId);
        } else {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]?.place_id) {
              fetchPlaceDetails(results[0].place_id);
            }
          });
        }
      });

      markersRef.current.push(marker);
      return marker;
    },
    [map, fetchPlaceDetails]
  );

  const searchPlaces = useCallback(
    async (query: string) => {
      if (!isLoaded || !map) return;

      try {
        const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
        
        const request = {
          textQuery: query,
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'types', 'photos', 'regularOpeningHours'],
          maxResultCount: 20,
        };

        const { places } = await Place.searchByText(request);

        if (places && places.length > 0) {
          clearMarkers();

          const placesData: PlaceData[] = [];

          for (const place of places) {
            if (place.location) {
              addMarker(
                place.location.lat(),
                place.location.lng(),
                place.displayName || '',
                place.id
              );

              let isOpen: boolean | undefined;
              try {
                const isOpenResult = place.isOpen();
                isOpen = isOpenResult instanceof Promise ? undefined : isOpenResult;
              } catch {
                isOpen = undefined;
              }

              const photoUrls: string[] = [];
              if (place.photos && place.photos.length > 0) {
                try {
                  const url = place.photos[0].getURI({ maxWidth: 200, maxHeight: 200 });
                  if (url) photoUrls.push(url);
                } catch {
                  // Skip failed photo
                }
              }

              placesData.push({
                id: place.id || '',
                displayName: place.displayName || '',
                formattedAddress: place.formattedAddress || '',
                location: {
                  lat: place.location.lat(),
                  lng: place.location.lng(),
                },
                rating: place.rating ?? undefined,
                userRatingCount: place.userRatingCount ?? undefined,
                types: place.types,
                photoUrls,
                openingHours: place.regularOpeningHours ? {
                  isOpen,
                } : undefined,
              });
            }
          }

          if (places[0]?.location) {
            map.setCenter(places[0].location);
            map.setZoom(13);
          }

          onPlacesFound?.(placesData, query);
        }
      } catch (error) {
        console.error('Error searching places:', error);
      }
    },
    [isLoaded, map, clearMarkers, addMarker, onPlacesFound]
  );

  useEffect(() => {
    if (!mapAction || !map || !isLoaded) return;

    switch (mapAction.action) {
      case 'search':
        if (mapAction.query) {
          searchPlaces(mapAction.query);
        }
        break;

      case 'goto':
        if (mapAction.lat !== undefined && mapAction.lng !== undefined) {
          clearMarkers();
          map.setCenter({ lat: mapAction.lat, lng: mapAction.lng });
          map.setZoom(mapAction.zoom || 15);
          addMarker(mapAction.lat, mapAction.lng, mapAction.title);
        }
        break;

      case 'marker':
        if (mapAction.lat !== undefined && mapAction.lng !== undefined) {
          addMarker(mapAction.lat, mapAction.lng, mapAction.title);
          map.panTo({ lat: mapAction.lat, lng: mapAction.lng });
        }
        break;

      case 'directions':
        if (mapAction.origin && mapAction.destination && directionsRenderer) {
          // Clear any existing directions first
          directionsRenderer.set('directions', null);
          clearMarkers();
          
          const directionsService = new google.maps.DirectionsService();
          
          // Handle "My Location" by using browser geolocation or map center as fallback
          const getOrigin = (): Promise<string | google.maps.LatLngLiteral> => {
            if (mapAction.origin?.toLowerCase() === 'my location') {
              return new Promise((resolve) => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      });
                    },
                    () => {
                      // Fallback to map center if geolocation fails/denied
                      const center = map.getCenter();
                      if (center) {
                        resolve({ lat: center.lat(), lng: center.lng() });
                      } else {
                        resolve({ lat: 40.7128, lng: -74.006 }); // Default NYC
                      }
                    },
                    { timeout: 5000 }
                  );
                } else {
                  // Fallback to map center if geolocation not supported
                  const center = map.getCenter();
                  if (center) {
                    resolve({ lat: center.lat(), lng: center.lng() });
                  } else {
                    resolve({ lat: 40.7128, lng: -74.006 });
                  }
                }
              });
            }
            return Promise.resolve(mapAction.origin!);
          };

          getOrigin()
            .then(async (origin) => {
              // Get directions for driving (primary route to display)
              directionsService.route(
                {
                  origin,
                  destination: mapAction.destination!,
                  travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                  if (status === google.maps.DirectionsStatus.OK && result) {
                    directionsRenderer.setDirections(result);
                  } else {
                    console.error('Directions request failed:', status);
                  }
                }
              );

              // Query all travel modes for duration comparison
              const modes: google.maps.TravelMode[] = [
                google.maps.TravelMode.DRIVING,
                google.maps.TravelMode.WALKING,
                google.maps.TravelMode.BICYCLING,
                google.maps.TravelMode.TRANSIT,
              ];

              const routeResults: DirectionResult['routes'] = [];

              for (const mode of modes) {
                try {
                  const result = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
                    directionsService.route(
                      {
                        origin,
                        destination: mapAction.destination!,
                        travelMode: mode,
                      },
                      (res, stat) => {
                        if (stat === google.maps.DirectionsStatus.OK && res) {
                          resolve(res);
                        } else {
                          resolve(null);
                        }
                      }
                    );
                  });

                  if (result?.routes[0]?.legs[0]) {
                    const leg = result.routes[0].legs[0];
                    routeResults.push({
                      mode: mode.toLowerCase() as 'driving' | 'walking' | 'bicycling' | 'transit',
                      duration: leg.duration?.text || '',
                      distance: leg.distance?.text || '',
                      durationValue: leg.duration?.value || 0,
                      distanceValue: leg.distance?.value || 0,
                    });
                  }
                } catch {
                  // Skip failed mode
                }
              }

              if (routeResults.length === 0) {
                onDirectionsErrorRef.current?.({
                  type: 'NO_ROUTE',
                  message: 'No routes found between these locations.',
                  origin: typeof origin === 'string' ? origin : `${origin.lat}, ${origin.lng}`,
                  destination: mapAction.destination!,
                });
                return;
              }

              // Check if any route exceeds max distance for its mode
              const tooLongRoutes = routeResults.filter(route => {
                const maxDistance = MAX_ROUTE_DISTANCE[route.mode];
                return route.distanceValue > maxDistance;
              });

              if (tooLongRoutes.length === routeResults.length) {
                // All routes are too long
                const shortestRoute = routeResults.reduce((min, route) => 
                  route.distanceValue < min.distanceValue ? route : min
                );
                onDirectionsErrorRef.current?.({
                  type: 'ROUTE_TOO_LONG',
                  message: `The route is too long (${shortestRoute.distance}). Please choose closer locations.`,
                  origin: typeof origin === 'string' ? origin : `${origin.lat}, ${origin.lng}`,
                  destination: mapAction.destination!,
                });
                return;
              }

              // Filter out routes that are too long for their mode
              const validRoutes = routeResults.filter(route => {
                const maxDistance = MAX_ROUTE_DISTANCE[route.mode];
                return route.distanceValue <= maxDistance;
              });

              if (validRoutes.length > 0 && onDirectionsResultRef.current) {
                onDirectionsResultRef.current({
                  origin: typeof origin === 'string' ? origin : `${origin.lat}, ${origin.lng}`,
                  destination: mapAction.destination!,
                  routes: validRoutes,
                });
                
                // Search for origin and destination places to show in places list
                try {
                  const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
                  const placesData: PlaceData[] = [];
                  
                  // Search for origin (if not "My Location")
                  if (typeof origin === 'string') {
                    const originRequest = {
                      textQuery: origin,
                      fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'types', 'photos'],
                      maxResultCount: 1,
                    };
                    const { places: originPlaces } = await Place.searchByText(originRequest);
                    if (originPlaces && originPlaces[0]?.location) {
                      const place = originPlaces[0];
                      const loc = place.location!;
                      const photoUrls: string[] = [];
                      if (place.photos && place.photos.length > 0) {
                        try {
                          const url = place.photos[0].getURI({ maxWidth: 400 });
                          if (url) photoUrls.push(url);
                        } catch { /* Skip */ }
                      }
                      placesData.push({
                        id: place.id || '',
                        displayName: place.displayName || origin,
                        formattedAddress: place.formattedAddress || '',
                        location: { lat: loc.lat(), lng: loc.lng() },
                        rating: place.rating ?? undefined,
                        userRatingCount: place.userRatingCount ?? undefined,
                        types: place.types,
                        photoUrls,
                      });
                    }
                  }
                  
                  // Search for destination
                  const destRequest = {
                    textQuery: mapAction.destination!,
                    fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'types', 'photos'],
                    maxResultCount: 1,
                  };
                  const { places: destPlaces } = await Place.searchByText(destRequest);
                  if (destPlaces && destPlaces[0]?.location) {
                    const place = destPlaces[0];
                    const loc = place.location!;
                    const photoUrls: string[] = [];
                    if (place.photos && place.photos.length > 0) {
                      try {
                        const url = place.photos[0].getURI({ maxWidth: 400 });
                        if (url) photoUrls.push(url);
                      } catch { /* Skip */ }
                    }
                    placesData.push({
                      id: place.id || '',
                      displayName: place.displayName || mapAction.destination!,
                      formattedAddress: place.formattedAddress || '',
                      location: { lat: loc.lat(), lng: loc.lng() },
                      rating: place.rating ?? undefined,
                      userRatingCount: place.userRatingCount ?? undefined,
                      types: place.types,
                      photoUrls,
                    });
                  }
                  
                  if (placesData.length > 0) {
                    onPlacesFound?.(placesData);
                  }
                } catch (error) {
                  console.error('Error fetching direction places:', error);
                }
              }
            })
            .catch((error) => {
              console.error('Error getting directions:', error);
              onDirectionsErrorRef.current?.({
                type: 'UNKNOWN_ERROR',
                message: 'Failed to get directions. Please try again.',
                origin: mapAction.origin,
                destination: mapAction.destination!,
              });
            });
        }
        break;

      case 'multiSearch':
        if (mapAction.queries && mapAction.queries.length > 0) {
          // Search for multiple places using new Place API
          clearMarkers();
          const bounds = new google.maps.LatLngBounds();
          const orderedPlaces: (PlaceData | null)[] = new Array(mapAction.queries.length).fill(null);
          
          (async () => {
            try {
              const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
              
              // First, geocode the first query to get location context
              const geocoder = new google.maps.Geocoder();
              const firstQuery = mapAction.queries![0];
              
              let locationBias: google.maps.LatLng | undefined;
              
              try {
                const geoResults = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
                  geocoder.geocode({ address: firstQuery }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results) {
                      resolve(results);
                    } else {
                      reject(status);
                    }
                  });
                });
                
                if (geoResults[0]?.geometry?.location) {
                  locationBias = geoResults[0].geometry.location;
                }
              } catch {
                // Continue without location bias if geocoding fails
              }
              
              const searchPromises = mapAction.queries!.map(async (query, index) => {
                try {
                  const request: { textQuery: string; fields: string[]; maxResultCount: number; locationBias?: google.maps.LatLng } = {
                    textQuery: query,
                    fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'types', 'photos'],
                    maxResultCount: 1,
                  };
                  
                  if (locationBias) {
                    request.locationBias = locationBias;
                  }
                  
                  const { places } = await Place.searchByText(request);
                  
                  if (places && places[0]?.location) {
                    const place = places[0];
                    const location = place.location!;
                    const lat = location.lat();
                    const lng = location.lng();
                    addMarker(lat, lng, place.displayName || query, place.id);
                    bounds.extend(location);
                    
                    const photoUrls: string[] = [];
                    if (place.photos && place.photos.length > 0) {
                      try {
                        const url = place.photos[0].getURI({ maxWidth: 400 });
                        if (url) photoUrls.push(url);
                      } catch {
                        // Skip failed photo
                      }
                    }
                    
                    orderedPlaces[index] = {
                      id: place.id || '',
                      displayName: place.displayName || query,
                      formattedAddress: place.formattedAddress || '',
                      location: { lat, lng },
                      rating: place.rating ?? undefined,
                      userRatingCount: place.userRatingCount ?? undefined,
                      types: place.types,
                      photoUrls,
                    };
                  }
                } catch (error) {
                  console.error(`Error searching for "${query}":`, error);
                }
              });
              
              await Promise.all(searchPromises);
              
              const validPlaces = orderedPlaces.filter((p): p is PlaceData => p !== null);
              if (validPlaces.length > 0) {
                map.fitBounds(bounds);
                onPlacesFound?.(validPlaces);
              }
            } catch (error) {
              console.error('Error in multiSearch:', error);
            }
          })();
        }
        break;
    }
  }, [mapAction, map, isLoaded, directionsRenderer, clearMarkers, addMarker, searchPlaces, onPlacesFound]);

  useEffect(() => {
    if (placeIdToFetch && isLoaded) {
      fetchPlaceDetails(placeIdToFetch);
    }
  }, [placeIdToFetch, isLoaded, fetchPlaceDetails]);

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Please set your Google Maps API key</p>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="h-full w-full" />
  );
}
