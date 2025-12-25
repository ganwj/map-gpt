import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

// Mock the PlacesAutocomplete component
vi.mock('./PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ value, onChange, placeholder }: { 
    value: string; 
    onChange: (val: string) => void; 
    placeholder: string;
  }) => (
    <input
      data-testid="places-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock the geolocation module
vi.mock('@/lib/geolocation', () => ({
  getCurrentLocation: vi.fn(),
}));

import { getCurrentLocation } from '@/lib/geolocation';

describe('SearchBar', () => {
  const mockOnSearch = vi.fn();
  const mockOnGetDirections = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input by default', () => {
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    expect(screen.getByPlaceholderText(/search for a place/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('should call onSearch when form is submitted with query', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    const input = screen.getByPlaceholderText(/search for a place/i);
    await user.type(input, 'coffee shops');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('coffee shops');
  });

  it('should not call onSearch when query is empty', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('should show directions mode when Directions button is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    const directionsButton = screen.getByTitle(/get directions/i);
    await user.click(directionsButton);
    
    expect(screen.getByPlaceholderText(/from/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/to/i)).toBeInTheDocument();
  });

  it('should show error when destination is empty in directions mode', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    // Switch to directions mode
    const directionsButton = screen.getByTitle(/get directions/i);
    await user.click(directionsButton);
    
    // Try to submit without destination
    const goButton = screen.getByRole('button', { name: /go/i });
    await user.click(goButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a destination/i)).toBeInTheDocument();
    });
    expect(mockOnGetDirections).not.toHaveBeenCalled();
  });

  it('should call onGetDirections with origin and destination', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    // Switch to directions mode
    const directionsButton = screen.getByTitle(/get directions/i);
    await user.click(directionsButton);
    
    // Fill in origin and destination
    const inputs = screen.getAllByTestId('places-autocomplete');
    await user.type(inputs[0], 'New York');
    await user.type(inputs[1], 'Boston');
    
    // Submit
    const goButton = screen.getByRole('button', { name: /go/i });
    await user.click(goButton);
    
    expect(mockOnGetDirections).toHaveBeenCalledWith('New York', 'Boston');
  });

  it('should close directions mode when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    // Switch to directions mode
    const directionsButton = screen.getByTitle(/get directions/i);
    await user.click(directionsButton);
    
    // Close directions mode
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    await user.click(closeButton);
    
    // Should be back to search mode
    expect(screen.getByPlaceholderText(/search for a place/i)).toBeInTheDocument();
  });

  it('should get current location when origin is empty and directions submitted', async () => {
    const user = userEvent.setup();
    const mockLocation = { latitude: 40.7128, longitude: -74.006, address: 'NYC' };
    vi.mocked(getCurrentLocation).mockResolvedValue(mockLocation);

    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    // Switch to directions mode
    const directionsButton = screen.getByTitle(/get directions/i);
    await user.click(directionsButton);
    
    // Only fill destination
    const inputs = screen.getAllByTestId('places-autocomplete');
    await user.type(inputs[1], 'Boston');
    
    // Submit - should trigger geolocation
    const goButton = screen.getByRole('button', { name: /go/i });
    await user.click(goButton);
    
    await waitFor(() => {
      expect(getCurrentLocation).toHaveBeenCalled();
      expect(mockOnGetDirections).toHaveBeenCalledWith('NYC', 'Boston');
    });
  });

  it('should show error when geolocation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentLocation).mockRejectedValue({ 
      message: 'Location permission denied' 
    });

    render(<SearchBar onSearch={mockOnSearch} onGetDirections={mockOnGetDirections} />);
    
    // Switch to directions mode
    const directionsButton = screen.getByTitle(/get directions/i);
    await user.click(directionsButton);
    
    // Only fill destination
    const inputs = screen.getAllByTestId('places-autocomplete');
    await user.type(inputs[1], 'Boston');
    
    // Submit - should trigger geolocation error
    const goButton = screen.getByRole('button', { name: /go/i });
    await user.click(goButton);
    
    await waitFor(() => {
      expect(screen.getByText(/location permission denied/i)).toBeInTheDocument();
    });
    expect(mockOnGetDirections).not.toHaveBeenCalled();
  });
});
