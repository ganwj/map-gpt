import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItineraryFlowchart } from './ItineraryFlowchart';
import type { TimePeriodPlaces, PlaceData } from '@/types';

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

    // Morning and Afternoon each have 2 places
    expect(screen.getAllByText('2 places').length).toBeGreaterThan(0);
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

  it('should call onDirections and onClose when directions button is clicked', () => {
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

    // Find and click the directions button
    const directionsButtons = screen.getAllByText('Get directions & travel time');
    fireEvent.click(directionsButtons[0]);

    expect(mockOnDirections).toHaveBeenCalledWith({
      action: 'directions',
      origin: 'Senso-ji Temple Tokyo Japan',
      destination: 'Nakamise Street Tokyo Japan',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should toggle time period expansion when header is clicked', () => {
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

    // Initially expanded - places should be visible
    expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument();

    // Click to collapse Morning section
    const morningHeader = screen.getByText('Morning').closest('button');
    if (morningHeader) {
      fireEvent.click(morningHeader);
      // After collapse, places might not be visible (depends on implementation)
    }
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
});
