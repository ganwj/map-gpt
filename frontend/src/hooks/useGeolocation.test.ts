import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

// Mock the geolocation module
vi.mock('@/lib/geolocation', () => ({
  getCurrentLocation: vi.fn(),
}));

import { getCurrentLocation } from '@/lib/geolocation';

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.getLocation).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('should return location when getLocation succeeds', async () => {
    const mockLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      address: 'New York, NY',
    };

    vi.mocked(getCurrentLocation).mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      const location = await result.current.getLocation();
      expect(location).toEqual(mockLocation);
    });

    expect(result.current.location).toEqual(mockLocation);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should set error when getLocation fails', async () => {
    const mockError = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    vi.mocked(getCurrentLocation).mockRejectedValue(mockError);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      const location = await result.current.getLocation();
      expect(location).toBeNull();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBe('Permission denied');
    expect(result.current.isLoading).toBe(false);
  });

  it('should set isLoading to true while fetching location', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(getCurrentLocation).mockReturnValue(pendingPromise as Promise<{
      latitude: number;
      longitude: number;
      address?: string;
    }>);

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.getLocation();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ latitude: 0, longitude: 0, address: 'Test' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear error when clearError is called', async () => {
    const mockError = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    vi.mocked(getCurrentLocation).mockRejectedValue(mockError);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getLocation();
    });

    expect(result.current.error).toBe('Permission denied');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should clear previous error on new getLocation call', async () => {
    const mockError = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const mockLocation = { latitude: 40.7128, longitude: -74.006, address: 'NYC' };

    vi.mocked(getCurrentLocation)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockLocation);

    const { result } = renderHook(() => useGeolocation());

    // First call fails
    await act(async () => {
      await result.current.getLocation();
    });

    expect(result.current.error).toBe('Permission denied');

    // Second call succeeds
    await act(async () => {
      await result.current.getLocation();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.location).toEqual(mockLocation);
  });
});
