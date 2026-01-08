import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, PanelLeftClose, List, ChevronDown, X, MapPin, Navigation, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { OpenStreetMap } from '@/components/OpenStreetMap';
import { ChatPanel } from '@/components/ChatPanel';
import { PlacesList } from '@/components/PlacesList';
import { SearchBar } from '@/components/SearchBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import type { MapAction, PlaceData, SelectedPlace, DirectionResult, DirectionError, TimePeriodPlaces, PlacesDay } from '@/types';
import { ItineraryFlowchart } from '@/components/ItineraryFlowchart';
import { PlacesAutocomplete } from '@/components/PlacesAutocomplete';
import { getCurrentLocation } from '@/lib/geolocation';
import { clearPlacesCache } from '@/lib/nominatim';
import Logo from '@/assets/logo.svg';

function App() {
  const [mapAction, setMapAction] = useState<MapAction | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [placesList, setPlacesList] = useState<PlaceData[]>([]);
  const [placeIdToFetch, setPlaceIdToFetch] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isPlacesListCollapsed, setIsPlacesListCollapsed] = useState(false);
  const [chatWidth, setChatWidth] = useState(380);
  const isResizingRef = useRef(false);
  const [directionResult, setDirectionResult] = useState<DirectionResult | null>(null);
  const [searchBarDirectionError, setSearchBarDirectionError] = useState<DirectionError | null>(null);
  const [searchBarShowDirections, setSearchBarShowDirections] = useState(false);
  const [searchBarExternalDestination, setSearchBarExternalDestination] = useState('');
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
    timePeriods?: TimePeriodPlaces;
    placesDay?: PlacesDay | null;
  } | null>(null);

  const [isActionPending, setIsActionPending] = useState(false);

  // Ref to resolve promises returned by handleMapAction
  const actionResolverRef = useRef<(() => void) | null>(null);

  // Clear places cache on refresh/initialization
  useEffect(() => {
    clearPlacesCache();
  }, []);

  const handleMapAction = useCallback((action: MapAction) => {
    // Resolve any previous pending action
    if (actionResolverRef.current) {
      actionResolverRef.current();
    }

    setIsActionPending(true);

    // Clear places list for search-related actions
    if (action.action === 'searchOne' || action.action === 'searchMany') {
      setPlacesList([]);

      // Auto-expand places list when searching many (e.g., from "Suggested" button)
      if (action.action === 'searchMany') {
        setIsPlacesListCollapsed(false);
        if (window.innerWidth < 768) {
          setIsMobilePlacesOpen(true);
        }
      }
    }
    // Add timestamp to force re-trigger even if same action
    setMapAction({ ...action, _timestamp: Date.now() } as MapAction);

    // Return a promise that resolves when the action is complete
    return new Promise<void>((resolve) => {
      actionResolverRef.current = resolve;
    });
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


  const handlePlaceDetailsLoaded = useCallback((place: PlaceData) => {
    setPlaceIdToFetch(null);
    setPlacesList(prev => {
      const idx = prev.findIndex(p => p.id === place.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...place };
        return next;
      }
      return [place, ...prev];
    });
  }, []);

  const handlePlaceClick = useCallback((place: PlaceData) => {
    if (place.location) {
      setMapAction({
        action: 'goto',
        lat: place.location.lat,
        lng: place.location.lng,
        zoom: 16,
        title: place.displayName,
      });

      // Close mobile places sheet on selection
      if (window.innerWidth < 768) {
        setIsMobilePlacesOpen(false);
      }
    }
  }, []);

  const handleGetDirections = useCallback((place: PlaceData) => {
    const destination = place.formattedAddress || place.displayName || '';

    // On desktop: populate SearchBar with directions mode
    if (window.innerWidth >= 768) {
      setIsMobileDirectionsOpen(true);
      setMobileDestination(destination);
      setIsMobilePlacesOpen(false);
      setIsChatOpen(false);

      setSearchBarShowDirections(true);
      setSearchBarExternalDestination(destination);
      setSearchBarDirectionError(null);
      setDirectionResult(null);
      setLastDirectionSource('searchBar');
    } else {
      // On mobile: populate destination in the dedicated directions sheet and open it
      setIsMobileDirectionsOpen(true);
      setMobileDestination(destination);
      setIsMobilePlacesOpen(false); // Still close the list to show the map and directions sheet
      setIsChatOpen(false); // Also close chat if it's open
    }
  }, []);

  const handleSearchBarSearch = useCallback((query: string) => {
    setPlacesList([]); // Clear previous results
    handleMapAction({ action: 'searchOne', query });
  }, [handleMapAction]);

  const handleSearchBarDirections = useCallback((origin: string, destination: string) => {
    setSearchBarDirectionError(null);
    // Don't clear directionResult here to prevent auto-closing the panel.
    // It will be replaced when the new result arrives.
    setLastDirectionSource('searchBar');
    setMapAction({
      action: 'directions',
      origin,
      destination,
      _timestamp: Date.now(),
    });
  }, []);

  const handleDirectionsResult = useCallback((result: DirectionResult) => {
    setSearchBarDirectionError(null);
    setDirectionResult(result);
    setDirectionsSuccess(true);

    // Auto-expand places list (desktop only)
    if (window.innerWidth >= 768) {
      setIsPlacesListCollapsed(false);
    }

    // Add origin and destination to places list
    if (result.originPlace && result.destinationPlace) {
      setPlacesList([result.originPlace, result.destinationPlace]);
    }

    // Resolve the map action promise
    if (actionResolverRef.current) {
      actionResolverRef.current();
      actionResolverRef.current = null;
    }
    setIsActionPending(false);
  }, []);


  const handleSearchResults = useCallback((places: PlaceData[]) => {
    // Deduplicate by ID
    const seen = new Set<string>();
    const uniquePlaces = places.filter(p => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    setPlacesList(uniquePlaces);
    // Resolve the map action promise
    if (actionResolverRef.current) {
      actionResolverRef.current();
      actionResolverRef.current = null;
    }
    setIsActionPending(false);
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
      setSearchBarDirectionError(error);
      if (mobileDirectionsPending) {
        setMobileDirectionError(error.message);
        setMobileDirectionsPending(false);
      }
    }

    // Resolve the map action promise on error too
    if (actionResolverRef.current) {
      actionResolverRef.current();
      actionResolverRef.current = null;
    }
    setIsActionPending(false);
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
      <header className="flex items-center gap-4 px-2 sm:px-4 py-2 sm:py-3 border-b bg-background z-[1100] shrink-0 fixed top-0 left-0 right-0 md:relative md:inset-auto">
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
            showDirections={searchBarShowDirections}
            onShowDirectionsChange={setSearchBarShowDirections}
            externalDestination={searchBarExternalDestination}
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
          className={`chat-panel hidden md:grid md:relative md:col-start-1 md:row-start-1 md:h-full border-r bg-background grid-rows-[auto_1fr] ${isChatOpen ? '' : 'md:hidden'
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
              places={placesList}
              onClose={() => setIsChatOpen(false)}
              onShowFlowchart={setFlowchartData}
            />
          </div>
        </div>

        {/* Map - Center column */}
        <div className="col-start-1 md:col-start-2 row-start-1 relative">
          <OpenStreetMap
            mapAction={mapAction}
            onPlaceSelect={handlePlaceSelect}
            onPlaceDetailsLoaded={handlePlaceDetailsLoaded}
            onDirectionsResult={handleDirectionsResult}
            onDirectionsError={handleDirectionsError}
            onSearchResults={handleSearchResults}
            placeIdToFetch={placeIdToFetch}
            resizeTrigger={`${isChatOpen}-${isPlacesListCollapsed}`}
          />

          {/* Direction Results Panel */}
          {directionResult && (
            <div className="fixed md:absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-3 md:p-4 z-[1050] max-w-md w-[90%] sm:w-auto">
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
                  const travelMode = route.mode; // driving, walking, or bicycling
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

          {/* Desktop Chat Toggle Button */}
          {!isChatOpen && (
            <Button
              className="hidden md:flex fixed bottom-6 left-8 h-14 w-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform z-[1100]"
              onClick={() => setIsChatOpen(true)}
              variant="default"
              title="Open chat"
            >
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </Button>
          )}
        </div>

        {/* Places List Panel - Desktop: Right column */}
        <div className="hidden md:flex col-start-3 row-start-1 h-full overflow-hidden">
          <div className="flex flex-col h-full border-l bg-background">
            <div className="flex-1 overflow-hidden">
              <PlacesList
                places={placesList}
                onPlaceClick={handlePlaceClick}
                onGetDirections={handleGetDirections}
                selectedPlaceId={null}
                isCollapsed={isPlacesListCollapsed}
                onCollapsedChange={setIsPlacesListCollapsed}
                isLoading={isActionPending}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE ONLY COMPONENTS - Rendered at root level for better layering and visibility */}

      {/* Mobile Chat Bottom Sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-16 z-[1200] bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${isChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
          }`}
        style={{ height: 'calc(85vh - 64px)', maxHeight: 'calc(100vh - 130px)' }}
      >
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
            places={placesList}
            onClose={() => setIsChatOpen(false)}
            onShowFlowchart={setFlowchartData}
          />
        </div>
      </div>

      {/* Mobile Chat Backdrop */}
      {isChatOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[1150]"
          onClick={() => setIsChatOpen(false)}
        />
      )}

      {/* Mobile Bottom Sheet for Places */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-16 z-[1200] bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${isMobilePlacesOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
          }`}
        style={{ height: 'calc(85vh - 64px)', maxHeight: 'calc(100vh - 100px)' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 border-b">
          <h3 className="font-semibold">
            {`Places (${placesList.length})`}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setIsMobilePlacesOpen(false)}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] relative">
          <div className="p-3 space-y-2 pb-20">
            {placesList.map((place, index) => (
              <div
                key={`${place.id}-${index}`}
                className="w-full group p-3 rounded-xl border flex items-center gap-3 active:scale-[0.98] transition-transform bg-background"
              >
                <button
                  onClick={() => handlePlaceClick(place)}
                  className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"
                >
                  <MapPin className="h-6 w-6 text-primary" />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => handlePlaceClick(place)} className="w-full text-left">
                    <h4 className="font-medium truncate">{place.displayName}</h4>
                    {place.types?.[0] && (
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {place.types[0].replace(/_/g, ' ')}
                      </p>
                    )}
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[10px] sm:text-xs mt-2 w-full bg-muted/50 border hover:bg-primary hover:text-primary-foreground transition-all"
                    onClick={() => handleGetDirections(place)}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Get Directions
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Loading Overlay */}
          {isActionPending && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300">
              <div className="bg-background border rounded-2xl p-6 shadow-xl flex flex-col items-center gap-4">
                <div className="relative h-8 w-8">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
                </div>
                <p className="font-medium text-sm text-muted-foreground">Updating places...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Directions Bottom Sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-16 z-[1200] bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out overflow-visible ${isMobileDirectionsOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
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
        <div className="p-4 space-y-3 overflow-visible pb-32">
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
            className="w-full mt-2"
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
          className="md:hidden fixed inset-0 bg-black/50 z-[1150]"
          onClick={() => setIsMobileDirectionsOpen(false)}
        />
      )}

      {/* Mobile Places Backdrop */}
      {isMobilePlacesOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[1150]"
          onClick={() => setIsMobilePlacesOpen(false)}
        />
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-[1150] safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => {
              setIsChatOpen(true);
              setIsMobilePlacesOpen(false);
              setIsMobileDirectionsOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isChatOpen ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs mt-1">Chat</span>
          </button>

          <button
            onClick={() => {
              setIsMobileDirectionsOpen(true);
              setIsChatOpen(false);
              setIsMobilePlacesOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isMobileDirectionsOpen ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Navigation className="h-5 w-5" />
            <span className="text-xs mt-1">Directions</span>
          </button>

          <button
            onClick={() => {
              setIsMobilePlacesOpen(true);
              setIsChatOpen(false);
              setIsMobileDirectionsOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${isMobilePlacesOpen ? 'text-primary' : 'text-muted-foreground'}`}
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

      {/* Itinerary Flowchart - rendered at App level for mobile visibility */}
      {flowchartData && (
        <ItineraryFlowchart
          day={flowchartData.day}
          timePeriods={flowchartData.timePeriods}
          placesDay={flowchartData.placesDay}
          places={placesList}
          onPlaceClick={(placeName) => {
            handleMapAction({ action: 'searchOne', query: placeName });
          }}
          onDirections={(action) => {
            handleMapAction(action);
            setFlowchartData(null);
          }}
          onClose={() => setFlowchartData(null)}
        />
      )}
    </div>
  );
}

export default App;

