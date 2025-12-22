import { useEffect, useRef, useState, useCallback } from 'react';

interface MapAction {
  action: 'search' | 'goto' | 'directions' | 'marker';
  query?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  title?: string;
  origin?: string;
  destination?: string;
  placeId?: string;
}

export interface PlaceData {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number } | null;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  photoUrls?: string[];
  reviews?: Array<{
    authorName: string;
    rating: number;
    text: string;
    relativeTime: string;
    profilePhotoUrl?: string;
  }>;
  openingHours?: {
    weekdayText?: string[];
    isOpen?: boolean;
  };
  phoneNumber?: string;
  website?: string;
}

interface GoogleMapProps {
  apiKey: string;
  mapAction?: MapAction | null;
  onPlaceSelect?: (place: PlaceData) => void;
  onPlacesFound?: (places: PlaceData[]) => void;
  onPlaceDetailsLoaded?: (place: PlaceData) => void;
  placeIdToFetch?: string | null;
}

export function GoogleMap({ apiKey, mapAction, onPlaceSelect, onPlacesFound, onPlaceDetailsLoaded, placeIdToFetch }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=beta`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps script');
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.006 },
      zoom: 12,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapId: '8d1d947eb36d2fcbd801e5af'
    });

    setMap(newMap);
    
    const renderer = new google.maps.DirectionsRenderer();
    renderer.setMap(newMap);
    setDirectionsRenderer(renderer);

    newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: e.latLng }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onPlaceSelect?.({
              id: results[0].place_id || '',
              displayName: results[0].formatted_address || '',
              formattedAddress: results[0].formatted_address || '',
              location: {
                lat: e.latLng!.lat(),
                lng: e.latLng!.lng(),
              },
            });
          }
        });
      }
    });
  }, [isLoaded, map, onPlaceSelect]);

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

        onPlaceDetailsLoaded?.(placeData);
      } catch (error) {
        console.error('Error fetching place details:', error);
      }
    },
    [isLoaded, onPlaceDetailsLoaded]
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

          onPlacesFound?.(placesData);
        }
      } catch (error) {
        console.error('Error searching places:', error);
      }
    },
    [isLoaded, map, clearMarkers, onPlacesFound]
  );

  const addMarker = useCallback(
    (lat: number, lng: number, title?: string, placeId?: string) => {
      if (!map) return;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title,
      });

      marker.addEventListener('gmp-click', () => {
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
          const directionsService = new google.maps.DirectionsService();
          directionsService.route(
            {
              origin: mapAction.origin,
              destination: mapAction.destination,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                clearMarkers();
                directionsRenderer.setDirections(result);
              }
            }
          );
        }
        break;
    }
  }, [mapAction, map, isLoaded, directionsRenderer, clearMarkers, addMarker, searchPlaces]);

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
