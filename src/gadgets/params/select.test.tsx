/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import SelectFilter from './select';

vi.mock('@iconify/react', () => ({
  Icon: () => <span data-testid="mock-icon" />
}));

describe('SelectFilter Component', () => {
  const mockSet = vi.fn();
  const mockGet = vi.fn();

  const mockConfig = {
    set: mockSet,
    get: mockGet
  };

  const mockParam = {
    key: "sort_by",
    title: "Sort Order",
    possibleValues: ["cpu", "memory", "name"]
  };

  beforeEach(() => {
    mockSet.mockClear();
    mockGet.mockClear();
  });

  test('renders the select with the correct label and default value', () => {
    mockGet.mockReturnValue("cpu");

    render(<SelectFilter param={mockParam} config={mockConfig} />);

    // Check the combobox exists and shows the current value
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
    expect(selectTrigger).toHaveTextContent('cpu');
  });

  test('renders all possible values in the dropdown', () => {
    mockGet.mockReturnValue("cpu");
    render(<SelectFilter param={mockParam} config={mockConfig} />);

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.mouseDown(selectTrigger);

    // Get all options by their role
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('cpu');
    expect(options[1]).toHaveTextContent('memory');
    expect(options[2]).toHaveTextContent('name');
  });

  test('calls config.set when a new option is selected', () => {
    mockGet.mockReturnValue("cpu");
    render(<SelectFilter param={mockParam} config={mockConfig} />);

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.mouseDown(selectTrigger);

    const listbox = screen.getByRole('listbox');
    const optionToSelect = within(listbox).getByText('memory');
    fireEvent.click(optionToSelect);

    expect(mockSet).toHaveBeenCalledWith("memory");
  });

  test('renders without crashing when config.get returns null', () => {
    mockGet.mockReturnValue(null);
    render(<SelectFilter param={mockParam} config={mockConfig} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('renders without crashing and shows no options when possibleValues is empty', () => {
    mockGet.mockReturnValue(null);
    const emptyParam = { ...mockParam, possibleValues: [] };
    render(<SelectFilter param={emptyParam} config={mockConfig} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});