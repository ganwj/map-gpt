// Application constants

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Panel dimensions
export const PANEL_DIMENSIONS = {
  MIN_WIDTH: 320,
  MAX_WIDTH: 700,
  DEFAULT_WIDTH: 450,
} as const;

// Chat suggestions
export const CHAT_SUGGESTIONS = [
  'Show me the Eiffel Tower',
  'Find coffee shops near Kuala Lumpur',
  'Directions from London to Paris',
  'Best restaurants in Tokyo',
  'Show me the Colosseum in Rome',
  'Find hotels near Central Park',
  'Directions from Sydney to Melbourne',
  'Popular attractions in Barcelona',
  'Find museums in Washington DC',
  'Show me the Great Wall of China',
  'Best pizza places in New York',
  'Find beaches near Miami',
  'Directions from Los Angeles to San Francisco',
  'Show me Machu Picchu',
  'Find shopping malls in Dubai',
] as const;

// Map defaults
export const MAP_DEFAULTS = {
  CENTER: { lat: 40.7128, lng: -74.006 },
  ZOOM: 12,
  MAP_ID: '8d1d947eb36d2fcbd801e5af',
} as const;

// Helper function
export function getRandomSuggestions(count: number): string[] {
  const shuffled = [...CHAT_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
