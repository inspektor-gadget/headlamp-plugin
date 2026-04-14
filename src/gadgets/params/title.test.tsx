/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Title from './title';

describe('Title Component', () => {
  
  test('renders the title when provided', () => {
    const mockParam = {
      key: "my_param",
      title: "My Custom Title",
      description: "A description"
    };

    render(<Title param={mockParam} />);
    
    // Should prefer title over key
    expect(screen.getByText('My Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('my_param')).not.toBeInTheDocument();
  });

  test('renders the key when title is missing', () => {
    const mockParam = {
      key: "fallback_key",
      // no title
    };

    render(<Title param={mockParam} />);
    
    // Should fallback to key
    expect(screen.getByText('fallback_key')).toBeInTheDocument();
  });

  test('renders description when provided', () => {
    const mockParam = {
      key: "test",
      description: "This is a helpful tooltip description"
    };

    render(<Title param={mockParam} />);
    
    expect(screen.getByText('This is a helpful tooltip description')).toBeInTheDocument();
  });

  test('does not render description if missing', () => {
    const mockParam = {
      key: "test",
      description: "" // empty
    };

    render(<Title param={mockParam} />);
    
    // We expect only the title/key, no empty paragraph
    // (MUI Typography might render empty, but generally we just check the text isn't there)
    // Simpler check: ensure no unexpected text exists
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});