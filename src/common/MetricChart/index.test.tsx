/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { MetricChart } from './index';
import React from 'react';
import { HEADLAMP_METRIC_UNIT, HEADLAMP_VALUE } from '../helpers';

// Mock recharts
vi.mock('recharts', () => ({
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Legend: () => <div data-testid="legend" />,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    Tooltip: () => <div data-testid="tooltip" />,
    XAxis: ({ label }: any) => <div data-testid="xaxis" data-label={label?.value} />,
    YAxis: ({ label }: any) => <div data-testid="yaxis" data-label={label?.value} />,
}));

// Mock SectionBox
vi.mock('@kinvolk/headlamp-plugin/lib/components/common', () => ({
    SectionBox: ({ title, children }: any) => (
        <div data-testid="section-box" data-title={title}>
            {children}
        </div>
    ),
}));

describe('MetricChart component', () => {
    afterEach(() => {
        cleanup();
    });

    test('does not render if data is empty or missing value property', () => {
        const fields = [{ header: `${HEADLAMP_VALUE}_myValue` }];
        const data = {};

        const { container } = render(<MetricChart data={data} fields={fields} node="node1" />);
        expect(container.firstChild).toBeNull();
    });

    test('does not render if value is not an array', () => {
        const fields = [{ header: `${HEADLAMP_VALUE}_myValue` }];
        const data = { myValue: 100 }; // Not an array

        const { container } = render(<MetricChart data={data} fields={fields} node="node1" />);
        expect(container.firstChild).toBeNull();
    });

    test('does not render if fields are missing the value header', () => {
        const fields = [{ header: 'some_other_header' }];
        const data = { myValue: [100, 200] };

        const { container } = render(<MetricChart data={data} fields={fields} node="node1" />);
        expect(container.firstChild).toBeNull();
    });

    test('renders chart correctly with provided data', () => {
        const fields = [
            { header: `${HEADLAMP_VALUE}_myValue` },
            { header: `${HEADLAMP_METRIC_UNIT}_KB` },
        ];
        const data = { myValue: [10, 20, 30] };

        render(<MetricChart data={data} fields={fields} node="node-test" />);

        expect(screen.getByTestId('section-box')).toBeDefined();
        expect(screen.getByTestId('section-box').getAttribute('data-title')).toBe('Metric Chart for node node-test');

        expect(screen.getByTestId('responsive-container')).toBeDefined();
        expect(screen.getByTestId('bar-chart')).toBeDefined();

        const xaxis = screen.getByTestId('xaxis');
        expect(xaxis.getAttribute('data-label')).toBe('KB');

        const yaxis = screen.getByTestId('yaxis');
        expect(yaxis.getAttribute('data-label')).toBe('myValue');
    });

    test('renders chart with default scale label if unit is not provided', () => {
        const fields = [
            { header: `${HEADLAMP_VALUE}_myValue` },
        ];
        const data = { myValue: [50] };

        render(<MetricChart data={data} fields={fields} node="node1" />);

        const xaxis = screen.getByTestId('xaxis');
        expect(xaxis.getAttribute('data-label')).toBe('Scale');
    });

    test('handles empty fields array gracefully', () => {
        const fields: any[] = [];
        const data = { myValue: [10, 20, 30] };

        const { container } = render(<MetricChart data={data} fields={fields} node="node1" />);
        expect(container.firstChild).toBeNull();
    });

    test('handles null data gracefully', () => {
        const fields = [
            { header: `${HEADLAMP_VALUE}_myValue` },
        ];
        // Explicitly pass data as null
        const { container } = render(<MetricChart data={null} fields={fields} node="node1" />);
        expect(container.firstChild).toBeNull();
    });
});
