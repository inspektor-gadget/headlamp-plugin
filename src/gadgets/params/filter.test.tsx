/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { fireEvent,render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import FilterComponent from './filter';

// 1. Mock Iconify
vi.mock('@iconify/react', () => ({
  Icon: () => <span />
}));

describe('FilterComponent', () => {
  const mockSet = vi.fn();
  
  const mockConfig = {
    set: mockSet
  };

  const mockParam = {
    key: "filter_rules",
    title: "Global Filters",
    defaultValue: ""
  };

  // 2. Complex Config to test Dynamic Inputs
  const mockGadgetConfig = {
    dataSources: {
      kubernetes: {
        name: "k8s",
        fields: [
          { 
            fullName: "pod", 
            annotations: { description: "The pod name" } 
          },
          { 
            fullName: "status", 
            annotations: { "value.one-of": "Running, Pending, Error" } 
          }
        ]
      }
    }
  };

  beforeEach(() => {
    mockSet.mockClear();
  });

  test('renders Add Filter button', () => {
    render(
      <FilterComponent 
        param={mockParam} 
        config={mockConfig} 
        gadgetConfig={mockGadgetConfig} 
      />
    );
    expect(screen.getByText('Global Filters')).toBeInTheDocument();
    expect(screen.getByText('Add Filter')).toBeInTheDocument();
  });

  test('adds a row and constructs the filter string (Standard Text Input)', () => {
    render(
      <FilterComponent 
        param={mockParam} 
        config={mockConfig} 
        gadgetConfig={mockGadgetConfig} 
      />
    );

    // 1. Click Add
    fireEvent.click(screen.getByText('Add Filter'));

    // 2. Select the Key ("k8s:pod")
    // There are multiple selects. We find them by role.
    const selects = screen.getAllByRole('combobox');
    const keySelect = selects[0]; // The first one is the Field Key
    
    fireEvent.mouseDown(keySelect); // Open menu
    const keyOption = screen.getByRole('option', { name: "k8s:pod" });
    fireEvent.click(keyOption);

    // 3. Select the Op ("==")
    const opSelect = selects[1]; // The second one is the Operation
    fireEvent.mouseDown(opSelect);
    const opOption = screen.getByRole('option', { name: "==" });
    fireEvent.click(opOption);

    // 4. Type the Value ("nginx")
    // Since k8s:pod has no "one-of" annotation, this is a TextField
    const valueInput = screen.getByRole('textbox');
    fireEvent.change(valueInput, { target: { value: 'nginx' } });

    // 5. Verify the constructed string: "k8s:pod==nginx"
    expect(mockSet).toHaveBeenLastCalledWith("k8s:pod==nginx");
  });

  test('switches to Dropdown input when field has "one-of" annotation', () => {
    render(
      <FilterComponent 
        param={mockParam} 
        config={mockConfig} 
        gadgetConfig={mockGadgetConfig} 
      />
    );

    fireEvent.click(screen.getByText('Add Filter'));

    // 1. Select a key that has options ("k8s:status")
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]); 
    fireEvent.click(screen.getByRole('option', { name: "k8s:status" }));

    // 2. Select Op
    fireEvent.mouseDown(selects[1]);
    fireEvent.click(screen.getByRole('option', { name: "==" }));

    // 3. Verify Value input is now a Select (combobox), NOT a text box
    // We should now have 3 comboboxes (Key, Op, Value)
    const allSelects = screen.getAllByRole('combobox');
    expect(allSelects).toHaveLength(3);
    
    // 4. Select a value from the dynamic dropdown ("Running")
    const valueSelect = allSelects[2];
    fireEvent.mouseDown(valueSelect);
    fireEvent.click(screen.getByRole('option', { name: "Running" }));

    // 5. Verify Output
    expect(mockSet).toHaveBeenLastCalledWith("k8s:status==Running");
  });

  test('removes a filter row', () => {
    render(
      <FilterComponent 
        param={mockParam} 
        config={mockConfig} 
        gadgetConfig={mockGadgetConfig} 
      />
    );

    // Add and fill a row
    fireEvent.click(screen.getByText('Add Filter'));
    
    // Find the delete button (icon button)
    // We can find it by the Icon mock we inserted or by role
    const deleteButtons = screen.getAllByRole('button');
    // The last button is likely "Add Filter", the one before is Delete
    // A safer way is checking for the button inside the row box
    const deleteButton = deleteButtons.find(b => !b.textContent?.includes('Add Filter'));
    
    expect(deleteButton).toBeDefined();
    if (!deleteButton) throw new Error('Delete button not found');
    fireEvent.click(deleteButton);

    // Should set config to undefined (empty)
    expect(mockSet).toHaveBeenLastCalledWith(undefined);
  });
});