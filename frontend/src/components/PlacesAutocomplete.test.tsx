import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlacesAutocomplete } from './PlacesAutocomplete';

// Mock Google Maps API with a class-based Autocomplete
class MockAutocomplete {
  addListener = vi.fn();
  getPlace = vi.fn();
}

const mockGoogleMaps = {
  maps: {
    places: {
      Autocomplete: MockAutocomplete,
    },
    event: {
      clearInstanceListeners: vi.fn(),
    },
  },
};

describe('PlacesAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - mocking global google
    window.google = mockGoogleMaps;
  });

  afterEach(() => {
    cleanup();
  });

  it('should render input with placeholder', () => {
    const onChange = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search for a place..."
      />
    );

    expect(screen.getByPlaceholderText('Search for a place...')).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    const onChange = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        placeholder="Enter your location"
      />
    );

    expect(screen.getByPlaceholderText('Enter your location')).toBeInTheDocument();
  });

  it('should display the value in input', () => {
    const onChange = vi.fn();
    render(
      <PlacesAutocomplete
        value="Tokyo, Japan"
        onChange={onChange}
      />
    );

    expect(screen.getByDisplayValue('Tokyo, Japan')).toBeInTheDocument();
  });

  it('should call onChange when input value changes', () => {
    const onChange = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New York' } });

    expect(onChange).toHaveBeenCalledWith('New York');
  });

  it('should render location button when showLocationButton is true', () => {
    const onChange = vi.fn();
    const onUseCurrentLocation = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        showLocationButton
        onUseCurrentLocation={onUseCurrentLocation}
      />
    );

    const button = screen.getByTitle('Use current location');
    expect(button).toBeInTheDocument();
  });

  it('should not render location button when showLocationButton is false', () => {
    const onChange = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        showLocationButton={false}
      />
    );

    expect(screen.queryByTitle('Use current location')).not.toBeInTheDocument();
  });

  it('should call onUseCurrentLocation when location button is clicked', () => {
    const onChange = vi.fn();
    const onUseCurrentLocation = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        showLocationButton
        onUseCurrentLocation={onUseCurrentLocation}
      />
    );

    const button = screen.getByTitle('Use current location');
    fireEvent.click(button);

    expect(onUseCurrentLocation).toHaveBeenCalled();
  });

  it('should disable input when disabled prop is true', () => {
    const onChange = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        disabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should disable location button when disabled prop is true', () => {
    const onChange = vi.fn();
    const onUseCurrentLocation = vi.fn();
    render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        showLocationButton
        onUseCurrentLocation={onUseCurrentLocation}
        disabled
      />
    );

    const button = screen.getByTitle('Use current location');
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PlacesAutocomplete
        value=""
        onChange={onChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
