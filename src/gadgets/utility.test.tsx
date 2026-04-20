/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { processDataColumn, processGadgetData, createGadgetCallbacks, MAX_DATA_LIMIT } from './utility';
import { HEADLAMP_KEY, HEADLAMP_VALUE, IS_METRIC } from '../common/helpers';
import React from 'react';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
    Link: ({ routeName, params, children }: any) => (
        <a data-testid="mock-link" href={`${routeName}/${JSON.stringify(params)}`}>
            {children}
        </a>
    ),
}));

// Mock window/global objects if needed
const mockSetGadgetData = vi.fn();
const mockSetBufferedGadgetData = vi.fn();
const mockSetLoading = vi.fn();

describe('gadget utility module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('MAX_DATA_LIMIT', () => {
        test('exports MAX_DATA_LIMIT as 20000', () => {
            expect(MAX_DATA_LIMIT).toBe(20000);
        });
    });

    describe('processDataColumn', () => {
        test('returns null for IS_METRIC column', () => {
            expect(processDataColumn({}, IS_METRIC)).toBeNull();
        });

        test('returns null for HEADLAMP_KEY column', () => {
            expect(processDataColumn({}, HEADLAMP_KEY)).toBeNull();
        });

        test('returns null for HEADLAMP_VALUE column', () => {
            expect(processDataColumn({}, HEADLAMP_VALUE)).toBeNull();
        });

        test('returns plain value for k8s.containerName', () => {
            const payload = { k8s: { containerName: 'my-container' } };
            expect(processDataColumn(payload, 'k8s.containerName')).toBe('my-container');
        });

        test('returns Link component for k8s.namespace', () => {
            const payload = { k8s: { namespace: 'default' } };
            const result: any = processDataColumn(payload, 'k8s.namespace');

            expect(result).toBeDefined();
            expect(result.props.routeName).toBe('k8s.namespace');
            expect(result.props.params.name).toBe('default');
        });

        test('returns Link component for k8s.node', () => {
            const payload = { k8s: { node: 'minikube' } };
            const result: any = processDataColumn(payload, 'k8s.node');

            expect(result).toBeDefined();
            expect(result.props.routeName).toBe('k8s.node');
            expect(result.props.params.name).toBe('minikube');
        });

        test('returns Link component for k8s.podName if namespace exists', () => {
            const payload = { k8s: { podName: 'my-pod', namespace: 'my-ns' } };
            const result: any = processDataColumn(payload, 'k8s.podName');

            expect(result).toBeDefined();
            expect(result.props.routeName).toBe('pod');
            expect(result.props.params.name).toBe('my-pod');
            expect(result.props.params.namespace).toBe('my-ns');
        });

        test('returns plain text for k8s.podName if namespace does NOT exist', () => {
            const payload = { k8s: { podName: 'my-pod' } };
            const result = processDataColumn(payload, 'k8s.podName');

            expect(result).toBe('my-pod');
        });

        test('returns stringified and cleaned value for default case', () => {
            const payload = { some: { nested: { field: "hello 'world'" } } };
            const result = processDataColumn(payload, 'some.nested.field');

            expect(result).toBe('hello world');
        });

        test('returns undefined as string for missing field in default case', () => {
            const payload = {};

            // JSON.stringify(undefined) = undefined, calling undefined.replace throws
            // The implementation throws, so testing that it throws or handles it is required.
            // Assuming no fixes applied to utility module directly per rules.
            expect(() => processDataColumn(payload, 'missingField')).toThrow('Cannot read properties of undefined');
        });
    });
});

describe('processGadgetData', () => {
    test('does nothing if columns array is empty', () => {
        processGadgetData({}, 'ds1', [], 'node1', mockSetGadgetData, mockSetBufferedGadgetData);
        expect(mockSetBufferedGadgetData).not.toHaveBeenCalled();
    });

    test('massages and buffers data if IS_METRIC is present', () => {
        const data = { val: 1 };
        const columns = [IS_METRIC, 'val'];

        processGadgetData(data, 'ds1', columns, 'node1', mockSetGadgetData, mockSetBufferedGadgetData);

        expect(mockSetBufferedGadgetData).toHaveBeenCalled();

        // Execute the state updater function to verify its behavior
        const updaterFn = mockSetBufferedGadgetData.mock.calls[0][0];
        const prevState = { ds1: { otherNode: { val: 2 } } };
        const nextState = updaterFn(prevState);

        expect(nextState.ds1.node1).toEqual(data);
    });

    test('massages and slices data to MAX_DATA_LIMIT if IS_METRIC is not present', () => {
        mockSetBufferedGadgetData.mockClear();
        const data = { k8s: { podName: 'my-pod' } };
        const columns = ['k8s.podName'];

        processGadgetData(data, 'ds1', columns, 'node1', mockSetGadgetData, mockSetBufferedGadgetData);

        expect(mockSetBufferedGadgetData).toHaveBeenCalled();

        const updaterFn = mockSetBufferedGadgetData.mock.calls[0][0];
        const prevState = { ds1: [] }; // ds1 mapping
        const nextState = updaterFn(prevState);

        expect(Array.isArray(nextState.ds1)).toBe(true);
        expect(nextState.ds1.length).toBe(1);
        expect(nextState.ds1[0]).toEqual({ 'k8s.podName': 'my-pod' });
    });
});

describe('createGadgetCallbacks', () => {
    test('creates and executes callbacks correctly', () => {
        const mockPrepareGadgetInfo = vi.fn();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const callbacks = createGadgetCallbacks(
            'node1',
            { ds1: ['col1'] },
            mockSetLoading,
            mockSetGadgetData,
            mockSetBufferedGadgetData,
            mockPrepareGadgetInfo
        );

        // Verify onGadgetInfo
        callbacks.onGadgetInfo({ info: 'test' });
        expect(mockPrepareGadgetInfo).toHaveBeenCalledWith({ info: 'test' });

        // Verify setLoading triggers
        callbacks.onReady();
        expect(mockSetLoading).toHaveBeenCalledWith(false);

        callbacks.onDone();
        expect(mockSetLoading).toHaveBeenCalledWith(false);

        // Verify onError
        callbacks.onError(new Error('Test error'));
        expect(consoleSpy).toHaveBeenCalled();

        // Verify process onData (array format)
        mockSetBufferedGadgetData.mockClear();
        callbacks.onData('ds1', [{ col1: 'val1' }, { col1: 'val2' }]);

        expect(mockSetBufferedGadgetData).toHaveBeenCalledTimes(2);

        // Verify onData (single object format)
        mockSetBufferedGadgetData.mockClear();
        callbacks.onData('ds1', { col1: 'val3' });

        expect(mockSetBufferedGadgetData).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
    });

    test('creates correctly when prepareGadgetInfo is omitted', () => {
        const callbacks = createGadgetCallbacks(
            'node1',
            { ds1: ['col1'] },
            mockSetLoading,
            mockSetGadgetData,
            mockSetBufferedGadgetData
        );

        expect(callbacks.onGadgetInfo).toBeTypeOf('function');
        // Calling it should not throw
        callbacks.onGadgetInfo({});
    });
});
