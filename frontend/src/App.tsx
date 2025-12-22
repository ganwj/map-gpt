import { useState, useCallback } from 'react';
import { MessageCircle, PanelLeftClose } from 'lucide-react';
import { GoogleMap, type PlaceData } from '@/components/GoogleMap';
import { ChatPanel } from '@/components/ChatPanel';
import { PlacesList } from '@/components/PlacesList';
import { PlaceDetails } from '@/components/PlaceDetails';
import { Button } from '@/components/ui/button';

interface MapAction {
  action: 'search' | 'goto' | 'directions' | 'marker';
  query?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  title?: string;
  origin?: string;
  destination?: string;
}

interface SelectedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function App() {
  const [mapAction, setMapAction] = useState<MapAction | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [placesList, setPlacesList] = useState<PlaceData[]>([]);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceData | null>(null);
  const [placeIdToFetch, setPlaceIdToFetch] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const handleMapAction = useCallback((action: MapAction) => {
    setMapAction(action);
    if (action.action === 'search') {
      setSelectedPlaceDetails(null);
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

  const handlePlacesFound = useCallback((places: PlaceData[]) => {
    setPlacesList(places);
  }, []);

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

  const handleGetDirections = useCallback((place: PlaceData) => {
    setMapAction({
      action: 'directions',
      origin: 'My Location',
      destination: place.formattedAddress || place.displayName || '',
    });
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedPlaceDetails(null);
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      {/* Chat Panel - Desktop sidebar / Mobile overlay - Always mounted to preserve state */}
      <div
        className={`fixed z-50 inset-0 md:inset-auto md:top-0 md:left-0 md:bottom-0 md:w-[380px] lg:w-[420px] border-r bg-background flex-shrink-0 flex flex-col h-full transition-transform duration-300 ${
          isChatOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-end p-2 border-b">
          <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} title="Minimize chat">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatPanel onMapAction={handleMapAction} selectedPlace={selectedPlace} />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          apiKey={GOOGLE_MAPS_API_KEY}
          mapAction={mapAction}
          onPlaceSelect={handlePlaceSelect}
          onPlacesFound={handlePlacesFound}
          onPlaceDetailsLoaded={handlePlaceDetailsLoaded}
          placeIdToFetch={placeIdToFetch}
        />

        {/* Chat Toggle Button - visible when chat is closed */}
        {!isChatOpen && (
          <Button
            className="fixed bottom-6 left-6 z-40 h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsChatOpen(true)}
            title="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Places List Panel - Right side */}
      {placesList.length > 0 && !selectedPlaceDetails && (
        <PlacesList
          places={placesList}
          onPlaceClick={handlePlaceClick}
          selectedPlaceId={null}
        />
      )}

      {/* Place Details Panel - Right side */}
      {selectedPlaceDetails && (
        <PlaceDetails
          place={selectedPlaceDetails}
          onClose={handleCloseDetails}
          onGetDirections={handleGetDirections}
        />
      )}
    </div>
  );
}

export default App;
