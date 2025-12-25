import { describe, it, expect } from 'vitest';
import { MAX_ROUTE_DISTANCE } from './index';
import type { DirectionResult, DirectionError, MapAction, PlaceData } from './index';

describe('types', () => {
  describe('MAX_ROUTE_DISTANCE', () => {
    it('should have correct distance limits for each mode', () => {
      expect(MAX_ROUTE_DISTANCE.driving).toBe(10000000); // 10,000 km
      expect(MAX_ROUTE_DISTANCE.walking).toBe(500000);   // 500 km
      expect(MAX_ROUTE_DISTANCE.bicycling).toBe(500000); // 500 km
      expect(MAX_ROUTE_DISTANCE.transit).toBe(5000000);  // 5,000 km
    });

    it('should have walking/bicycling distances smaller than driving', () => {
      expect(MAX_ROUTE_DISTANCE.walking).toBeLessThan(MAX_ROUTE_DISTANCE.driving);
      expect(MAX_ROUTE_DISTANCE.bicycling).toBeLessThan(MAX_ROUTE_DISTANCE.driving);
    });
  });

  describe('DirectionResult type', () => {
    it('should accept valid direction result', () => {
      const result: DirectionResult = {
        origin: 'New York, NY',
        destination: 'Boston, MA',
        routes: [
          {
            mode: 'driving',
            duration: '4 hours',
            distance: '350 km',
            durationValue: 14400,
            distanceValue: 350000,
          },
        ],
      };

      expect(result.origin).toBe('New York, NY');
      expect(result.destination).toBe('Boston, MA');
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].mode).toBe('driving');
    });

    it('should support multiple routes', () => {
      const result: DirectionResult = {
        origin: 'A',
        destination: 'B',
        routes: [
          { mode: 'driving', duration: '1h', distance: '50km', durationValue: 3600, distanceValue: 50000 },
          { mode: 'walking', duration: '10h', distance: '50km', durationValue: 36000, distanceValue: 50000 },
          { mode: 'bicycling', duration: '2h', distance: '50km', durationValue: 7200, distanceValue: 50000 },
          { mode: 'transit', duration: '1.5h', distance: '50km', durationValue: 5400, distanceValue: 50000 },
        ],
      };

      expect(result.routes).toHaveLength(4);
    });
  });

  describe('DirectionError type', () => {
    it('should accept valid error types', () => {
      const errors: DirectionError[] = [
        { type: 'ROUTE_TOO_LONG', message: 'Route exceeds maximum distance' },
        { type: 'NO_ROUTE', message: 'No route found' },
        { type: 'ZERO_RESULTS', message: 'Zero results' },
        { type: 'INVALID_REQUEST', message: 'Invalid request' },
        { type: 'OVER_QUERY_LIMIT', message: 'Over query limit' },
        { type: 'REQUEST_DENIED', message: 'Request denied' },
        { type: 'UNKNOWN_ERROR', message: 'Unknown error' },
      ];

      errors.forEach((error) => {
        expect(error.type).toBeDefined();
        expect(error.message).toBeDefined();
      });
    });

    it('should support optional origin and destination', () => {
      const error: DirectionError = {
        type: 'ROUTE_TOO_LONG',
        message: 'The route is too long',
        origin: 'New York',
        destination: 'Tokyo',
      };

      expect(error.origin).toBe('New York');
      expect(error.destination).toBe('Tokyo');
    });
  });

  describe('MapAction type', () => {
    it('should accept search action', () => {
      const action: MapAction = {
        action: 'search',
        query: 'coffee shops',
      };

      expect(action.action).toBe('search');
      expect(action.query).toBe('coffee shops');
    });

    it('should accept goto action', () => {
      const action: MapAction = {
        action: 'goto',
        lat: 40.7128,
        lng: -74.006,
        zoom: 15,
        title: 'NYC',
      };

      expect(action.action).toBe('goto');
      expect(action.lat).toBe(40.7128);
      expect(action.lng).toBe(-74.006);
    });

    it('should accept directions action', () => {
      const action: MapAction = {
        action: 'directions',
        origin: 'Point A',
        destination: 'Point B',
      };

      expect(action.action).toBe('directions');
      expect(action.origin).toBe('Point A');
      expect(action.destination).toBe('Point B');
    });

    it('should accept marker action', () => {
      const action: MapAction = {
        action: 'marker',
        lat: 51.5074,
        lng: -0.1278,
        title: 'London',
      };

      expect(action.action).toBe('marker');
    });
  });

  describe('PlaceData type', () => {
    it('should accept minimal place data', () => {
      const place: PlaceData = {
        id: 'place123',
        displayName: 'Test Place',
        formattedAddress: '123 Test St',
        location: { lat: 0, lng: 0 },
      };

      expect(place.id).toBe('place123');
      expect(place.displayName).toBe('Test Place');
    });

    it('should accept full place data', () => {
      const place: PlaceData = {
        id: 'place456',
        displayName: 'Full Test Place',
        formattedAddress: '456 Full St',
        location: { lat: 40.7128, lng: -74.006 },
        rating: 4.5,
        userRatingCount: 100,
        priceLevel: '2',
        types: ['restaurant', 'food'],
        photoUrls: ['https://example.com/photo.jpg'],
        reviews: [
          {
            authorName: 'John Doe',
            rating: 5,
            text: 'Great place!',
            relativeTime: '2 days ago',
          },
        ],
        openingHours: {
          weekdayText: ['Monday: 9:00 AM - 5:00 PM'],
          isOpen: true,
        },
        phoneNumber: '+1234567890',
        website: 'https://example.com',
      };

      expect(place.rating).toBe(4.5);
      expect(place.reviews).toHaveLength(1);
      expect(place.openingHours?.isOpen).toBe(true);
    });

    it('should allow null location', () => {
      const place: PlaceData = {
        id: 'place789',
        displayName: 'No Location Place',
        formattedAddress: 'Unknown',
        location: null,
      };

      expect(place.location).toBeNull();
    });
  });
});
