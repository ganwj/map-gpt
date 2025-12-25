import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacesList } from './PlacesList';
import type { PlaceData } from '@/types';

const mockPlaces: PlaceData[] = [
  {
    id: 'place-1',
    displayName: 'Tokyo Tower',
    formattedAddress: 'Minato City, Tokyo, Japan',
    location: { lat: 35.6586, lng: 139.7454 },
    rating: 4.5,
    userRatingCount: 1000,
    types: ['tourist_attraction'],
    photoUrls: ['https://example.com/photo1.jpg'],
  },
  {
    id: 'place-2',
    displayName: 'Senso-ji Temple',
    formattedAddress: 'Asakusa, Tokyo, Japan',
    location: { lat: 35.7148, lng: 139.7967 },
    rating: 4.6,
    userRatingCount: 2000,
    types: ['place_of_worship'],
    photoUrls: ['https://example.com/photo2.jpg'],
  },
  {
    id: 'place-3',
    displayName: 'Shibuya Crossing',
    formattedAddress: 'Shibuya, Tokyo, Japan',
    location: { lat: 35.6595, lng: 139.7004 },
    rating: 4.4,
    userRatingCount: 500,
    types: ['point_of_interest'],
  },
];

describe('PlacesList', () => {
  const mockOnPlaceClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render places list header', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    expect(screen.getByText(/Places/)).toBeInTheDocument();
  });

  it('should render place names', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    expect(screen.getByText('Tokyo Tower')).toBeInTheDocument();
    expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument();
    expect(screen.getByText('Shibuya Crossing')).toBeInTheDocument();
  });

  it('should render place ratings', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('4.6')).toBeInTheDocument();
  });

  it('should call onPlaceClick when a place is clicked', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    const placeButton = screen.getByText('Tokyo Tower').closest('button');
    if (placeButton) {
      fireEvent.click(placeButton);
      expect(mockOnPlaceClick).toHaveBeenCalledWith(mockPlaces[0]);
    }
  });

  it('should filter places by search query', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search places...');
    fireEvent.change(searchInput, { target: { value: 'Tower' } });

    expect(screen.getByText('Tokyo Tower')).toBeInTheDocument();
    expect(screen.queryByText('Senso-ji Temple')).not.toBeInTheDocument();
    expect(screen.queryByText('Shibuya Crossing')).not.toBeInTheDocument();
  });

  it('should show empty state when no places', () => {
    render(
      <PlacesList
        places={[]}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    expect(screen.getByText('No places to display')).toBeInTheDocument();
  });

  it('should remove duplicate places', () => {
    const placesWithDuplicates: PlaceData[] = [
      ...mockPlaces,
      { ...mockPlaces[0] }, // Duplicate of Tokyo Tower
    ];

    render(
      <PlacesList
        places={placesWithDuplicates}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    // Should only show 3 unique places, not 4
    const tokyoTowers = screen.getAllByText('Tokyo Tower');
    expect(tokyoTowers).toHaveLength(1);
  });

  it('should render place types', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    expect(screen.getByText('tourist attraction')).toBeInTheDocument();
  });

  it('should render place count in header', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onPlaceClick={mockOnPlaceClick}
      />
    );

    expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
  });
});
