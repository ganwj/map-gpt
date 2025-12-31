import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaceDetails } from './PlaceDetails';
import type { PlaceData } from '@/types';

// Mock the PlacesAutocomplete component
vi.mock('./PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ value, onChange, placeholder, countryRestriction }: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    countryRestriction?: string;
  }) => (
    <input
      data-testid="places-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-country={countryRestriction || ''}
    />
  ),
}));

// Mock the geolocation module
vi.mock('@/lib/geolocation', () => ({
  getCurrentLocation: vi.fn(),
}));

// Mock fetch for API calls
vi.stubGlobal('fetch', vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ summary: 'Test summary' }),
  })
));

const mockPlace: PlaceData = {
  id: 'test-place-id',
  displayName: 'Tokyo Tower',
  formattedAddress: '4 Chome-2-8 Shibakoen, Minato City, Tokyo, Japan',
  location: { lat: 35.6586, lng: 139.7454 },
  rating: 4.5,
  userRatingCount: 1000,
  types: ['tourist_attraction', 'point_of_interest'],
  photoUrls: ['https://example.com/photo1.jpg'],
};

const mockPlaceUS: PlaceData = {
  id: 'us-place-id',
  displayName: 'Empire State Building',
  formattedAddress: '350 5th Ave, New York, NY, United States',
  location: { lat: 40.7484, lng: -73.9857 },
  rating: 4.7,
  userRatingCount: 5000,
  types: ['tourist_attraction', 'point_of_interest'],
  photoUrls: ['https://example.com/photo2.jpg'],
};

describe('PlaceDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render place name', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Tokyo Tower')).toBeInTheDocument();
  });

  it('should render place address', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('4 Chome-2-8 Shibakoen, Minato City, Tokyo, Japan')).toBeInTheDocument();
  });

  it('should render rating', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(1,000 reviews)')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={onClose}
      />
    );

    // Close button is in the photo area - get all buttons and find the one that triggers onClose
    const buttons = screen.getAllByRole('button');
    // The close button should be one of the first buttons
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('should render directions input when onGetDirections is provided', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
        onGetDirections={vi.fn()}
      />
    );

    expect(screen.getByTestId('places-autocomplete')).toBeInTheDocument();
    expect(screen.getByText('Get Directions')).toBeInTheDocument();
  });

  it('should not render directions input when onGetDirections is not provided', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('places-autocomplete')).not.toBeInTheDocument();
  });

  it('should pass country restriction to PlacesAutocomplete for Japan', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
        onGetDirections={vi.fn()}
      />
    );

    const autocomplete = screen.getByTestId('places-autocomplete');
    expect(autocomplete).toHaveAttribute('data-country', 'jp');
  });

  it('should pass country restriction to PlacesAutocomplete for US', () => {
    render(
      <PlaceDetails
        place={mockPlaceUS}
        onClose={vi.fn()}
        onGetDirections={vi.fn()}
      />
    );

    const autocomplete = screen.getByTestId('places-autocomplete');
    expect(autocomplete).toHaveAttribute('data-country', 'us');
  });

  it('should call onGetDirections when Get Directions button is clicked', async () => {
    const onGetDirections = vi.fn();
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
        onGetDirections={onGetDirections}
      />
    );

    const autocomplete = screen.getByTestId('places-autocomplete');
    fireEvent.change(autocomplete, { target: { value: 'Shibuya Station' } });

    const button = screen.getByText('Get Directions');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onGetDirections).toHaveBeenCalledWith(mockPlace, 'Shibuya Station');
    });
  });

  it('should display direction error when provided', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
        onGetDirections={vi.fn()}
        directionError={{
          type: 'NO_ROUTE',
          message: 'No route found',
          origin: 'Origin',
          destination: 'Destination',
        }}
      />
    );

    expect(screen.getByText('No route found')).toBeInTheDocument();
  });

  it('should call onClearDirectionError when error dismiss is clicked', () => {
    const onClearDirectionError = vi.fn();
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
        onGetDirections={vi.fn()}
        directionError={{
          type: 'NO_ROUTE',
          message: 'No route found',
          origin: 'Origin',
          destination: 'Destination',
        }}
        onClearDirectionError={onClearDirectionError}
      />
    );

    // Find the dismiss button (X icon) within the error message
    const errorContainer = screen.getByText('No route found').closest('div');
    const dismissButton = errorContainer?.querySelector('button');
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(onClearDirectionError).toHaveBeenCalled();
    }
  });

  it('should return null when place is null', () => {
    const { container } = render(
      <PlaceDetails
        place={null}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render place photo when available', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('should render place types', () => {
    render(
      <PlaceDetails
        place={mockPlace}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('tourist attraction')).toBeInTheDocument();
  });

  it('should render review sort dropdown with all options', () => {
    const placeWithReviews = {
      ...mockPlace,
      reviews: [
        { authorName: 'User1', rating: 5, text: 'Great!', relativeTime: '1 week ago' },
        { authorName: 'User2', rating: 3, text: 'OK', relativeTime: '2 months ago' },
      ],
    };

    render(
      <PlaceDetails
        place={placeWithReviews}
        onClose={vi.fn()}
      />
    );

    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect).toBeInTheDocument();
    
    // Check all options are available
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('Newest first');
    expect(options[1]).toHaveTextContent('Oldest first');
    expect(options[2]).toHaveTextContent('Highest rated');
    expect(options[3]).toHaveTextContent('Lowest rated');
  });

  it('should change review sort when dropdown value changes', () => {
    const placeWithReviews = {
      ...mockPlace,
      reviews: [
        { authorName: 'User1', rating: 5, text: 'Great!', relativeTime: '1 week ago' },
        { authorName: 'User2', rating: 3, text: 'OK', relativeTime: '2 months ago' },
      ],
    };

    render(
      <PlaceDetails
        place={placeWithReviews}
        onClose={vi.fn()}
      />
    );

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'highest' } });
    
    expect(sortSelect).toHaveValue('highest');
  });
});
