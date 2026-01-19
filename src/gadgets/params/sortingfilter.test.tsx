/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import SortingFilter from './sortingfilter';

//  Mock Iconify
vi.mock('@iconify/react', () => ({
  Icon: () => <span data-testid="mock-icon" />,
}));

//  Mock Title component
vi.mock('./title', () => ({
  default: function DummyTitle() {
    return <div data-testid="mock-title">Sort Title</div>;
  },
}));

describe('SortingFilter Component', () => {
  const mockSet = vi.fn();

  const mockConfig = {
    set: mockSet,
  };

  const mockParam = {
    key: 'sort_rules',
    title: 'Sorting',
  };

  const mockGadgetConfig = {
    dataSources: {
      k8s: {
        name: 'k8s',
        fields: [{ fullName: 'pod_name' }, { fullName: 'node_name' }],
      },
    },
  };

  beforeEach(() => {
    mockSet.mockClear();
  });

  test('renders Add Sorting button', () => {
    render(<SortingFilter param={mockParam} config={mockConfig} gadgetConfig={mockGadgetConfig} />);
    expect(screen.getByText('Add Sorting')).toBeInTheDocument();
  });

  test('adds a default sorting rule (Ascending)', () => {
    render(<SortingFilter param={mockParam} config={mockConfig} gadgetConfig={mockGadgetConfig} />);

    fireEvent.click(screen.getByText('Add Sorting'));

    // Default logic: First field (pod_name) + Ascending ('')
    // Result: "k8s:pod_name"
    expect(mockSet).toHaveBeenLastCalledWith('k8s:pod_name');
  });

  test('toggles sorting direction to Descending', () => {
    render(<SortingFilter param={mockParam} config={mockConfig} gadgetConfig={mockGadgetConfig} />);

    fireEvent.click(screen.getByText('Add Sorting'));

    // Find the toggle button (Title is 'Ascending')
    const toggleBtn = screen.getByTitle('Ascending');

    fireEvent.click(toggleBtn);

    // Expect prefix '-'
    expect(mockSet).toHaveBeenLastCalledWith('k8s:-pod_name');
  });

  test('changes the field in the dropdown', () => {
    render(<SortingFilter param={mockParam} config={mockConfig} gadgetConfig={mockGadgetConfig} />);

    fireEvent.click(screen.getByText('Add Sorting'));

    // Open Dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Click "k8s.node_name"
    const option = screen.getByRole('option', { name: 'k8s.node_name' });
    fireEvent.click(option);

    expect(mockSet).toHaveBeenLastCalledWith('k8s:node_name');
  });

  test('deletes a sorting rule', () => {
    render(<SortingFilter param={mockParam} config={mockConfig} gadgetConfig={mockGadgetConfig} />);

    fireEvent.click(screen.getByText('Add Sorting'));

    // Find delete button (The one that isn't Sort Toggle or Add Button)
    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find(b => !b.title && !b.textContent?.includes('Add Sorting'));

    expect(deleteBtn).toBeDefined();
    if (!deleteBtn) throw new Error('Delete button not found');
    fireEvent.click(deleteBtn);

    // Should reset
    expect(mockSet).toHaveBeenLastCalledWith(undefined);
  });
});
