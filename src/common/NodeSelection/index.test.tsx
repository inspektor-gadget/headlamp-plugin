/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import React from 'react';
import { NodeSelection } from './index';

afterEach(() => {
    cleanup();
});

const mockUseNodeList = vi.fn();
const mockUsePodList = vi.fn();

vi.mock('@kinvolk/headlamp-plugin/lib/K8s', () => ({
    default: {
        ResourceClasses: {
            Node: {
                useList: () => mockUseNodeList(),
            },
            Pod: {
                useList: () => mockUsePodList(),
            },
        },
    },
}));

vi.mock('../../gadgets/helper', () => ({
    isIGPod: vi.fn(() => true),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
    Loader: ({ title }: any) => <div data-testid="loader">{title}</div>,
}));

describe('NodeSelection component', () => {
    const mockSetNodesSelected = vi.fn();
    const mockSetPodsSelected = vi.fn();

    const defaultProps = {
        open: true,
        setOpen: vi.fn(),
        nodesSelected: [],
        setNodesSelected: mockSetNodesSelected,
        setPodStreamsConnected: vi.fn(),
        setPodsSelected: mockSetPodsSelected,
        gadgetConn: {
            listGadgetInstances: vi.fn((cb) => cb([])),
            deleteGadgetInstance: vi.fn(),
        },
        gadgetInstance: null as any,
        isInstantRun: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseNodeList.mockReturnValue([[{ metadata: { name: 'node1', uid: '1' }, jsonData: { metadata: { name: 'node1-custom' } } }, { metadata: { name: 'node2', uid: '2' } }]]);
        mockUsePodList.mockReturnValue([[{ spec: { nodeName: 'node1' } }]]);
    });

    it('renders the node selection UI for instant run', async () => {
        render(<NodeSelection {...defaultProps} />);

        expect(screen.getByText(/Select a node you want to run the gadget on/i)).toBeDefined();

        // Due to useEffect, it will automatically select all nodes if nodesSelected is empty
        await waitFor(() => {
            expect(mockSetNodesSelected).toHaveBeenCalledWith(['node1', 'node2']);
        });
    });

    it('renders loader while fetching gadget instances', async () => {
        // Mock where callback is delayed
        let capturedCb: Function;
        const mockListInstances = vi.fn((cb) => {
            capturedCb = cb;
        });

        const { unmount } = render(<NodeSelection {...defaultProps} gadgetInstance={{ id: 'g1', gadgetConfig: { version: 1, imageName: '' }, tags: [] }} gadgetConn={{ listGadgetInstances: mockListInstances, deleteGadgetInstance: vi.fn() }} />);

        // Verify loading state renders loader (when finalNodes === null)
        expect(screen.getByTestId('loader')).toBeDefined();

        // Resolve callback to dismiss loader
        await act(async () => {
            capturedCb!([{ id: 'g1' }]);
        });

        await waitFor(() => {
            expect(mockSetNodesSelected).toHaveBeenCalled();
        });

        unmount();
    });

    it('handles node selection interaction', async () => {
        // Provided with already selected nodes to prevent the auto-select logic
        render(<NodeSelection {...defaultProps} nodesSelected={['node1']} />);

        const combobox = screen.getByRole('combobox');
        expect(combobox).toBeDefined();

        // Open the select dropdown
        fireEvent.mouseDown(combobox);

        // Click the node2 option
        const targetOption = screen.getByRole('option', { name: 'node2' });
        fireEvent.click(targetOption);

        // Given that it's a multiple select, interacting with the checkbox fires the handler
        // which gives an array of selections based on MUI behavior, but here we just
        // check that the callback is triggered.
        expect(mockSetNodesSelected).toHaveBeenCalled();
        expect(mockSetPodsSelected).toHaveBeenCalled();
    });

    it('renders disabled select when not instant run', async () => {
        render(<NodeSelection {...defaultProps} isInstantRun={false} />);

        expect(screen.getByText(/Running on all nodes/i)).toBeDefined();

        const combobox = screen.getByRole('combobox');
        // MUI select adds aria-disabled
        expect(combobox.getAttribute('aria-disabled')).toBe('true');
    });

    it('renders loader if finalNodes is null', () => {
        mockUseNodeList.mockReturnValue([null]);
        const { unmount } = render(<NodeSelection {...defaultProps} />);
        expect(screen.getByTestId('loader')).toBeDefined();
        unmount();
    });

    it('handles listGadgetInstances callback when gadgetInstance is provided and has no specific nodes', async () => {
        const mockListInstances = vi.fn((cb) => {
            cb([{ id: 'g1' }]); // No nodes field
        });
        const customGadgetConn = {
            listGadgetInstances: mockListInstances,
            deleteGadgetInstance: vi.fn(),
        };

        render(<NodeSelection {...defaultProps} gadgetInstance={{ id: 'g1', gadgetConfig: { version: 1, imageName: '' }, tags: [] }} gadgetConn={customGadgetConn} />);

        await waitFor(() => {
            expect(mockSetNodesSelected).toHaveBeenCalledWith(['node1', 'node2']);
            expect(mockSetPodsSelected).toHaveBeenCalled();
            expect(screen.getByText(/Select a node you want to get result from/i)).toBeDefined();
        });
    });

    it('handles listGadgetInstances callback when gadgetInstance specifies nodes', async () => {
        const mockListInstances = vi.fn((cb) => {
            cb([{ id: 'g1', nodes: ['node2'] }]);
        });
        const customGadgetConn = {
            listGadgetInstances: mockListInstances,
            deleteGadgetInstance: vi.fn(),
        };

        render(<NodeSelection {...defaultProps} gadgetInstance={{ id: 'g1', gadgetConfig: { version: 1, imageName: '' }, tags: [] }} gadgetConn={customGadgetConn} />);

        await waitFor(() => {
            expect(mockSetNodesSelected).toHaveBeenCalledWith(['node2']);
            expect(mockSetPodsSelected).toHaveBeenCalled();
        });
    });

});
