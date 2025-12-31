import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, PanelLeftClose, List, ChevronDown, X, Map, Navigation, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { GoogleMap } from '@/components/GoogleMap';
import { ChatPanel } from '@/components/ChatPanel';
import { PlacesList } from '@/components/PlacesList';
import { PlaceDetails } from '@/components/PlaceDetails';
import { SearchBar } from '@/components/SearchBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import type { MapAction, PlaceData, SelectedPlace, SearchHistory, DirectionResult, DirectionError, TimePeriodPlaces } from '@/types';
import { ItineraryFlowchart } from '@/components/ItineraryFlowchart';
import { GOOGLE_MAPS_API_KEY } from '@/constants';
import { PlacesAutocomplete } from '@/components/PlacesAutocomplete';
import { getCurrentLocation } from '@/lib/geolocation';
import Logo from '@/assets/logo.svg';

function App() {
  const [mapAction, setMapAction] = useState<MapAction | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [placesList, setPlacesList] = useState<PlaceData[]>([]);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceData | null>(null);
  const [placeIdToFetch, setPlaceIdToFetch] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isPlacesListCollapsed, setIsPlacesListCollapsed] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string | null>(null);
  const [chatWidth, setChatWidth] = useState(380);
  const isResizingRef = useRef(false);
  const [directionResult, setDirectionResult] = useState<DirectionResult | null>(null);
  const [searchBarDirectionError, setSearchBarDirectionError] = useState<DirectionError | null>(null);
  const [placeDetailsDirectionError, setPlaceDetailsDirectionError] = useState<DirectionError | null>(null);
  const [lastDirectionSource, setLastDirectionSource] = useState<'searchBar' | 'placeDetails' | null>(null);
  const [isMobilePlacesOpen, setIsMobilePlacesOpen] = useState(false);
  const [isMobileDirectionsOpen, setIsMobileDirectionsOpen] = useState(false);
  const [mobileOrigin, setMobileOrigin] = useState('');
  const [mobileDestination, setMobileDestination] = useState('');
  const [mobileDirectionLoading, setMobileDirectionLoading] = useState(false);
  const [mobileDirectionError, setMobileDirectionError] = useState<string | null>(null);
  const [directionsSuccess, setDirectionsSuccess] = useState(false);
  const [mobileDirectionsPending, setMobileDirectionsPending] = useState(false);
  const [flowchartData, setFlowchartData] = useState<{
    day: string;
    timePeriods: TimePeriodPlaces;
  } | null>(null);

  const handleMapAction = useCallback((action: MapAction) => {
    // Add timestamp to force re-trigger even if same action
    setMapAction({ ...action, _timestamp: Date.now() } as MapAction);
    if (action.action === 'search' && action.query) {
      setSelectedPlaceDetails(null);
      setIsPlacesListCollapsed(false);
      setCurrentSearchQuery(action.query);
    }
  }, []);

  const handlePlaceSelect = useCallback((place: PlaceData) => {
    if (place.location) {
      setSelectedPlace({
        name: place.displayName || 'Selected Location',
        address: place.formattedAddress || '',
        lat: place.location.lat,
        lng: place.location.lng,
      });
    }
  }, []);

  const handlePlacesFound = useCallback((places: PlaceData[], query?: string) => {
    setPlacesList(places);
    // Clear selected place details when new places are found
    setSelectedPlaceDetails(null);
    if (places.length > 0) {
      setIsPlacesListCollapsed(false);
      // Store in search history
      if (query || currentSearchQuery) {
        setSearchHistory(prev => {
          const newEntry: SearchHistory = {
            query: query || currentSearchQuery || '',
            places,
            timestamp: Date.now(),
          };
          // Keep last 10 searches
          return [newEntry, ...prev.slice(0, 9)];
        });
      }
    }
  }, [currentSearchQuery]);

  const handlePlaceDetailsLoaded = useCallback((place: PlaceData) => {
    setSelectedPlaceDetails(place);
    setPlaceIdToFetch(null);
    // Add the place to placesList if not already present
    setPlacesList([place]);
    // On mobile, show places panel with details when marker is clicked
    if (window.innerWidth < 768) {
      setIsMobilePlacesOpen(true);
      setIsChatOpen(false);
      setIsMobileDirectionsOpen(false);
    }
  }, []);

  const handlePlaceClick = useCallback((place: PlaceData) => {
    if (place.id) {
      setMapAction({
        action: 'goto',
        lat: place.location?.lat || 0,
        lng: place.location?.lng || 0,
        zoom: 16,
        title: place.displayName,
      });
      setPlaceIdToFetch(place.id);
    }
  }, []);

  const handleGetDirections = useCallback((place: PlaceData, origin: string = 'My Location') => {
    setSearchBarDirectionError(null);
    setPlaceDetailsDirectionError(null);
    setDirectionResult(null);
    setLastDirectionSource('placeDetails');
    setMapAction({
      action: 'directions',
      origin,
      destination: place.formattedAddress || place.displayName || '',
      _timestamp: Date.now(),
    });
    // Close mobile places panel when getting directions
    if (window.innerWidth < 768) {
      setIsMobilePlacesOpen(false);
    }
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedPlaceDetails(null);
  }, []);

  const handleSearchBarSearch = useCallback((query: string) => {
    handleMapAction({ action: 'search', query });
  }, [handleMapAction]);

  const handleSearchBarDirections = useCallback((origin: string, destination: string) => {
    setSearchBarDirectionError(null);
    setPlaceDetailsDirectionError(null);
    setDirectionResult(null);
    setLastDirectionSource('searchBar');
    // Navigate back to places list from place details
    setSelectedPlaceDetails(null);
    setMapAction({
      action: 'directions',
      origin,
      destination,
      _timestamp: Date.now(),
    });
  }, []);

  const handleDirectionsResult = useCallback((result: DirectionResult) => {
    setSearchBarDirectionError(null);
    setPlaceDetailsDirectionError(null);
    setDirectionResult(result);
    setDirectionsSuccess(true);
  }, []);

  const clearSearchBarDirectionError = useCallback(() => {
    setSearchBarDirectionError(null);
  }, []);

  const clearDirectionsSuccess = useCallback(() => {
    setDirectionsSuccess(false);
  }, []);

  const handleDirectionsError = useCallback((error: DirectionError) => {
    setDirectionResult(null);
    if (lastDirectionSource === 'searchBar') {
      // Always set desktop error for searchBar source
      setSearchBarDirectionError(error);
      // Also set mobile error if request was from mobile directions sheet
      if (mobileDirectionsPending) {
        setMobileDirectionError(error.message);
        setMobileDirectionsPending(false);
      }
    } else if (lastDirectionSource === 'placeDetails') {
      setPlaceDetailsDirectionError(error);
    }
  }, [lastDirectionSource, mobileDirectionsPending]);

  // Handle mobile directions success - close sheet and clear inputs
  useEffect(() => {
    if (directionsSuccess && mobileDirectionsPending) {
      setIsMobileDirectionsOpen(false);
      setMobileOrigin('');
      setMobileDestination('');
      setMobileDirectionsPending(false);
      setMobileDirectionError(null);
    }
  }, [directionsSuccess, mobileDirectionsPending]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Top Header with Search Bar and Theme Toggle */}
      <header className="flex items-center gap-4 px-2 sm:px-4 py-2 sm:py-3 border-b bg-background z-40 shrink-0 fixed top-0 left-0 right-0 md:relative md:inset-auto">
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <img src={Logo} alt="MapGPT" className="h-8 w-8" />
          <h1 className="font-semibold text-lg hidden mr-2 md:block">MapGPT</h1>
        </div>
        <div className="flex-1 min-w-0">
          <SearchBar 
            onSearch={handleSearchBarSearch} 
            onGetDirections={handleSearchBarDirections}
            directionError={searchBarDirectionError}
            onClearDirectionError={clearSearchBarDirectionError}
            directionsSuccess={directionsSuccess}
            onDirectionsSuccessHandled={clearDirectionsSuccess}
          />
        </div>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] overflow-hidden pt-14 md:pt-0">
        {/* Chat Panel - Desktop sidebar */}
        <div
          className={`chat-panel hidden md:grid md:relative md:col-start-1 md:row-start-1 md:h-full border-r bg-background grid-rows-[auto_1fr] ${
            isChatOpen ? '' : 'md:hidden'
          }`}
          style={{ width: chatWidth }}
        >
          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 z-20"
            onMouseDown={(e) => {
              e.preventDefault();
              isResizingRef.current = true;
              const startX = e.clientX;
              const startWidth = chatWidth;
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!isResizingRef.current) return;
                const delta = moveEvent.clientX - startX;
                const newWidth = Math.min(600, Math.max(300, startWidth + delta));
                setChatWidth(newWidth);
              };
              
              const handleMouseUp = () => {
                isResizingRef.current = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <div className="flex items-center justify-end p-2 border-b">
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} title="Minimize chat">
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
          <div className="min-h-0 overflow-hidden">
            <ChatPanel 
              onMapAction={handleMapAction} 
              selectedPlace={selectedPlace}
              searchHistory={searchHistory}
              places={placesList}
              onViewPlaces={(query?: string) => {
                if (query) {
                  const historyEntry = searchHistory.find(h => h.query === query);
                  if (historyEntry) {
                    setPlacesList(historyEntry.places);
                  }
                }
                setIsPlacesListCollapsed(false);
                setSelectedPlaceDetails(null);
              }}
              onShowFlowchart={setFlowchartData}
            />
          </div>
        </div>

        {/* Mobile Chat Bottom Sheet */}
        <div
          className={`md:hidden fixed inset-x-0 bottom-16 z-50 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
            isChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
          }`}
          style={{ height: 'calc(85vh - 64px)', maxHeight: 'calc(100vh - 130px)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 border-b">
            <h3 className="font-semibold">Chat</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-[calc(100%-60px)] overflow-hidden">
            <ChatPanel 
              onMapAction={handleMapAction} 
              selectedPlace={selectedPlace}
              searchHistory={searchHistory}
              places={placesList}
              onViewPlaces={(query?: string) => {
                if (query) {
                  const historyEntry = searchHistory.find(h => h.query === query);
                  if (historyEntry) {
                    setPlacesList(historyEntry.places);
                  }
                }
                setIsPlacesListCollapsed(false);
                setSelectedPlaceDetails(null);
                setIsMobilePlacesOpen(true);
                setIsChatOpen(false);
              }}
              onClose={() => setIsChatOpen(false)}
              onShowFlowchart={setFlowchartData}
            />
          </div>
        </div>

        {/* Mobile Chat Backdrop */}
        {isChatOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsChatOpen(false)}
          />
        )}

        {/* Map - Center column */}
        <div className="col-start-1 md:col-start-2 row-start-1 relative">
          <GoogleMap
            apiKey={GOOGLE_MAPS_API_KEY}
            mapAction={mapAction}
            onPlaceSelect={handlePlaceSelect}
            onPlacesFound={handlePlacesFound}
            onPlaceDetailsLoaded={handlePlaceDetailsLoaded}
            onDirectionsResult={handleDirectionsResult}
            onDirectionsError={handleDirectionsError}
            placeIdToFetch={placeIdToFetch}
          />

          {/* Direction Error Panel - shown on map for mobile place details only */}
          {placeDetailsDirectionError && (
            <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground rounded-lg shadow-lg p-3 z-20 max-w-md w-[90%]">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{placeDetailsDirectionError.message}</span>
                <button 
                  onClick={() => setPlaceDetailsDirectionError(null)} 
                  className="hover:opacity-80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Direction Results Panel */}
          {directionResult && (
            <div className="fixed md:absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-3 md:p-4 z-20 max-w-md w-[90%] sm:w-auto">
              <div className="flex items-baseline justify-between mb-1 md:mb-2">
                <div>
                  <h3 className="font-semibold text-xs md:text-sm">Travel Times</h3>
                  <p className="text-[10px] text-muted-foreground">Estimates only · Tap for live directions</p>
                </div>
                <button
                  onClick={() => setDirectionResult(null)}
                  className="text-muted-foreground hover:text-foreground text-base md:text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-xs md:text-sm">
                {directionResult.routes.map((route) => {
                  const travelMode = route.mode === 'driving' ? 'driving' : route.mode === 'walking' ? 'walking' : route.mode === 'bicycling' ? 'bicycling' : 'transit';
                  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(directionResult.origin)}&destination=${encodeURIComponent(directionResult.destination)}&travelmode=${travelMode}`;
                  return (
                    <a
                      key={route.mode}
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      title={`Open in Google Maps (${route.mode})`}
                    >
                      <span className="text-sm md:text-lg">
                        {route.mode === 'driving' && '🚗'}
                        {route.mode === 'walking' && '🚶'}
                        {route.mode === 'bicycling' && '🚴'}
                        {route.mode === 'transit' && '🚌'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium capitalize text-xs md:text-sm">{route.mode}</div>
                        <div className="text-muted-foreground text-[10px] md:text-xs">
                          {route.duration} · {route.distance}
                        </div>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Bottom Navigation Bar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-30 safe-area-bottom">
            <div className="flex items-center justify-around h-16">
              {/* Chat Tab */}
              <button
                onClick={() => {
                  setIsChatOpen(true);
                  setIsMobilePlacesOpen(false);
                  setIsMobileDirectionsOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isChatOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-xs mt-1">Chat</span>
              </button>

              {/* Directions Tab */}
              <button
                onClick={() => {
                  setIsMobileDirectionsOpen(true);
                  setIsChatOpen(false);
                  setIsMobilePlacesOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isMobileDirectionsOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Navigation className="h-5 w-5" />
                <span className="text-xs mt-1">Directions</span>
              </button>

              {/* Places Tab */}
              <button
                onClick={() => {
                  setIsMobilePlacesOpen(true);
                  setIsChatOpen(false);
                  setIsMobileDirectionsOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                  isMobilePlacesOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <List className="h-5 w-5" />
                <span className="text-xs mt-1">Places</span>
                {placesList.length > 0 && (
                  <span className="absolute top-2 right-1/4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {placesList.length}
                  </span>
                )}
              </button>
            </div>
          </nav>

          {/* Desktop Chat Toggle Button */}
          {!isChatOpen && (
            <Button
              className="hidden md:flex fixed bottom-6 left-8 h-14 w-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
              onClick={() => setIsChatOpen(true)}
              title="Open chat"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Places List Panel - Desktop: Right column */}
        <div className="hidden md:flex col-start-3 row-start-1 h-full overflow-hidden">
          {!selectedPlaceDetails ? (
            <PlacesList
              places={placesList}
              onPlaceClick={handlePlaceClick}
              selectedPlaceId={null}
              isCollapsed={isPlacesListCollapsed}
              onCollapsedChange={setIsPlacesListCollapsed}
            />
          ) : (
            <PlaceDetails
              place={selectedPlaceDetails}
              onClose={handleCloseDetails}
              onGetDirections={handleGetDirections}
              directionError={placeDetailsDirectionError}
              onClearDirectionError={() => setPlaceDetailsDirectionError(null)}
            />
          )}
        </div>

        {/* Mobile Bottom Sheet for Places */}
        <div
          className={`md:hidden fixed inset-x-0 bottom-16 z-50 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
            isMobilePlacesOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
          }`}
          style={{ height: 'calc(90vh - 64px)', maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 border-b">
            <h3 className="font-semibold">
              {selectedPlaceDetails ? selectedPlaceDetails.displayName : `Places (${placesList.length})`}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedPlaceDetails) {
                  handleCloseDetails();
                } else {
                  setIsMobilePlacesOpen(false);
                }
              }}
            >
              {selectedPlaceDetails ? <X className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {!selectedPlaceDetails ? (
              <div className="p-3 space-y-2 pb-20">
                {placesList.map((place, index) => (
                  <button
                    key={`${place.id}-${index}`}
                    onClick={() => {
                      handlePlaceClick(place);
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-accent border flex items-center gap-3 active:scale-[0.98] transition-transform"
                  >
                    {place.photoUrls?.[0] ? (
                      <img
                        src={place.photoUrls[0]}
                        alt={place.displayName}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Map className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{place.displayName}</h4>
                      {place.types?.[0] && (
                        <p className="text-xs text-muted-foreground capitalize truncate">
                          {place.types[0].replace(/_/g, ' ')}
                        </p>
                      )}
                      {place.rating && (
                        <p className="text-sm text-muted-foreground mt-0.5">⭐ {place.rating}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <PlaceDetails
                place={selectedPlaceDetails}
                onClose={handleCloseDetails}
                onGetDirections={handleGetDirections}
                directionError={placeDetailsDirectionError}
                onClearDirectionError={() => setPlaceDetailsDirectionError(null)}
              />
            )}
          </div>
        </div>

        {/* Mobile Directions Bottom Sheet */}
        <div
          className={`md:hidden fixed inset-x-0 bottom-16 z-50 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out overflow-visible ${
            isMobileDirectionsOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
          }`}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Get Directions
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileDirectionsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-4 space-y-3 overflow-visible">
            <div className="relative z-20">
              <PlacesAutocomplete
                value={mobileOrigin}
                onChange={(val) => {
                  setMobileOrigin(val);
                  setMobileDirectionError(null);
                }}
                placeholder="From (starting location)"
                showLocationButton
                onUseCurrentLocation={async () => {
                  setMobileDirectionLoading(true);
                  setMobileDirectionError(null);
                  try {
                    const result = await getCurrentLocation();
                    setMobileOrigin(result.address || `${result.latitude}, ${result.longitude}`);
                  } catch (error) {
                    const err = error as { message?: string };
                    setMobileDirectionError(err.message || 'Could not get location');
                  }
                  setMobileDirectionLoading(false);
                }}
                isLoadingLocation={mobileDirectionLoading}
              />
            </div>
            <div className="relative z-10">
              <PlacesAutocomplete
                value={mobileDestination}
                onChange={(val) => {
                  setMobileDestination(val);
                  setMobileDirectionError(null);
                }}
                placeholder="To (destination)"
              />
            </div>
            {mobileDirectionError && (
              <div className="flex items-center gap-1.5 text-destructive text-xs bg-destructive/10 px-2 py-1.5 rounded">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="flex-1 line-clamp-2">{mobileDirectionError}</span>
                <button onClick={() => setMobileDirectionError(null)} className="hover:text-destructive/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Button
              className="w-full"
              disabled={!mobileDestination.trim() || mobileDirectionLoading || mobileDirectionsPending}
              onClick={async () => {
                setMobileDirectionError(null);
                let finalOrigin = mobileOrigin.trim();
                if (!finalOrigin) {
                  setMobileDirectionLoading(true);
                  try {
                    const result = await getCurrentLocation();
                    finalOrigin = result.address || `${result.latitude}, ${result.longitude}`;
                    setMobileOrigin(finalOrigin);
                  } catch (error) {
                    const err = error as { message?: string };
                    setMobileDirectionError(err.message || 'Could not get your location');
                    setMobileDirectionLoading(false);
                    return;
                  }
                  setMobileDirectionLoading(false);
                }
                // Set pending flag - will close on success, stay open on error
                setMobileDirectionsPending(true);
                handleSearchBarDirections(finalOrigin, mobileDestination.trim());
              }}
            >
              {(mobileDirectionLoading || mobileDirectionsPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              {mobileDirectionsPending ? 'Getting Directions...' : 'Get Directions'}
            </Button>
          </div>
        </div>

        {/* Mobile Directions Backdrop */}
        {isMobileDirectionsOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileDirectionsOpen(false)}
          />
        )}

        {/* Mobile Bottom Sheet Backdrop */}
        {isMobilePlacesOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              if (selectedPlaceDetails) {
                handleCloseDetails();
              } else {
                setIsMobilePlacesOpen(false);
              }
            }}
          />
        )}

        {/* Itinerary Flowchart - rendered at App level for mobile visibility */}
        {flowchartData && (
          <ItineraryFlowchart
            day={flowchartData.day}
            timePeriods={flowchartData.timePeriods}
            places={placesList}
            onPlaceClick={(placeName) => {
              handleMapAction({ action: 'search', query: placeName });
            }}
            onDirections={(action) => {
              handleMapAction(action);
            }}
            onClose={() => setFlowchartData(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
