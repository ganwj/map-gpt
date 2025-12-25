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

export interface TimePeriodPlaces {
  Morning?: string[];
  Afternoon?: string[];
  Evening?: string[];
  Accommodation?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  map_action?: MapAction | null;
  followUpSuggestions?: string[];
  searchQuery?: string;
  placesByDay?: Record<string, string[]> | null;
  placesByTimePeriod?: Record<string, TimePeriodPlaces> | null;
  isError?: boolean;
  failedMessage?: string;
}

export interface PlanningPreferences {
  duration: string;
  interests: string[];
  travelStyle: string;
  attractions: string;
}

export const INTEREST_OPTIONS = ['Food', 'Culture', 'Shopping', 'Nature', 'Nightlife', 'History', 'Adventure', 'Relaxation'] as const;
export const TRAVEL_STYLES = ['Budget', 'Mid-range', 'Luxury'] as const;
export const DURATION_OPTIONS = ['1-2 days', '3-4 days', '5-7 days', '1-2 weeks', '2+ weeks'] as const;

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
