/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { GadgetWithDataSource } from './index';
import { IS_METRIC } from '../helpers';

vi.mock('@iconify/react', () => ({
    Icon: ({ icon }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
    Table: ({ data, columns }: any) => (
        <div data-testid="mock-table">
            {columns.map((r: any, i: number) => (
                <span key={i} data-testid={`col-${r.header}`}>
                    {typeof r.accessorFn === 'function' ? r.accessorFn({ [r.header]: `val-${r.header}` }) : 'no-fn'}
                </span>
            ))}
        </div>
    ),
    DateLabel: ({ date }: any) => <span data-testid="date-label">{date}</span>,
}));

vi.mock('../../gadgets/gadgetFilters', () => ({
    default: ({ onApplyFilters }: any) => (
        <button data-testid="mock-filters-apply" onClick={onApplyFilters}>
            Apply Filters
        </button>
    ),
}));

vi.mock('../MetricChart', () => ({
    MetricChart: ({ data, node }: any) => (
        <div data-testid={`metric-chart-${node}`}>{JSON.stringify(data)}</div>
    ),
}));

describe('GadgetWithDataSource', () => {
    let mockSetGadgetData: any;
    let mockSetBufferedGadgetData: any;
    let mockSetGadgetRunningStatus: any;
    let mockSetFilters: any;
    let mockSetIsRunningInBackground: any;
    let mockOnGadgetInstanceCreation: any;
    let mockHeadlessGadgetRunCallback: any;
    let mockHeadlessGadgetDeleteCallback: any;
    let mockHandleRun: any;

    let defaultProps: any;

    beforeEach(() => {
        mockSetGadgetData = vi.fn();
        mockSetBufferedGadgetData = vi.fn();
        mockSetGadgetRunningStatus = vi.fn();
        mockSetFilters = vi.fn();
        mockSetIsRunningInBackground = vi.fn();
        mockOnGadgetInstanceCreation = vi.fn();
        mockHeadlessGadgetRunCallback = vi.fn();
        mockHeadlessGadgetDeleteCallback = vi.fn();
        mockHandleRun = vi.fn();

        defaultProps = {
            podsSelected: [
                { spec: { nodeName: 'minikube' }, jsonData: { metadata: { name: 'pod1' } } }
            ],
            podStreamsConnected: 1,
            setGadgetData: mockSetGadgetData,
            setBufferedGadgetData: mockSetBufferedGadgetData,
            setGadgetRunningStatus: mockSetGadgetRunningStatus,
            gadgetRunningStatus: false,
            setFilters: mockSetFilters,
            filters: {},
            loading: false,
            gadgetConfig: {},
            dataSourceID: 'test-ds',
            gadgetData: { 'test-ds': [] },
            columns: ['col1', 'timestamp'],
            bufferedGadgetData: { 'test-ds': [] },
            renderCreateBackgroundGadget: false,
            gadgetInstance: undefined,
            gadgetConn: {},
            isRunningInBackground: false,
            isInstantRun: false,
            setIsRunningInBackground: mockSetIsRunningInBackground,
            onGadgetInstanceCreation: mockOnGadgetInstanceCreation,
            error: null,
            headlessGadgetRunCallback: mockHeadlessGadgetRunCallback,
            headlessGadgetDeleteCallback: mockHeadlessGadgetDeleteCallback,
            handleRun: mockHandleRun,
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        cleanup();
    });

    test('renders nothing except instantRun conditions when podStreamsConnected != podsSelected.length', () => {
        render(<GadgetWithDataSource {...defaultProps} podStreamsConnected={0} isInstantRun={true} />);
        expect(screen.queryByText(/Status:/i)).toBeNull();
        expect(screen.getByText('Configure Params')).toBeDefined();
    });

    test('renders error when isInstantRun is true and error prop is provided', () => {
        render(<GadgetWithDataSource {...defaultProps} isInstantRun={true} error="An error occurred" />);
        expect(screen.getByText('An error occurred')).toBeDefined();
        // filters shouldn't be rendered
        expect(screen.queryByTestId('mock-filters-apply')).toBeNull();
    });

    test('onApplyFilters in GadgetFilters triggers state setters correctly', () => {
        render(<GadgetWithDataSource {...defaultProps} isInstantRun={true} />);

        mockSetGadgetData.mockClear();
        mockSetBufferedGadgetData.mockClear();
        mockSetGadgetRunningStatus.mockClear();

        const applyBtn = screen.getByTestId('mock-filters-apply');
        fireEvent.click(applyBtn);

        expect(mockSetGadgetData).toHaveBeenCalled();
        expect(mockSetBufferedGadgetData).toHaveBeenCalled();
        expect(mockSetGadgetRunningStatus).toHaveBeenCalled();

        // Extract callbacks
        const setGadgetDataCb = mockSetGadgetData.mock.calls[0][0];
        const setBufferedGadgetDataCb = mockSetBufferedGadgetData.mock.calls[0][0];
        const setGadgetRunningStatusCb = mockSetGadgetRunningStatus.mock.calls[0][0];

        expect(setGadgetDataCb({ 'test-ds': [1, 2], 'other': [3] })).toEqual({ 'test-ds': [], 'other': [3] });
        expect(setBufferedGadgetDataCb({ 'test-ds': [1], 'other': [2] })).toEqual({ 'test-ds': [], 'other': [2] });
        expect(setGadgetRunningStatusCb(false)).toBe(true);
        expect(setGadgetRunningStatusCb(true)).toBe(false);
    });

    test('useEffect for gadgetInstance uses setTimeout to set gadgetRunningStatus', () => {
        vi.useFakeTimers();
        render(<GadgetWithDataSource {...defaultProps} gadgetInstance={{ id: '123' }} />);

        expect(mockSetGadgetRunningStatus).not.toHaveBeenCalled();

        vi.advanceTimersByTime(500);

        expect(mockSetGadgetRunningStatus).toHaveBeenCalledWith(true);
    });

    test('useEffect for bufferedGadgetData calls setGadgetData when data is present', () => {
        const bufferedGadgetDataState = { 'test-ds': [{ msg: 'hello' }] };
        render(<GadgetWithDataSource {...defaultProps} bufferedGadgetData={bufferedGadgetDataState} />);

        expect(mockSetGadgetData).toHaveBeenCalledWith(bufferedGadgetDataState);
    });

    test('useEffect for bufferedGadgetData does not call setGadgetData when data is null/undefined for ds', () => {
        const bufferedGadgetDataState = { 'other-ds': [{ msg: 'hello' }] };
        render(<GadgetWithDataSource {...defaultProps} bufferedGadgetData={bufferedGadgetDataState} />);

        expect(mockSetGadgetData).not.toHaveBeenCalled(); // since 'test-ds' is not present
    });

    test('MetricChart is rendered when hasMetricField is true', () => {
        const props = {
            ...defaultProps,
            columns: ['col1', IS_METRIC],
            gadgetData: { 'test-ds': { 'minikube': [{ metric: 1 }] } }
        };
        render(<GadgetWithDataSource {...props} />);

        expect(screen.getByTestId('metric-chart-minikube')).toBeDefined();
        // It renders MetricChart with [ { metric: 1 } ]
        expect(screen.getByTestId('metric-chart-minikube').textContent).toBe('[{"metric":1}]');
    });

    test('MetricChart handles missing gadgetData gracefully', () => {
        const props = {
            ...defaultProps,
            columns: ['col1', IS_METRIC],
            gadgetData: {}
        };
        render(<GadgetWithDataSource {...props} />);

        expect(screen.queryByTestId('metric-chart-minikube')).toBeNull();
    });

    test('MetricChart handles pod without nodeName gracefully', () => {
        const props = {
            ...defaultProps,
            columns: ['col1', IS_METRIC],
            gadgetData: { 'test-ds': { 'minikube': [{ metric: 1 }] } },
            podsSelected: [
                { spec: { nodeName: undefined }, jsonData: { metadata: { name: 'pod1' } } }
            ]
        };
        render(<GadgetWithDataSource {...props} />);

        expect(screen.queryByTestId('metric-chart-undefined')).toBeNull();
    });

    test('handleStartStop toggles off and on correctly without gadgetInstance', () => {
        const { rerender } = render(<GadgetWithDataSource {...defaultProps} gadgetRunningStatus={false} />);

        mockSetGadgetData.mockClear();
        mockSetBufferedGadgetData.mockClear();
        mockSetGadgetRunningStatus.mockClear();
        mockHandleRun.mockClear();

        const startBtn = screen.getByRole('button', { name: /Start/i });
        fireEvent.click(startBtn);

        expect(mockHandleRun).toHaveBeenCalled();
        expect(mockSetGadgetData).toHaveBeenCalled();
        expect(mockSetBufferedGadgetData).toHaveBeenCalled();
        expect(mockSetGadgetRunningStatus).toHaveBeenCalled();

        // Testing the callback logic
        let setGadgetDataCb = mockSetGadgetData.mock.calls[0][0];
        expect(setGadgetDataCb({})).toEqual({ 'test-ds': [] });

        let setBufferedGadgetDataCb = mockSetBufferedGadgetData.mock.calls[0][0];
        expect(setBufferedGadgetDataCb({})).toEqual({ 'test-ds': [] });

        let setGadgetRunningStatusCb = mockSetGadgetRunningStatus.mock.calls[0][0];
        expect(setGadgetRunningStatusCb(false)).toBe(true);

        // Rerender with running true
        rerender(<GadgetWithDataSource {...defaultProps} gadgetRunningStatus={true} />);

        const stopBtn = screen.getByRole('button', { name: /Stop/i });
        fireEvent.click(stopBtn);

        // Should toggle running but shouldn't reset data or call handleRun again
        expect(mockHandleRun).toHaveBeenCalledTimes(1);
    });

    test('action buttons behave correctly when gadgetInstance is provided and stopped', () => {
        const props = {
            ...defaultProps,
            gadgetInstance: { id: 'inst1' },
            gadgetRunningStatus: false
        };
        render(<GadgetWithDataSource {...props} />);

        const runBtn = screen.getByRole('button', { name: /Run/i });
        fireEvent.click(runBtn);

        expect(mockHeadlessGadgetDeleteCallback).not.toHaveBeenCalled();
        expect(mockHeadlessGadgetRunCallback).toHaveBeenCalledWith({ id: 'inst1' });
    });

    test('action buttons behave correctly when gadgetInstance is provided and running', () => {
        const props = {
            ...defaultProps,
            gadgetInstance: { id: 'inst1' },
            gadgetRunningStatus: true
        };
        render(<GadgetWithDataSource {...props} />);

        const stopBtn = screen.getByRole('button', { name: /Stop/i });
        fireEvent.click(stopBtn);

        expect(mockHeadlessGadgetDeleteCallback).toHaveBeenCalledWith({ id: 'inst1' });
        expect(mockHeadlessGadgetRunCallback).toHaveBeenCalledWith({ id: 'inst1' });
    });

    test('loading state renders Processing and disables button', () => {
        render(<GadgetWithDataSource {...defaultProps} loading={true} />);
        const btn = screen.getByRole('button', { name: /Processing/i });
        expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    test('Table columns render nicely with timestamp accessorFn', () => {
        render(<GadgetWithDataSource {...defaultProps} />);

        // Check if timestamp rendered the DateLabel
        expect(screen.getByTestId('date-label')).toBeDefined();
        // Check if normal column rendered correctly
        expect(screen.getByTestId('col-col1').textContent).toBe('val-col1');
    });

    test('renders with fallback default callbacks if not provided', () => {
        const propsWithoutCallbacks = { ...defaultProps };
        delete propsWithoutCallbacks.headlessGadgetDeleteCallback;
        delete propsWithoutCallbacks.headlessGadgetRunCallback;
        delete propsWithoutCallbacks.handleRun;

        render(<GadgetWithDataSource {...propsWithoutCallbacks} gadgetInstance={{ id: '123' }} gadgetRunningStatus={true} />);
        const stopBtn = screen.getByRole('button', { name: /Stop/i });
        fireEvent.click(stopBtn);
        // It shouldn't crash
        expect(true).toBe(true);
    });

    test('renders with fallback default handleRun if not provided', () => {
        const propsWithoutCallbacks = { ...defaultProps };
        delete propsWithoutCallbacks.headlessGadgetDeleteCallback;
        delete propsWithoutCallbacks.headlessGadgetRunCallback;
        delete propsWithoutCallbacks.handleRun;

        render(<GadgetWithDataSource {...propsWithoutCallbacks} gadgetRunningStatus={false} />);
        const startBtn = screen.getByRole('button', { name: /Start/i });
        fireEvent.click(startBtn);
        // It shouldn't crash
        expect(true).toBe(true);
    });

    test('MetricChart renders with empty array if gadgetData for node is missing', () => {
        const props = {
            ...defaultProps,
            columns: ['col1', IS_METRIC],
            gadgetData: { 'test-ds': {} } // No 'minikube' data
        };
        render(<GadgetWithDataSource {...props} />);
        expect(screen.getByTestId('metric-chart-minikube').textContent).toBe('[]');
    });

    test('Table renders with empty array if gadgetData for array is missing', () => {
        const props = {
            ...defaultProps,
            columns: ['col1'],
            gadgetData: {} // No 'test-ds'
        };
        render(<GadgetWithDataSource {...props} />);
        expect(screen.getByTestId('mock-table')).toBeDefined();
    });

    test('Table does not render if columns are missing', () => {
        const props = {
            ...defaultProps,
            columns: undefined
        };
        render(<GadgetWithDataSource {...props} />);
        expect(screen.queryByTestId('mock-table')).toBeNull();
    });

    test('loading state renders Processing on gadgetInstance button', () => {
        render(<GadgetWithDataSource {...defaultProps} loading={true} gadgetInstance={{ id: '123' }} />);
        const btn = screen.getByRole('button', { name: /Processing/i });
        expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
});
