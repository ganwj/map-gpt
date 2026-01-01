import { useState, useRef, useCallback, useMemo } from 'react';
import { MapPin, ChevronRight, Search, X, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { PlaceData } from '@/types';
import { PANEL_DIMENSIONS } from '@/constants';

interface PlacesListProps {
  places: PlaceData[];
  onPlaceClick: (place: PlaceData) => void;
  selectedPlaceId?: string | null;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onGetDirections: (place: PlaceData) => void;
}



export function PlacesList({
  places,
  onPlaceClick,
  onGetDirections,
  selectedPlaceId,
  isCollapsed: controlledCollapsed,
  onCollapsedChange
}: PlacesListProps) {
  const [width, setWidth] = useState<number>(PANEL_DIMENSIONS.DEFAULT_WIDTH);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Remove duplicates and filter by search query
  const filteredPlaces = useMemo(() => {
    const seen = new Set<string>();
    const uniquePlaces = places.filter(place => {
      const key = place.id || place.displayName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!searchQuery.trim()) return uniquePlaces;

    const query = searchQuery.toLowerCase();
    return uniquePlaces.filter(place =>
      place.displayName.toLowerCase().includes(query) ||
      place.formattedAddress?.toLowerCase().includes(query) ||
      place.types?.some(t => t.toLowerCase().includes(query))
    );
  }, [places, searchQuery]);

  // Use controlled or internal collapsed state
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setIsCollapsed = (collapsed: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(collapsed);
    } else {
      setInternalCollapsed(collapsed);
    }
  };

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(PANEL_DIMENSIONS.MAX_WIDTH, Math.max(PANEL_DIMENSIONS.MIN_WIDTH, startWidth + delta));
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
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors z-10 ${isResizing ? 'bg-primary/30' : ''
          }`}
        onMouseDown={startResize}
      />
      {/* Visual indicator line */}
      <div className={`absolute left-0 top-0 bottom-0 w-px bg-border pointer-events-none ${isResizing ? 'bg-primary' : ''}`} />

      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Places {filteredPlaces.length > 0 ? `(${filteredPlaces.length})` : ''}</h3>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No places to display</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Search for places using the chat</p>
          </div>
        ) : (
          <div className="p-3">
            {filteredPlaces.map((place, index) => (
              <div
                key={`${place.id}-${index}`}
                className={`w-full group p-4 rounded-xl mb-3 transition-colors hover:bg-accent border ${selectedPlaceId === place.id ? 'bg-accent border-primary' : 'border-transparent hover:border-border'
                  }`}
              >
                <div className="flex gap-3 items-start">
                  {/* Location icon - clickable to view on map */}
                  <button
                    onClick={() => onPlaceClick(place)}
                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <MapPin className="h-5 w-5 text-primary" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onPlaceClick(place)}
                      className="w-full text-left"
                    >
                      <h4 className="font-semibold text-base truncate">{place.displayName}</h4>
                      {place.formattedAddress && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {place.formattedAddress}
                        </p>
                      )}
                      {place.types && (
                        <p className="text-xs text-muted-foreground capitalize mt-1">
                          {place.types[0]?.replace(/_/g, ' ')}
                        </p>
                      )}
                    </button>

                    {/* Get Directions Button */}
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs w-full bg-background border hover:bg-primary hover:text-primary-foreground group-hover:border-primary/50 transition-all font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGetDirections(place);
                        }}
                      >
                        <Navigation className="h-3.5 w-3.5 mr-1.5" />
                        Get Directions
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
