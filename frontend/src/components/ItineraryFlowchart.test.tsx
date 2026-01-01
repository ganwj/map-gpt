import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ItineraryFlowchart } from './ItineraryFlowchart';
import type { TimePeriodPlaces, PlaceData, PlacesV2Day } from '@/types';

const mockTimePeriods: TimePeriodPlaces = {
  Morning: ['Senso-ji Temple Tokyo Japan', 'Nakamise Street Tokyo Japan'],
  Afternoon: ['Tokyo Skytree Tokyo Japan', 'Ueno Park Tokyo Japan'],
  Evening: ['Shibuya Crossing Tokyo Japan'],
  Accommodation: ['Hotel Gracery Shinjuku Tokyo Japan'],
};

const mockPlaces: PlaceData[] = [
  {
    id: 'place-1',
    displayName: 'Senso-ji Temple',
    formattedAddress: 'Asakusa, Tokyo, Japan',
    location: { lat: 35.7148, lng: 139.7967 },
    rating: 4.5,
    types: ['tourist_attraction'],
  },
  {
    id: 'place-2',
    displayName: 'Tokyo Skytree',
    formattedAddress: 'Sumida, Tokyo, Japan',
    location: { lat: 35.7101, lng: 139.8107 },
    rating: 4.4,
    types: ['tourist_attraction'],
  },
];

const mockDayV2: PlacesV2Day = {
  key: 'Day 1',
  periods: {
    Morning: [
      { options: ['Senso-ji Temple Tokyo Japan'], travelTime: '30 min by train' },
      { options: ['Asakusa Shrine Tokyo Japan', 'Hoppy Street Tokyo Japan'], travelTime: '5 min walk' },
      { options: ['Nakamise Street Tokyo Japan'], optional: true, travelTime: '2 min walk' },
    ],
  },
  suggested: ['Ichiran Ramen Shibuya Tokyo Japan'],
};

describe('ItineraryFlowchart', () => {
  const mockOnPlaceClick = vi.fn();
  const mockOnDirections = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render day title', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={mockTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Day 1')).toBeInTheDocument();
  });

  it('should render time period labels', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={mockTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    expect(screen.getByText('Stay')).toBeInTheDocument();
  });

  it('should render place count for each time period', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={mockTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    // Morning and Afternoon each have 2 destinations
    expect(screen.getAllByText('2 destinations').length).toBeGreaterThan(0);
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={mockTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should call onPlaceClick and onClose when a place is clicked', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={mockTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    // Find and click the first place - displays place name only (without location suffix)
    const placeButton = screen.getByText('Senso-ji Temple');
    fireEvent.click(placeButton);

    expect(mockOnPlaceClick).toHaveBeenCalledWith('Senso-ji Temple Tokyo Japan');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should group alternatives together in itinerary mode', () => {
    const timePeriodsWithAlternatives: TimePeriodPlaces = {
      Morning: [
        'Senso-ji Temple Tokyo Japan',
        'Alternative: Asakusa Shrine Tokyo Japan | Hoppy Street Tokyo Japan',
        'Nakamise Street Tokyo Japan',
      ],
      Afternoon: ['Tokyo Skytree Tokyo Japan'],
    };

    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={timePeriodsWithAlternatives}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Alternative options')).toBeInTheDocument();
    expect(screen.getByText('Asakusa Shrine')).toBeInTheDocument();
    expect(screen.getByText('Hoppy Street')).toBeInTheDocument();
  });

  it('should allow selecting alternatives', () => {
    const timePeriodsWithAlternatives: TimePeriodPlaces = {
      Morning: [
        'Senso-ji Temple Tokyo Japan',
        'Alternative: Asakusa Shrine Tokyo Japan | Hoppy Street Tokyo Japan',
        'Nakamise Street Tokyo Japan',
      ],
    };

    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={timePeriodsWithAlternatives}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    // Select Hoppy Street alternative
    const hoppyButton = screen.getByText('Hoppy Street');
    fireEvent.click(hoppyButton);

    // Hoppy Street should now be the selected option
    expect(hoppyButton.closest('button')).toHaveClass('bg-primary');
  });

  it('should not render empty time periods', () => {
    const partialTimePeriods: TimePeriodPlaces = {
      Morning: ['Senso-ji Temple Tokyo Japan'],
    };

    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={partialTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.queryByText('Afternoon')).not.toBeInTheDocument();
    expect(screen.queryByText('Evening')).not.toBeInTheDocument();
    expect(screen.queryByText('Stay')).not.toBeInTheDocument();
  });

  it('should render place cards', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={mockTimePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    // Place names should be displayed (without location suffix)
    expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument();
    expect(screen.getByText('Nakamise Street')).toBeInTheDocument();
  });

  it('should render v2 places (overriding legacy timePeriods)', () => {
    const legacyTimePeriods: TimePeriodPlaces = {
      Morning: ['Different Place Tokyo Japan'],
    };

    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={legacyTimePeriods}
        dayV2={mockDayV2}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument();
    expect(screen.queryByText('Different Place')).not.toBeInTheDocument();
  });

  it('should render optional label for v2 optional stops', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        dayV2={mockDayV2}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('should render travel time badge for v2 stops with travelTime', () => {
    render(
      <ItineraryFlowchart
        day="Day 1"
        dayV2={mockDayV2}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('30 min by train')).toBeInTheDocument();
    expect(screen.getByText('5 min walk')).toBeInTheDocument();
  });

  it('should render Suggested section from v2 and not include directions buttons inside it', () => {
    const dayV2WithTwoStops: PlacesV2Day = {
      key: 'Day 1',
      periods: {
        Morning: [
          { options: ['Senso-ji Temple Tokyo Japan'] },
          { options: ['Nakamise Street Tokyo Japan'] },
        ],
      },
      suggested: ['Ichiran Ramen Shibuya Tokyo Japan'],
    };

    render(
      <ItineraryFlowchart
        day="Day 1"
        timePeriods={{ Morning: ['Different Place Tokyo Japan'] }}
        dayV2={dayV2WithTwoStops}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    // Should have directions button for second stop (from first stop)
    expect(screen.getByText('Get Directions')).toBeInTheDocument();
    expect(screen.getByText('Suggested')).toBeInTheDocument();
    expect(screen.getByText(/Ichiran Ramen/i)).toBeInTheDocument();

    const suggestedCard = screen.getByText('Suggested').closest('div.rounded-2xl');
    expect(suggestedCard).toBeTruthy();
    expect(within(suggestedCard as HTMLElement).queryByText('Get Directions')).not.toBeInTheDocument();
  });

  it('should render period transition directions button for first stop of second period', () => {
    const dayV2WithMultiplePeriods: PlacesV2Day = {
      key: 'Day 1',
      periods: {
        Morning: [
          { options: ['Senso-ji Temple Tokyo Japan'] },
        ],
        Afternoon: [
          { options: ['Tokyo Skytree Tokyo Japan'] },
        ],
      },
      suggested: [],
    };

    render(
      <ItineraryFlowchart
        day="Day 1"
        dayV2={dayV2WithMultiplePeriods}
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
        onDirections={mockOnDirections}
        onClose={mockOnClose}
      />
    );

    // Should have directions button for Tokyo Skytree (from Senso-ji Temple)
    expect(screen.getByText('Get Directions')).toBeInTheDocument();
  });
});
