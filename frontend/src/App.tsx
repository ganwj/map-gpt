import { useState, useCallback, useRef } from 'react';
import { MessageCircle, PanelLeftClose, List, ChevronDown } from 'lucide-react';
import { GoogleMap } from '@/components/GoogleMap';
import { ChatPanel } from '@/components/ChatPanel';
import { PlacesList } from '@/components/PlacesList';
import { PlaceDetails } from '@/components/PlaceDetails';
import { SearchBar } from '@/components/SearchBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import type { MapAction, PlaceData, SelectedPlace, SearchHistory, DirectionResult, DirectionError } from '@/types';
import { GOOGLE_MAPS_API_KEY } from '@/constants';
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
  }, []);

  const handleDirectionsError = useCallback((error: DirectionError) => {
    setDirectionResult(null);
    if (lastDirectionSource === 'searchBar') {
      setSearchBarDirectionError(error);
    } else if (lastDirectionSource === 'placeDetails') {
      setPlaceDetailsDirectionError(error);
    }
  }, [lastDirectionSource]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Top Header with Search Bar and Theme Toggle */}
      <header className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-b bg-background z-40 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <img src={Logo} alt="MapGPT" className="h-8 w-8" />
          <h1 className="font-semibold text-lg hidden sm:block">MapGPT</h1>
        </div>
        <div className="flex-1 min-w-0">
          <SearchBar 
            onSearch={handleSearchBarSearch} 
            onGetDirections={handleSearchBarDirections}
            directionError={searchBarDirectionError}
            onClearDirectionError={() => setSearchBarDirectionError(null)}
          />
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] overflow-hidden">
        {/* Chat Panel - Desktop sidebar / Mobile overlay - Always mounted to preserve state */}
        <div
          className={`chat-panel fixed inset-x-0 top-[60px] bottom-0 md:relative md:inset-auto md:top-auto md:bottom-auto md:col-start-1 md:row-start-1 md:h-full border-r bg-background grid grid-rows-[auto_1fr] transition-transform duration-300 ${
            isChatOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
          }`}
          style={{ width: chatWidth }}
        >
          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 z-20 hidden md:block"
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
                // If a specific query is provided, find and show those places
                if (query) {
                  const historyEntry = searchHistory.find(h => h.query === query);
                  if (historyEntry) {
                    setPlacesList(historyEntry.places);
                  }
                }
                setIsPlacesListCollapsed(false);
                setSelectedPlaceDetails(null);
              }}
            />
          </div>
        </div>

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

          {/* Direction Results Panel */}
          {directionResult && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-4 z-20 max-w-md w-[90%] sm:w-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Travel Times</h3>
                <button
                  onClick={() => setDirectionResult(null)}
                  className="text-muted-foreground hover:text-foreground text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {directionResult.routes.map((route) => (
                  <div
                    key={route.mode}
                    className="flex items-center gap-2 p-2 rounded bg-muted/50"
                  >
                    <span className="text-lg">
                      {route.mode === 'driving' && '🚗'}
                      {route.mode === 'walking' && '🚶'}
                      {route.mode === 'bicycling' && '🚴'}
                      {route.mode === 'transit' && '🚌'}
                    </span>
                    <div>
                      <div className="font-medium capitalize">{route.mode}</div>
                      <div className="text-muted-foreground text-xs">
                        {route.duration} · {route.distance}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Action Buttons */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 flex justify-between pointer-events-none">
            {/* Chat Toggle Button - visible when chat is closed */}
            {!isChatOpen && (
              <Button
                className="h-12 w-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform pointer-events-auto"
                onClick={() => setIsChatOpen(true)}
                title="Open chat"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}
            {isChatOpen && <div />}
            
            {/* Places List Toggle - Mobile only */}
            {placesList.length > 0 && (
              <Button
                className="h-12 px-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform pointer-events-auto"
                onClick={() => setIsMobilePlacesOpen(!isMobilePlacesOpen)}
                title="View places"
              >
                <List className="h-5 w-5 mr-2" />
                <span className="text-sm">{placesList.length}</span>
              </Button>
            )}
          </div>

          {/* Desktop Chat Toggle Button */}
          {!isChatOpen && (
            <Button
              className="hidden md:flex fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
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
          className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-background border-t rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
            isMobilePlacesOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '70vh' }}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Places ({placesList.length})</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobilePlacesOpen(false)}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
            {!selectedPlaceDetails ? (
              <div className="p-3 space-y-2">
                {placesList.map((place, index) => (
                  <button
                    key={`${place.id}-${index}`}
                    onClick={() => {
                      handlePlaceClick(place);
                      setIsMobilePlacesOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent border flex items-center gap-3"
                  >
                    {place.photoUrls?.[0] ? (
                      <img
                        src={place.photoUrls[0]}
                        alt={place.displayName}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <List className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{place.displayName}</h4>
                      {place.rating && (
                        <p className="text-sm text-muted-foreground">⭐ {place.rating}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <PlaceDetails
                place={selectedPlaceDetails}
                onClose={() => {
                  handleCloseDetails();
                  setIsMobilePlacesOpen(false);
                }}
                onGetDirections={handleGetDirections}
                directionError={placeDetailsDirectionError}
                onClearDirectionError={() => setPlaceDetailsDirectionError(null)}
              />
            )}
          </div>
        </div>

        {/* Mobile Bottom Sheet Backdrop */}
        {isMobilePlacesOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-35"
            onClick={() => setIsMobilePlacesOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
