import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Google Maps API
const mockGoogle = {
  maps: {
    Map: vi.fn(),
    Marker: vi.fn(),
    Geocoder: vi.fn(() => ({
      geocode: vi.fn(),
    })),
    DirectionsService: vi.fn(() => ({
      route: vi.fn(),
    })),
    DirectionsRenderer: vi.fn(() => ({
      setMap: vi.fn(),
      setDirections: vi.fn(),
      set: vi.fn(),
    })),
    DirectionsStatus: {
      OK: 'OK',
      NOT_FOUND: 'NOT_FOUND',
      ZERO_RESULTS: 'ZERO_RESULTS',
    },
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      BICYCLING: 'BICYCLING',
      TRANSIT: 'TRANSIT',
    },
    LatLngBounds: vi.fn(),
    importLibrary: vi.fn(),
    marker: {
      AdvancedMarkerElement: vi.fn(),
    },
  },
};

Object.defineProperty(window, 'google', {
  value: mockGoogle,
  writable: true,
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
