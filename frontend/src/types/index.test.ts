import { describe, it, expect } from 'vitest';
import { MAX_ROUTE_DISTANCE, INTEREST_OPTIONS, TRAVEL_STYLES, DURATION_OPTIONS } from './index';
import type { DirectionResult, DirectionError, MapAction, PlaceData, Message, PlanningPreferences, TimePeriodPlaces } from './index';

describe('types', () => {
  describe('MAX_ROUTE_DISTANCE', () => {
    it('should have correct distance limits for each mode', () => {
      expect(MAX_ROUTE_DISTANCE.driving).toBe(10000000); // 10,000 km
      expect(MAX_ROUTE_DISTANCE.walking).toBe(500000);   // 500 km
      expect(MAX_ROUTE_DISTANCE.bicycling).toBe(500000); // 500 km
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
        ],
      };

      expect(result.routes).toHaveLength(3);
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
    it('should accept searchOne action', () => {
      const action: MapAction = {
        action: 'searchOne',
        query: 'coffee shops',
      };

      expect(action.action).toBe('searchOne');
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

  describe('Planning Constants', () => {
    it('should have correct interest options', () => {
      expect(INTEREST_OPTIONS).toContain('Food');
      expect(INTEREST_OPTIONS).toContain('Culture');
      expect(INTEREST_OPTIONS).toContain('Shopping');
      expect(INTEREST_OPTIONS).toHaveLength(8);
    });

    it('should have correct travel styles', () => {
      expect(TRAVEL_STYLES).toContain('Budget');
      expect(TRAVEL_STYLES).toContain('Mid-range');
      expect(TRAVEL_STYLES).toContain('Luxury');
      expect(TRAVEL_STYLES).toHaveLength(3);
    });

    it('should have correct duration options', () => {
      expect(DURATION_OPTIONS).toContain('1-2 days');
      expect(DURATION_OPTIONS).toContain('5-7 days');
      expect(DURATION_OPTIONS).toHaveLength(5);
    });
  });

  describe('Message type', () => {
    it('should accept minimal message', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      };

      expect(message.id).toBe('msg-1');
      expect(message.role).toBe('user');
    });

    it('should accept assistant message with all fields', () => {
      const message: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Here are some places',
        followUpSuggestions: ['More places?', 'Different area?'],
        placesByDay: { 'Day 1': ['Place A', 'Place B'] },
        placesByTimePeriod: {
          'Day 1': {
            Morning: ['Place A'],
            Afternoon: ['Place B'],
          },
        },
      };

      expect(message.followUpSuggestions).toHaveLength(2);
      expect(message.placesByDay?.['Day 1']).toHaveLength(2);
    });

    it('should accept error message', () => {
      const message: Message = {
        id: 'msg-3',
        role: 'assistant',
        content: 'Error occurred',
        isError: true,
        failedMessage: 'Original message',
      };

      expect(message.isError).toBe(true);
      expect(message.failedMessage).toBe('Original message');
    });
  });

  describe('PlanningPreferences type', () => {
    it('should accept planning preferences', () => {
      const prefs: PlanningPreferences = {
        duration: '3-4 days',
        interests: ['Food', 'Culture'],
        travelStyle: 'Mid-range',
        attractions: 'Tokyo Tower',
      };

      expect(prefs.duration).toBe('3-4 days');
      expect(prefs.interests).toContain('Food');
    });
  });

  describe('TimePeriodPlaces type', () => {
    it('should accept time period places', () => {
      const periods: TimePeriodPlaces = {
        Morning: ['Place A', 'Place B'],
        Afternoon: ['Place C'],
        Evening: ['Place D'],
        Accommodation: ['Hotel X'],
      };

      expect(periods.Morning).toHaveLength(2);
      expect(periods.Accommodation).toContain('Hotel X');
    });

    it('should allow partial time periods', () => {
      const periods: TimePeriodPlaces = {
        Morning: ['Place A'],
      };

      expect(periods.Morning).toHaveLength(1);
      expect(periods.Afternoon).toBeUndefined();
    });
  });
});
