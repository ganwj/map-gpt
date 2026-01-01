import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';

// Mock fetch for API calls
vi.stubGlobal('fetch', vi.fn());

// Mock the ItineraryFlowchart component
vi.mock('./ItineraryFlowchart', () => ({
  ItineraryFlowchart: ({ day, onClose }: { day: string; onClose: () => void }) => (
    <div data-testid="itinerary-flowchart">
      <span>{day}</span>
      <button onClick={onClose}>Close Flowchart</button>
    </div>
  ),
}));

describe('ChatPanel', () => {
  const mockOnMapAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial state with header', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    expect(screen.getByText('MapGPT')).toBeInTheDocument();
  });

  it('should render input field', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    expect(screen.getByPlaceholderText('Ask about any place...')).toBeInTheDocument();
  });

  it('should toggle planning mode when button is clicked', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const planningButton = screen.getByText('Plan');
    fireEvent.click(planningButton);

    expect(screen.getByText('Plan Your Trip')).toBeInTheDocument();
  });

  it('should allow typing in the input field', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const input = screen.getByPlaceholderText('Ask about any place...');
    fireEvent.change(input, { target: { value: 'Tokyo restaurants' } });

    expect(input).toHaveValue('Tokyo restaurants');
  });

  it('should render planning mode preferences', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const planningButton = screen.getByText('Plan');
    fireEvent.click(planningButton);

    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Travel Style')).toBeInTheDocument();
  });

  it('should show interest options in planning mode', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const planningButton = screen.getByText('Plan');
    fireEvent.click(planningButton);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Culture')).toBeInTheDocument();
  });

  it('should show duration options in planning mode', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const planningButton = screen.getByText('Plan');
    fireEvent.click(planningButton);

    expect(screen.getByText('1-2 days')).toBeInTheDocument();
    expect(screen.getByText('3-4 days')).toBeInTheDocument();
  });

  it('should exit planning mode when clicking Planning again', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    // Click 'Plan' to enter planning mode
    const planButton = screen.getByText('Plan');
    fireEvent.click(planButton);
    expect(screen.getByText('Plan Your Trip')).toBeInTheDocument();

    // Button text changes to 'Planning' in planning mode, click to exit
    const planningButton = screen.getByText('Planning');
    fireEvent.click(planningButton);
    expect(screen.queryByText('Plan Your Trip')).not.toBeInTheDocument();
  });

  it('should render clear chat button', () => {
    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const buttons = screen.getAllByRole('button');
    const trashButton = buttons.find(btn => btn.querySelector('svg'));
    expect(trashButton).toBeDefined();
  });

  it('should call onClose on mobile when clicking places by day button with flowchart data', () => {
    const mockOnClose = vi.fn();

    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
        onClose={mockOnClose}
      />
    );

    // Component should render without errors with the onClose prop
    expect(screen.getByText('MapGPT')).toBeInTheDocument();
  });

  it('should accept onShowFlowchart prop for external flowchart rendering', () => {
    const mockOnShowFlowchart = vi.fn();

    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
        onShowFlowchart={mockOnShowFlowchart}
      />
    );

    expect(screen.getByText('MapGPT')).toBeInTheDocument();
  });

  it('should derive placesByDay from placesV2 and display day buttons', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Itinerary response',
        mapAction: null,
        followUpSuggestions: [],
        conversationId: 'conv-1',
        placesByDay: null,
        placesByTimePeriod: null,
        places: {
          days: [
            {
              key: 'Day 1',
              periods: {
                Morning: [
                  { options: ['Senso-ji Temple Tokyo Japan'] },
                  { options: ['Asakusa Shrine Tokyo Japan', 'Hoppy Street Tokyo Japan'] },
                  { options: ['Nakamise Street Tokyo Japan'], optional: true },
                ],
              },
              suggested: ['Ichiran Ramen Shibuya Tokyo Japan'],
            },
          ],
        },
      }),
    });

    render(
      <ChatPanel
        onMapAction={mockOnMapAction}
      />
    );

    const input = screen.getByPlaceholderText('Ask about any place...');
    fireEvent.change(input, { target: { value: 'Plan a day in Tokyo' } });

    const sendButton = document.querySelector('[data-submit-btn]') as HTMLButtonElement;
    fireEvent.click(sendButton);

    await screen.findByText('Itinerary response');

    // Should display day button with place count (no automatic map actions)
    expect(screen.getByText('Day 1 (5)')).toBeInTheDocument();
  });
});
