/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { fireEvent,render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import AnnotationFilter from './annotation';

// Keep the mock but simpler
vi.mock('@iconify/react', () => ({
  Icon: () => <span />
}));

describe('AnnotationFilter Component', () => {
  const mockSetFilters = vi.fn();
  
  const mockParam = {
    key: "my_annotation",
    prefix: "gadget_",
    title: "Filter by Annotation"
  };

  const mockDataSources = {
    kubernetes: {
      name: "k8s",
      fields: [{ fullName: "pod_name" }, { fullName: "namespace" }]
    }
  };

  beforeEach(() => {
    mockSetFilters.mockClear();
  });

  test('renders "Add Annotation" button initially', () => {
    render(
      <AnnotationFilter 
        param={mockParam} 
        filters={{}} 
        setFilters={mockSetFilters} 
        dataSources={mockDataSources}
      />
    );

    expect(screen.getByText('Filter by Annotation')).toBeInTheDocument();
    expect(screen.getByText('Add Annotation')).toBeInTheDocument();
  });

  test('parses existing filter string into rows (Deserialization)', async () => {
    const initialFilters = {
      "gadget_my_annotation": "k8s:app=frontend"
    };

    render(
      <AnnotationFilter 
        param={mockParam} 
        filters={initialFilters} 
        setFilters={mockSetFilters} 
        dataSources={mockDataSources}
      />
    );

    // Wait for the component to parse and render
    const valueInput = await screen.findByDisplayValue('frontend');
    expect(valueInput).toBeInTheDocument();

    const keyInput = screen.getByDisplayValue('app');
    expect(keyInput).toBeInTheDocument();

    // Find the delete button by its role and type instead of testid
    // Since there are multiple buttons, get all and filter
    const buttons = screen.getAllByRole('button');
    // The IconButton should be in the list (filter out "Add Annotation")
    const iconButtons = buttons.filter(btn => 
      !btn.textContent?.includes('Add Annotation')
    );
    expect(iconButtons.length).toBeGreaterThan(0);
  });

  test('adds a new row and updates filter string (Serialization)', async () => {
    render(
      <AnnotationFilter 
        param={mockParam} 
        filters={{}} 
        setFilters={mockSetFilters} 
        dataSources={mockDataSources}
      />
    );

    fireEvent.click(screen.getByText('Add Annotation'));

    const fieldSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(fieldSelect);
    fireEvent.click(screen.getByRole('option', { name: 'k8s' }));

    const keyInput = await screen.findByPlaceholderText('Key');
    const valueInput = screen.getByPlaceholderText('Value');

    fireEvent.change(keyInput, { target: { value: 'team' } });
    fireEvent.change(valueInput, { target: { value: 'core' } });

    const lastCall = mockSetFilters.mock.calls[mockSetFilters.mock.calls.length - 1][0];
    const nextFilters = typeof lastCall === 'function' ? lastCall({}) : lastCall;
    expect(nextFilters).toEqual({ "gadget_my_annotation": "k8s:team=core" });
  });

  test('deletes a row when delete icon is clicked', async () => {
    const initialFilters = {
      "gadget_my_annotation": "k8s:app=frontend"
    };

    render(
      <AnnotationFilter 
        param={mockParam} 
        filters={initialFilters} 
        setFilters={mockSetFilters} 
        dataSources={mockDataSources}
      />
    );

    await screen.findByDisplayValue('frontend');

    // Get all buttons and find the one that's NOT "Add Annotation"
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => 
      !btn.textContent?.includes('Add Annotation')
    );
    
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeDefined();
    if (!deleteButton) throw new Error('Delete button not found');
    fireEvent.click(deleteButton);

    expect(mockSetFilters).toHaveBeenCalled();
  });
});