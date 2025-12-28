import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBottomSheet } from './MobileBottomSheet';

describe('MobileBottomSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and children when open', () => {
    render(
      <MobileBottomSheet
        isOpen={true}
        onClose={mockOnClose}
        title="Test Sheet"
      >
        <div>Test Content</div>
      </MobileBottomSheet>
    );

    expect(screen.getByText('Test Sheet')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render title icon when provided', () => {
    render(
      <MobileBottomSheet
        isOpen={true}
        onClose={mockOnClose}
        title="Test Sheet"
        titleIcon={<span data-testid="title-icon">🔍</span>}
      >
        <div>Content</div>
      </MobileBottomSheet>
    );

    expect(screen.getByTestId('title-icon')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <MobileBottomSheet
        isOpen={true}
        onClose={mockOnClose}
        title="Test Sheet"
      >
        <div>Content</div>
      </MobileBottomSheet>
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should apply translate-y-0 when open', () => {
    const { container } = render(
      <MobileBottomSheet
        isOpen={true}
        onClose={mockOnClose}
        title="Test Sheet"
      >
        <div>Content</div>
      </MobileBottomSheet>
    );

    const sheet = container.firstChild as HTMLElement;
    expect(sheet.className).toContain('translate-y-0');
  });

  it('should apply translate transform when closed', () => {
    const { container } = render(
      <MobileBottomSheet
        isOpen={false}
        onClose={mockOnClose}
        title="Test Sheet"
      >
        <div>Content</div>
      </MobileBottomSheet>
    );

    const sheet = container.firstChild as HTMLElement;
    expect(sheet.className).toContain('translate-y-[calc(100%+64px)]');
  });
});
