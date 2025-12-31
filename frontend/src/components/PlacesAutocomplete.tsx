import { useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onAutoSearchRef = useRef(onAutoSearch);

  // Keep refs in sync
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
    onAutoSearchRef.current = onAutoSearch;
  }, [onChange, onPlaceSelect, onAutoSearch]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) return;

    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      fields: ['formatted_address', 'name', 'geometry'],
    };
    if (countryRestriction) {
      autocompleteOptions.componentRestrictions = { country: countryRestriction };
    }
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place) {
        const address = place.formatted_address || place.name || '';
        onChangeRef.current(address);
        onPlaceSelectRef.current?.(place);
        // Auto-search on mobile when selecting from autocomplete
        if (onAutoSearchRef.current && address) {
          onAutoSearchRef.current(address);
        }
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [countryRestriction]);

  // Wait for Google Maps to load
  useEffect(() => {
    if (autocompleteRef.current) return;
    
    const checkGoogleMaps = setInterval(() => {
      if (window.google?.maps?.places?.Autocomplete && inputRef.current && !autocompleteRef.current) {
        clearInterval(checkGoogleMaps);
        
        const opts: google.maps.places.AutocompleteOptions = {
          fields: ['formatted_address', 'name', 'geometry'],
        };
        if (countryRestriction) {
          opts.componentRestrictions = { country: countryRestriction };
        }
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, opts);

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place) {
            const address = place.formatted_address || place.name || '';
            onChangeRef.current(address);
            onPlaceSelectRef.current?.(place);
            // Auto-search on mobile when selecting from autocomplete
            if (onAutoSearchRef.current && address) {
              onAutoSearchRef.current(address);
            }
          }
        });

        autocompleteRef.current = autocomplete;
      }
    }, 100);

    return () => clearInterval(checkGoogleMaps);
  }, [countryRestriction]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-9 px-3 pr-8 text-sm rounded-md border bg-white text-gray-900 border-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {showClearButton && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
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
