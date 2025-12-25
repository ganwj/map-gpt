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
});
