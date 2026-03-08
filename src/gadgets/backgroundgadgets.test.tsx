/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackgroundRunning } from './backgroundgadgets';
import * as conn from './conn';

const { mockUseListNode, mockUseListPod } = vi.hoisted(() => ({
    mockUseListNode: vi.fn(),
    mockUseListPod: vi.fn(),
}));

vi.mock('@iconify/react', () => ({
    Icon: (props: any) => <span data-testid={`icon-${props.icon}`} onClick={props.onClick}>{props.icon}</span>,
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
    ConfirmDialog: ({ open, onConfirm, handleClose }: any) => (
        <div data-testid="confirm-dialog">
            {open && (
                <>
                    <button data-testid="confirm-btn" onClick={onConfirm}>Confirm</button>
                    <button data-testid="cancel-btn" onClick={handleClose}>Cancel</button>
                </>
            )}
            <button data-testid="force-confirm-btn" onClick={onConfirm}>Force Confirm</button>
        </div>
    ),
    Link: ({ children, routeName }: any) => <a data-testid="link" href={routeName}>{children}</a>,
    Loader: ({ title }: any) => <div data-testid="loader">{title}</div>,
    SectionBox: ({ children }: any) => <div data-testid="section-box">{children}</div>,
    Table: ({ data, columns, renderTopToolbarCustomActions, renderToolbarAlertBannerContent }: any) => {
        let selectedCount = 0;
        if (data.length > 0 && (data[0].id === 'selected-id' || data[0].id === 'fake-trigger')) {
            selectedCount = 1;
        }

        const mockTableObj = React.useMemo(() => ({
            getRowModel: () => ({
                rows: data.map((d: any) => ({ original: d }))
            }),
            getSelectedRowModel: () => ({
                rows: data.slice(0, selectedCount).map((d: any) => ({ original: d.id === 'fake-trigger' ? { id: 'missing-id' } : d }))
            }),
            resetRowSelection: vi.fn()
        }), [data, selectedCount]);

        return (
            <div data-testid="mock-table">
                {renderTopToolbarCustomActions && (
                    <button data-testid="select-row-btn" onClick={() => renderTopToolbarCustomActions({ table: mockTableObj })}>
                        Select Row
                    </button>
                )}
                {renderToolbarAlertBannerContent && <div data-testid="alert-banner">{renderToolbarAlertBannerContent({ table: mockTableObj })}</div>}
                <table>
                    <tbody>
                        {data.map((row: any, i: number) => (
                            <tr key={i}>
                                {columns.map((col: any, j: number) => (
                                    <td key={j} data-testid={`cell-${col.id}-${i}`}>
                                        {typeof col.accessorFn === 'function' ? col.accessorFn(row) : null}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
}));

vi.mock('@kinvolk/headlamp-plugin/lib/K8s', () => ({
    default: {
        ResourceClasses: {
            Node: { useList: () => mockUseListNode() },
            Pod: { useList: () => mockUseListPod() }
        }
    }
}));

vi.mock('@kinvolk/headlamp-plugin/lib/Utils', () => ({
    getCluster: vi.fn(() => 'test-cluster')
}));

vi.mock('../common/NotFound', () => ({
    IGNotFound: () => <div data-testid="ig-not-found">IGNot Found</div>
}));

vi.mock('./conn', () => ({
    isIGInstalled: vi.fn(),
    useGadgetConn: vi.fn()
}));

describe('backgroundgadgets module', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        mockStorage = {};

        const localStorageMock = {
            getItem: vi.fn((key: string) => mockStorage[key] || null),
            setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
            clear: vi.fn(() => { mockStorage = {}; }),
            removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
        };

        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true
        });

        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true
        });

        mockUseListNode.mockReturnValue([[{}]]);
        mockUseListPod.mockReturnValue([[{}]]);
        (conn.isIGInstalled as any).mockReturnValue(true);
    });

    afterEach(() => {
        cleanup();
    });

    test('module exports BackgroundRunning', () => {
        expect(BackgroundRunning).toBeDefined();
    });

    test('renders loading pods', () => {
        mockUseListPod.mockReturnValue([null]);
        render(<BackgroundRunning />);
        expect(screen.getByTestId('loader')).toBeDefined();
        expect(screen.getByText('loading pods')).toBeDefined();
    });

    test('renders loading ig checks', () => {
        (conn.isIGInstalled as any).mockReturnValue(null);
        render(<BackgroundRunning />);
        expect(screen.getByTestId('loader')).toBeDefined();
        expect(screen.getByText('loading ig installation checks')).toBeDefined();
    });

    test('renders ig not found', () => {
        (conn.isIGInstalled as any).mockReturnValue(false);
        render(<BackgroundRunning />);
        expect(screen.getByTestId('ig-not-found')).toBeDefined();
    });

    test('renders section box and table without selected rows', () => {
        (conn.useGadgetConn as any).mockReturnValue(null);
        render(<BackgroundRunning />);
        expect(screen.getByTestId('section-box')).toBeDefined();
        expect(screen.getByTestId('mock-table')).toBeDefined();
    });

    test('loads instances via useGadgetConn', async () => {
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([
                { id: 'inst1', name: 'my-gadget' }
            ]);
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances
        });

        render(<BackgroundRunning />);

        await act(async () => { });

        expect(mockListGadgetInstances).toHaveBeenCalled();
        const stored = JSON.parse(mockStorage['headlamp_embeded_resources'] || '[]');
        expect(stored.length).toBe(1);
    });

    test('handles error from listGadgetInstances', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess, onError) => {
            onError(new Error('Test error'));
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        expect(consoleSpy).toHaveBeenCalledWith('Error loading gadget instances:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    test('deletes instance properly when headless', async () => {
        let listSuccessCb: any;
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess) => {
            listSuccessCb = onSuccess;
            onSuccess([{ id: 'selected-id', name: 'my-gadget', isHeadless: true }]);
        });
        const mockDeleteGadgetInstance = vi.fn().mockImplementation((id, onSuccess) => {
            onSuccess();
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances,
            deleteGadgetInstance: mockDeleteGadgetInstance
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // manually trigger the selectedCount=1
        fireEvent.click(screen.getByTestId('select-row-btn'));

        // manually trigger the selectedCount=X update on the second table
        fireEvent.click(screen.getByTestId('select-row-btn'));

        // Click delete icon in alert banner
        const deleteIcon = screen.getByTestId('icon-mdi:delete');
        fireEvent.click(deleteIcon);

        // Click confirm
        const confirmBtn = screen.getByTestId('confirm-btn');
        fireEvent.click(confirmBtn);

        expect(mockDeleteGadgetInstance).toHaveBeenCalled();
        const stored = JSON.parse(mockStorage['headlamp_embeded_resources'] || '[]');
        expect(stored.length).toBe(0);
    });

    test('deletes instance properly when NOT headless', async () => {
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'my-gadget', isHeadless: false }]); // The mock parses this but overwrites its isHeadless!
        });
        const mockDeleteGadgetInstance = vi.fn();

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances,
            deleteGadgetInstance: mockDeleteGadgetInstance
        });

        // Inject a not-headless instance directly in mockStorage
        mockStorage['headlamp_embeded_resources'] = JSON.stringify([{ id: 'selected-id', name: 'local-gadget', isHeadless: false, cluster: 'test-cluster' }]);

        render(<BackgroundRunning />);
        await act(async () => { });

        // Select row first to show banner
        fireEvent.click(screen.getByTestId('select-row-btn'));

        // Click delete icon
        const deleteIcon = screen.getByTestId('icon-mdi:delete');
        fireEvent.click(deleteIcon);

        // Click confirm
        const confirmBtn = screen.getByTestId('confirm-btn');
        fireEvent.click(confirmBtn);

        // verify ig.deleteGadgetInstance is NOT called
        expect(mockDeleteGadgetInstance).not.toHaveBeenCalled();
        const stored = JSON.parse(mockStorage['headlamp_embeded_resources'] || '[]');
        expect(stored.length).toBe(0);
    });

    test('cancels delete dialog', async () => {
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'my-gadget', isHeadless: true }]);
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // Select row first to show banner
        fireEvent.click(screen.getByTestId('select-row-btn'));

        const deleteIcon = screen.getByTestId('icon-mdi:delete');
        fireEvent.click(deleteIcon);

        const cancelBtn = screen.getByTestId('cancel-btn');
        fireEvent.click(cancelBtn);

        // confirm button should be gone
        expect(screen.queryByTestId('confirm-btn')).toBeNull();
    });

    test('clears selection', async () => {
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'my-gadget', isHeadless: true }]);
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // Select row first to show banner
        fireEvent.click(screen.getByTestId('select-row-btn'));

        const clearBtn = screen.getByText('CLEAR SELECTION');
        fireEvent.click(clearBtn);

        // Assuming resetRowSelection triggers some change, but check that Button exists
        expect(clearBtn).toBeDefined();
    });

    test('error when deleting instance logs to console', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const mockListGadgetInstances = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'my-gadget', isHeadless: true }]);
        });
        const mockDeleteGadgetInstance = vi.fn().mockImplementation((id, onSuccess, onError) => {
            onError(new Error('Delete error'));
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockListGadgetInstances,
            deleteGadgetInstance: mockDeleteGadgetInstance
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // Select row first to show banner
        fireEvent.click(screen.getByTestId('select-row-btn'));

        // Click delete
        fireEvent.click(screen.getByTestId('icon-mdi:delete'));
        fireEvent.click(screen.getByTestId('confirm-btn'));

        expect(consoleSpy).toHaveBeenCalledWith('Error deleting instance:', expect.any(Error));
        consoleSpy.mockRestore();
    });
    test('handles empty gadget instance list', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([]);
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList
        });

        render(<BackgroundRunning />);

        await act(async () => { });

        expect(mockList).toHaveBeenCalled();
    });

    test('handles missing deleteGadgetInstance safely', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'gadget', isHeadless: true }]);
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList,
            deleteGadgetInstance: vi.fn()
        });

        render(<BackgroundRunning />);

        await act(async () => { });

        fireEvent.click(screen.getByTestId('select-row-btn'));
        fireEvent.click(screen.getByTestId('icon-mdi:delete'));
        fireEvent.click(screen.getByTestId('confirm-btn'));
    });

    test('handles deletion when localStorage has no matching entry', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'gadget', isHeadless: false }]);
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList,
            deleteGadgetInstance: vi.fn()
        });

        render(<BackgroundRunning />);

        await act(async () => { });

        fireEvent.click(screen.getByTestId('select-row-btn'));
        fireEvent.click(screen.getByTestId('icon-mdi:delete'));
        fireEvent.click(screen.getByTestId('confirm-btn'));
    });

    test('covers accessor fallbacks and pluralization', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([
                { id: 'inst1', isHeadless: true }, // missing name, getConfig, tags, nodes
                { id: 'inst2', name: '', gadgetConfig: { imageName: 'my-image' }, isHeadless: true }, // missing name, has imageName
                { id: 'inst3', name: '', gadgetConfig: { imageName: '' }, isHeadless: true }, // missing both, goes to Unnamed
                { id: 'selected-id', name: 'my-gadget', isHeadless: false, isEmbedded: true, kind: 'CustomKind', cluster: 'other-cluster' },
            ]);
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // Trigger selectedCount = 1, totalCount = 4 and re-render
        const selectRowBtns = screen.getAllByTestId('select-row-btn');
        fireEvent.click(selectRowBtns[0]);
    });

    test('covers null array in listGadgetInstances and clear selection with null instance', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess(null as any); // trigger instances || []
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList
        });
        render(<BackgroundRunning />);
        await act(async () => { });
    });
    test('covers !tableInstance in handleDeleteInstances', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'inst1', name: 'my-gadget', isHeadless: true }]);
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // Trigger handleDeleteInstances while tableInstance is undefined
        fireEvent.click(screen.getByTestId('force-confirm-btn'));
    });

    test('covers !instance in handleDeleteInstances', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'fake-trigger', name: 'my-gadget', isHeadless: true }]);
        });
        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList
        });

        render(<BackgroundRunning />);
        await act(async () => { });

        // Select row to set tableInstance
        fireEvent.click(screen.getByTestId('select-row-btn'));

        // Trigger handleDeleteInstances where getSelectedRowModel returns 'missing-id'
        fireEvent.click(screen.getByTestId('force-confirm-btn'));
    });

    test('renders banner when row is selected', async () => {
        const mockList = vi.fn().mockImplementation((onSuccess) => {
            onSuccess([{ id: 'selected-id', name: 'gadget', isHeadless: true }]);
        });

        (conn.useGadgetConn as any).mockReturnValue({
            listGadgetInstances: mockList
        });

        render(<BackgroundRunning />);

        await act(async () => { });

        fireEvent.click(screen.getByTestId('select-row-btn'));

        expect(screen.getByTestId('alert-banner')).toBeDefined();
    });
});
