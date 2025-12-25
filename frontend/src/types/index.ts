// Shared types for the MapGPT application

export interface MapAction {
  action: 'search' | 'goto' | 'directions' | 'marker' | 'multiSearch';
  query?: string;
  queries?: string[];
  lat?: number;
  lng?: number;
  zoom?: number;
  title?: string;
  origin?: string;
  destination?: string;
  _timestamp?: number;
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
  reviews?: Review[];
  openingHours?: {
    weekdayText?: string[];
    isOpen?: boolean;
  };
  phoneNumber?: string;
  website?: string;
}

export interface Review {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhotoUrl?: string;
}

export interface SelectedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  map_action?: MapAction | null;
  followUpSuggestions?: string[];
  searchQuery?: string; // Track which search query this message is associated with
}

// Search history entry to track places per search
export interface SearchHistory {
  query: string;
  places: PlaceData[];
  timestamp: number;
}

// Direction result with travel times for different modes
export interface DirectionResult {
  origin: string;
  destination: string;
  routes: {
    mode: 'driving' | 'walking' | 'bicycling' | 'transit';
    duration: string;
    distance: string;
    durationValue: number; // seconds
    distanceValue: number; // meters
  }[];
}

// Direction error for handling route failures
export interface DirectionError {
  type: 'ROUTE_TOO_LONG' | 'NO_ROUTE' | 'ZERO_RESULTS' | 'INVALID_REQUEST' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR';
  message: string;
  origin?: string;
  destination?: string;
}

// Max route distance in meters (e.g., 5000 km for walking/bicycling)
export const MAX_ROUTE_DISTANCE = {
  driving: 10000000, // 10,000 km
  walking: 500000,   // 500 km
  bicycling: 500000, // 500 km
  transit: 5000000,  // 5,000 km
} as const;
