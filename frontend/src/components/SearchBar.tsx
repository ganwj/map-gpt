import { useState, useEffect } from 'react';
import { Search, Navigation, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlacesAutocomplete } from '@/components/PlacesAutocomplete';
import { getCurrentLocation } from '@/lib/geolocation';
import type { DirectionError } from '@/types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onGetDirections: (origin: string, destination: string) => void;
  directionError?: DirectionError | null;
  onClearDirectionError?: () => void;
}

export function SearchBar({ onSearch, onGetDirections, directionError, onClearDirectionError }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirections, setShowDirections] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [originError, setOriginError] = useState('');
  const [destinationError, setDestinationError] = useState('');

  // Clear direction error when switching modes or starting new directions
  useEffect(() => {
    if (showDirections && onClearDirectionError) {
      onClearDirectionError();
    }
  }, [showDirections, onClearDirectionError]);

  const handleUseCurrentLocationForOrigin = async () => {
    setIsLoadingLocation(true);
    setOriginError('');
    try {
      const result = await getCurrentLocation();
      setOrigin(result.address || `${result.latitude}, ${result.longitude}`);
    } catch (error) {
      const err = error as { message?: string };
      setOriginError(err.message || 'Could not get your location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleDirections = async (e: React.FormEvent) => {
    e.preventDefault();
    setOriginError('');
    setDestinationError('');

    if (!destination.trim()) {
      setDestinationError('Please enter a destination');
      return;
    }

    let finalOrigin = origin.trim();
    
    // If no origin provided, try to get current location
    if (!finalOrigin) {
      setIsLoadingLocation(true);
      try {
        const result = await getCurrentLocation();
        finalOrigin = result.address || `${result.latitude}, ${result.longitude}`;
        setOrigin(finalOrigin);
      } catch (error) {
        const err = error as { message?: string };
        setOriginError(err.message || 'Could not get your location. Please enter a starting location.');
        setIsLoadingLocation(false);
        return;
      }
      setIsLoadingLocation(false);
    }

    onGetDirections(finalOrigin, destination.trim());
    setShowDirections(false);
    setOrigin('');
    setDestination('');
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {!showDirections ? (
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <PlacesAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search for a place..."
                className="[&_input]:pl-9"
              />
            </div>
            <Button type="submit" size="sm" disabled={!searchQuery.trim()}>
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDirections(true)}
              title="Get directions"
            >
              <Navigation className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Directions</span>
            </Button>
          </form>
        ) : (
          <form onSubmit={handleDirections} className="flex items-center gap-2 flex-1">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-start gap-2 max-w-2xl">
              <div className="flex-1">
                <PlacesAutocomplete
                  value={origin}
                  onChange={(val) => {
                    setOrigin(val);
                    setOriginError('');
                  }}
                  placeholder="From (starting location)"
                  showLocationButton
                  onUseCurrentLocation={handleUseCurrentLocationForOrigin}
                  isLoadingLocation={isLoadingLocation}
                />
              </div>
              <span className="text-muted-foreground hidden sm:block sm:mt-2">→</span>
              <div className="flex-1">
                <PlacesAutocomplete
                  value={destination}
                  onChange={(val) => {
                    setDestination(val);
                    setDestinationError('');
                  }}
                  placeholder="To (destination)"
                />
              </div>
            </div>
            <Button type="submit" size="sm">
              <Navigation className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Go</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowDirections(false);
                setOrigin('');
                setDestination('');
                setOriginError('');
                setDestinationError('');
                onClearDirectionError?.();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>

      {/* Error Messages - Simple inline */}
      {(originError || destinationError || directionError) && (
        <div className="flex items-center gap-1.5 text-destructive text-xs leading-none">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="flex-1">
            {originError || destinationError || directionError?.message}
          </span>
          {directionError && (
            <button
              onClick={onClearDirectionError}
              className="text-muted-foreground hover:text-destructive flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
