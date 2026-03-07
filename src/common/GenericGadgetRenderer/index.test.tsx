/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import GenericGadgetRenderer from './index';
import usePortForward from '../../gadgets/igSocket';
import { createGadgetCallbacks } from '../../gadgets/utility';

vi.mock('../../gadgets/igSocket', () => ({
    default: vi.fn(),
}));

vi.mock('../../gadgets/utility', () => ({
    createGadgetCallbacks: vi.fn(),
}));

describe('GenericGadgetRenderer', () => {
    let mockIg: any;
    let mockRunGadget: any;
    let mockAttachGadgetInstance: any;
    let mockStopGadget: any;
    let mockStopAttach: any;
    let mockUsePortForward: any;

    const defaultProps: any = {
        podsSelected: ['pod1'],
        podStreamsConnected: 1,
        podSelected: 'pod1',
        setGadgetConfig: vi.fn(),
        dataColumns: { col1: [] },
        gadgetRunningStatus: true,
        filters: { filter1: 'val1' },
        setBufferedGadgetData: vi.fn(),
        setLoading: vi.fn(),
        gadgetInstance: undefined,
        setGadgetData: vi.fn(),
        node: 'node1',
        prepareGadgetInfo: vi.fn(),
        setPodStreamsConnected: vi.fn(),
        imageName: 'test-image%20name',
    };

    beforeEach(() => {
        vi.useFakeTimers();
        mockStopGadget = vi.fn();
        mockStopAttach = vi.fn();

        mockRunGadget = vi.fn().mockReturnValue({ stop: mockStopGadget });
        mockAttachGadgetInstance = vi.fn().mockReturnValue({ stop: mockStopAttach });

        mockIg = {
            runGadget: mockRunGadget,
            attachGadgetInstance: mockAttachGadgetInstance,
        };

        mockUsePortForward = usePortForward as any;
        mockUsePortForward.mockReturnValue({ ig: mockIg, isConnected: true });

        (createGadgetCallbacks as any).mockReturnValue({
            onData: vi.fn()
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        cleanup();
    });

    test('renders nothing (null)', () => {
        const { container } = render(<GenericGadgetRenderer {...defaultProps} />);
        expect(container.firstChild).toBeNull();
    });

    test('calls setPodStreamsConnected when isConnected is true', () => {
        mockUsePortForward.mockReturnValue({ ig: mockIg, isConnected: true });
        const setPodStreamsConnected = vi.fn();
        render(<GenericGadgetRenderer {...defaultProps} setPodStreamsConnected={setPodStreamsConnected} />);

        // Effect runs on mount
        expect(setPodStreamsConnected).toHaveBeenCalled();

        // Test the setter callback
        const callback = setPodStreamsConnected.mock.calls[0][0];
        // podsSelected.length is 1. prev=0 -> 1 <= 1 ? (prev : prev+1) -> 0+1=1.
        expect(callback(0)).toBe(1);
        // podsSelected.length is 1. prev=1 -> 1 < 1+1 ? -> prev
        expect(callback(1)).toBe(1);
    });

    test('sets loading to false on mount / when gadgetInstance changes', () => {
        const setLoading = vi.fn();
        const { rerender } = render(<GenericGadgetRenderer {...defaultProps} setLoading={setLoading} />);

        expect(setLoading).toHaveBeenCalledWith(false); // Initial effect

        rerender(<GenericGadgetRenderer {...defaultProps} setLoading={setLoading} gadgetInstance={{ id: '123', gadgetConfig: { version: 1 } }} />);
        expect(setLoading).toHaveBeenLastCalledWith(false);
    });

    test('does not run gadgetStartStopHandler if podStreamsConnected is not equal to podsSelected.length', () => {
        render(<GenericGadgetRenderer {...defaultProps} podStreamsConnected={0} gadgetRunningStatus={true} />);
        expect(mockRunGadget).not.toHaveBeenCalled();
    });

    test('runs gadget when runningStatus goes true and connections match', () => {
        const { rerender } = render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={false} />);
        expect(mockRunGadget).not.toHaveBeenCalled();

        rerender(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);
        expect(mockRunGadget).toHaveBeenCalled();
        expect(mockRunGadget.mock.calls[0][0]).toEqual({
            version: 1,
            imageName: 'test-image name',
            paramValues: { filter1: 'val1' }
        });
    });

    test('runGadget onReady callback stops gadget if running status became false in the meantime', () => {
        let onReadyCb: any;
        mockRunGadget.mockImplementation((config: any, callbacks: any) => {
            onReadyCb = callbacks.onReady;
            return { stop: mockStopGadget };
        });

        const { rerender } = render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);
        expect(mockRunGadget).toHaveBeenCalled();

        // Change status to false
        rerender(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={false} />);

        // Simulate onReady
        onReadyCb();
        expect(mockStopGadget).toHaveBeenCalled();
    });

    test('runGadget onReady callback does not stop gadget if running status is still true', () => {
        let onReadyCb: any;
        mockRunGadget.mockImplementation((config: any, callbacks: any) => {
            onReadyCb = callbacks.onReady;
            return { stop: mockStopGadget };
        });

        render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);
        expect(mockRunGadget).toHaveBeenCalled();

        // Simulate onReady
        onReadyCb();
        expect(mockStopGadget).not.toHaveBeenCalled();
    });

    test('runGadget err callback', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        let errCb: any;
        mockRunGadget.mockImplementation((config: any, callbacks: any, errParam: any) => {
            errCb = errParam;
            return { stop: mockStopGadget };
        });

        render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);

        errCb('test error');
        expect(consoleSpy).toHaveBeenCalledWith('Gadget run error:', 'test error');
        consoleSpy.mockRestore();
    });

    test('stops gadget when runningStatus goes false', () => {
        const { rerender } = render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);
        expect(mockRunGadget).toHaveBeenCalled();

        rerender(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={false} />);
        expect(mockStopGadget).toHaveBeenCalled();
    });

    test('gadgetStartStopHandler does nothing if ig is undefined', () => {
        mockUsePortForward.mockReturnValue({ ig: undefined, isConnected: true });
        render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);
        expect(mockRunGadget).not.toHaveBeenCalled();
    });

    test('attaches gadget instance when gadgetInstance is provided', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        expect(mockAttachGadgetInstance).not.toHaveBeenCalled(); // due to timeout

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(mockAttachGadgetInstance).toHaveBeenCalled();
        expect(mockAttachGadgetInstance.mock.calls[0][0]).toEqual({
            id: 'inst1',
            version: 2
        });
    });

    test('timeout callback bails out if ig is falsy when running', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        mockUsePortForward.mockReturnValue({ ig: undefined, isConnected: true });
        // Trigger a re-render. Since we didn't change props used in useEffect deps, we'd need to change podStreamsConnected
        rerender(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} podStreamsConnected={2} podsSelected={['pod1', 'pod2']} />);
        // But the timeout is already registered with the old ig variable state? No, `ig` is from usePortForward and available in the closure for timeout?
        // Wait, the closure captures the initial `ig` value... 

        // Let's completely unmount and remount with ig undefined
        cleanup();
        mockUsePortForward.mockReturnValue({ ig: undefined, isConnected: true });
        render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(mockAttachGadgetInstance).not.toHaveBeenCalled();
    });

    test('timeout callback bails out if component unmounted', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        let captureTimeoutCb: any;
        const origSetTimeout = global.setTimeout;
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, ms: any) => {
            captureTimeoutCb = cb;
            return origSetTimeout(cb, ms);
        });

        const { unmount } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        unmount();

        // Manually trigger the callback. It should hit the `!mountedRef.current` condition
        if (captureTimeoutCb) {
            captureTimeoutCb();
        }

        expect(mockAttachGadgetInstance).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });

    test('clears attachTimeout when runningStatus goes false and gadgetInstance is removed', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        rerender(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={false} gadgetInstance={undefined} />);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(mockAttachGadgetInstance).not.toHaveBeenCalled();
    });

    test('calls attachStop when runningStatus goes false and gadgetInstance is removed', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        rerender(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={false} gadgetInstance={undefined} />);

        expect(mockStopAttach).toHaveBeenCalled();
    });

    test('clears previous timeout and stops attach if gadgetStartStopHandler runs again', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        // Fast forward 1s
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Trigger StartStopHandler again by simulating podStreamsConnected change
        rerender(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} podStreamsConnected={1} />); // It actually runs again only if gadgetRunningStatus && length === connected and deps change..
        // Wait, the dependencies are [gadgetRunningStatus, podStreamsConnected, podsSelected]
        // Setting podStreamsConnected to a different value won't trigger it if it doesn't match length. 
        // Setting podsSelected length might.
        // Let's just go running false then true
        rerender(<GenericGadgetRenderer {...p} gadgetRunningStatus={false} />);
        rerender(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        // Total 3000ms from start
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        // Should only attach once because the first timeout was cleared
        expect(mockAttachGadgetInstance).toHaveBeenCalledTimes(1);
    });

    test('stops existing attachment when StartStopHandler attaches again', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        act(() => {
            vi.advanceTimersByTime(2000);
        });
        expect(mockAttachGadgetInstance).toHaveBeenCalledTimes(1);

        // Now we have an active attachment. Re-run handler by toggling podsSelected/streams
        rerender(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} podStreamsConnected={2} podsSelected={['pod1', 'pod2']} />);

        expect(mockStopAttach).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(mockAttachGadgetInstance).toHaveBeenCalledTimes(2);
    });

    test('unmount cleans up timers and gadgets', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { unmount, rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        unmount();

        expect(mockStopAttach).toHaveBeenCalled();
    });

    test('unmount cleans up pending timeouts without crashing', () => {
        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { unmount } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        unmount();
        // The timeout is cleared properly
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(mockAttachGadgetInstance).not.toHaveBeenCalled();
    });

    test('handles ig returning no stop method for runGadget', () => {
        mockRunGadget.mockReturnValue(undefined); // No stop method
        const { unmount } = render(<GenericGadgetRenderer {...defaultProps} gadgetRunningStatus={true} />);

        expect(() => unmount()).not.toThrow();
    });

    test('handles ig returning no stop method for attach', () => {
        mockAttachGadgetInstance.mockReturnValue({}); // No stop method

        const p = { ...defaultProps, gadgetInstance: { id: 'inst1', gadgetConfig: { version: 2 } } };
        const { rerender } = render(<GenericGadgetRenderer {...p} gadgetRunningStatus={true} />);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        rerender(<GenericGadgetRenderer {...p} gadgetRunningStatus={false} />);
        // Should not crash
    });

    test('handles undefined imageName gracefully', () => {
        const { unmount } = render(<GenericGadgetRenderer {...defaultProps} imageName={undefined} gadgetRunningStatus={true} />);
        expect(mockRunGadget).toHaveBeenCalledWith(
            expect.objectContaining({ imageName: '' }),
            expect.anything(),
            expect.anything()
        );
        unmount();
    });

    test('does not call setPodStreamsConnected if isConnected is false', () => {
        mockUsePortForward.mockReturnValue({ ig: mockIg, isConnected: false });
        const setPodStreamsConnected = vi.fn();
        render(<GenericGadgetRenderer {...defaultProps} setPodStreamsConnected={setPodStreamsConnected} />);

        expect(setPodStreamsConnected).not.toHaveBeenCalled();
    });
});
