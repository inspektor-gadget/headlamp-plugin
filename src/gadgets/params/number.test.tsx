/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { fireEvent,render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import NumberFilter from './number';

describe('NumberFilter Component', () => {
  const mockSet = vi.fn();
  const mockGet = vi.fn();

  const mockConfig = {
    set: mockSet,
    get: mockGet
  };

  const mockParam = {
    key: "limit_rows",
    defaultValue: "50"
  };

  beforeEach(() => {
    mockSet.mockClear();
    mockGet.mockClear();
  });

  test('renders the input with correct placeholder', () => {
    mockGet.mockReturnValue(null);

    render(<NumberFilter param={mockParam} config={mockConfig} />);

    // Just check for the actual text that renders
    expect(screen.getByText('limit_rows')).toBeInTheDocument();

    // Check input exists
    const input = screen.getByPlaceholderText('50');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  test('calls config.set with correct args when changed', () => {
    mockGet.mockReturnValue(null);
    render(<NumberFilter param={mockParam} config={mockConfig} />);

    const input = screen.getByPlaceholderText('50');

    fireEvent.change(input, { target: { value: '100' } });

    expect(mockSet).toHaveBeenCalledWith(mockParam, "100");
  });

  test('displays value retrieved from config.get', () => {
    mockGet.mockReturnValue("99");

    render(<NumberFilter param={mockParam} config={mockConfig} />);

    const input = screen.getByPlaceholderText('50');
    expect(input).toHaveValue(99); 
  });
});