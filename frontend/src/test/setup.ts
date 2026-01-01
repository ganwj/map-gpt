import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Leaflet for testing
vi.mock('react-leaflet', () => ({
  MapContainer: vi.fn(({ children }) => children),
  TileLayer: vi.fn(() => null),
  Marker: vi.fn(({ children }) => children),
  Popup: vi.fn(({ children }) => children),
  Polyline: vi.fn(() => null),
  useMap: vi.fn(() => ({
    setView: vi.fn(),
    panTo: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 40.7128, lng: -74.006 })),
    fitBounds: vi.fn(),
  })),
}));

vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
  },
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: vi.fn(),
    },
  },
  divIcon: vi.fn(() => ({})),
  latLngBounds: vi.fn(() => ({})),
}));

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

// Mock fetch for nominatim/routing tests
globalThis.fetch = vi.fn();
