/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import CheckboxFilter from './bool';

describe('CheckboxFilter', () => {
  const mockSet = vi.fn();
  const mockConfig = { set: mockSet };
  const mockParam = {
    key: 'enable_feature',
    description: 'Enables the feature',
  };

  beforeEach(() => {
    mockSet.mockClear();
  });

  test('renders checkbox with correct label', () => {
    render(<CheckboxFilter param={mockParam} config={mockConfig} />);

    // Check for the actual text content from the Title component
    expect(screen.getByText('enable_feature')).toBeInTheDocument();
    expect(screen.getByText('Enables the feature')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  test('calls config.set with "true" when checked', () => {
    render(<CheckboxFilter param={mockParam} config={mockConfig} />);

    fireEvent.click(screen.getByRole('checkbox'));

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith('true');
  });

  test('calls config.set with "false" when unchecked', () => {
    render(<CheckboxFilter param={mockParam} config={mockConfig} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox); // check
    fireEvent.click(checkbox); // uncheck

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenNthCalledWith(1, 'true');
    expect(mockSet).toHaveBeenNthCalledWith(2, 'false');
  });

  test('renders checkbox as checked when config.get returns "true"', () => {
    const mockGet = vi.fn().mockReturnValue('true');
    render(<CheckboxFilter param={mockParam} config={{ set: mockSet, get: mockGet }} />);

    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
