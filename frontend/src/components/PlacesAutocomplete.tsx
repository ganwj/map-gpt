import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { searchPlaces, type NominatimSearchResult } from '@/lib/nominatim';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { formatted_address?: string; name?: string; geometry?: { location: { lat: () => number; lng: () => number } } }) => void;
  onAutoSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  showLocationButton?: boolean;
  onUseCurrentLocation?: () => void;
  isLoadingLocation?: boolean;
  disabled?: boolean;
  countryRestriction?: string;
  showClearButton?: boolean;
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onAutoSearch,
  placeholder = 'Search for a place...',
  className,
  showLocationButton = false,
  onUseCurrentLocation,
  isLoadingLocation = false,
  disabled = false,
  countryRestriction,
  showClearButton = true,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const searchDebounced = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaces(query, {
          limit: 10, // Fetch more to allow for deduplication
          countryCode: countryRestriction,
        });
        
        // Deduplicate results by display_name
        const uniqueResults = results.reduce((acc: NominatimSearchResult[], current) => {
          const isDuplicate = acc.some(item => item.display_name === current.display_name);
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        }, []).slice(0, 5); // Keep only top 5 unique results

        setSuggestions(uniqueResults);
        setShowDropdown(uniqueResults.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  }, [countryRestriction]);

  // Search when value changes
  useEffect(() => {
    searchDebounced(value);
  }, [value, searchDebounced]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: NominatimSearchResult) => {
    const address = suggestion.display_name;
    onChange(address);
    setSuggestions([]);
    setShowDropdown(false);

    // Call onPlaceSelect with a compatible format
    if (onPlaceSelect) {
      onPlaceSelect({
        formatted_address: address,
        name: suggestion.display_name.split(',')[0],
        geometry: {
          location: {
            lat: () => parseFloat(suggestion.lat),
            lng: () => parseFloat(suggestion.lon),
          },
        },
      });
    }

    // Auto-search on mobile when selecting from autocomplete
    if (onAutoSearch && address) {
      onAutoSearch(address);
    }
  };

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-9 px-3 pr-8 text-sm rounded-md border bg-white text-gray-900 border-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isLoading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
        {showClearButton && value && !disabled && !isLoading && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setShowDropdown(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Dropdown suggestions */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1101] max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900 truncate">
                  {suggestion.display_name.split(',')[0]}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {suggestion.display_name.split(',').slice(1).join(',').trim()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {showLocationButton && onUseCurrentLocation && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onUseCurrentLocation}
          disabled={isLoadingLocation || disabled}
          title="Use current location"
          className="shrink-0"
        >
          {isLoadingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          )}
        </Button>
      )}
    </div>
  );
}
