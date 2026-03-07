/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { IGNotFound } from './index';

afterEach(() => {
    cleanup();
});

vi.mock('@mui/material', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useTheme: () => ({
            palette: {
                background: {
                    paper: '#ffffff',
                },
            },
        }),
    };
});

describe('IGNotFound component', () => {
    it('renders the not found message without crashing', () => {
        render(<IGNotFound />);
        expect(screen.getByText('Inspektor Gadget is not installed')).toBeDefined();
    });

    it('renders the installation guide link with correct URL and attributes', () => {
        render(<IGNotFound />);
        const linkElement = screen.getByRole('link', { name: /installation guide/i });
        expect(linkElement).toBeDefined();
        expect(linkElement.getAttribute('href')).toBe('https://inspektor-gadget.io/docs/latest/quick-start');
        expect(linkElement.getAttribute('target')).toBe('_blank');
    });

    it('renders the correct heading', () => {
        render(<IGNotFound />);
        const headingElement = screen.getByRole('heading', { level: 1 });
        expect(headingElement).toBeDefined();
        expect(headingElement.textContent).toBe('Inspektor Gadget is not installed');
    });
});
