import { useState, useRef, useCallback } from 'react';
import { Star, MapPin, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { PlaceData } from './GoogleMap';

interface PlacesListProps {
  places: PlaceData[];
  onPlaceClick: (place: PlaceData) => void;
  selectedPlaceId?: string | null;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 380;

function PlaceImage({ place }: { place: PlaceData }) {
  const [error, setError] = useState(false);
  
  const photoUrl = place.photoUrls && place.photoUrls.length > 0 ? place.photoUrls[0] : null;

  if (!photoUrl || error) {
    return (
      <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={place.displayName}
      className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-muted"
      onError={() => setError(true)}
    />
  );
}

export function PlacesList({ places, onPlaceClick, selectedPlaceId }: PlacesListProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  if (places.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="hidden sm:flex flex-col h-full flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-8 rounded-none border-l hover:bg-accent"
          onClick={() => setIsCollapsed(false)}
          title="Expand places list"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="hidden sm:flex border-l bg-background flex-col h-full flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle - full height, wider hit area */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors z-10 ${
          isResizing ? 'bg-primary/30' : ''
        }`}
        onMouseDown={startResize}
      />
      {/* Visual indicator line */}
      <div className={`absolute left-0 top-0 bottom-0 w-px bg-border pointer-events-none ${isResizing ? 'bg-primary' : ''}`} />

      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Places ({places.length})</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(true)}
          title="Collapse places list"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {places.map((place, index) => (
            <button
              key={place.id || index}
              onClick={() => onPlaceClick(place)}
              className={`w-full text-left p-4 rounded-xl mb-3 transition-colors hover:bg-accent border ${
                selectedPlaceId === place.id ? 'bg-accent border-primary' : 'border-transparent'
              }`}
            >
              <div className="flex gap-4">
                <PlaceImage place={place} />
                <div className="flex-1 min-w-0 py-1">
                  <h4 className="font-semibold text-base truncate">{place.displayName}</h4>
                  {place.types && (
                    <p className="text-sm text-muted-foreground capitalize truncate mt-0.5">
                      {place.types[0]?.replace(/_/g, ' ')}
                    </p>
                  )}
                  {place.rating && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{place.rating}</span>
                      {place.userRatingCount && (
                        <span className="text-sm text-muted-foreground">
                          ({place.userRatingCount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}
                  {place.openingHours && (
                    <p
                      className={`text-sm mt-1.5 font-medium ${
                        place.openingHours.isOpen ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {place.openingHours.isOpen ? 'Open now' : 'Closed'}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
