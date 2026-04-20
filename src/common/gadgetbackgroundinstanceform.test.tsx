/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { GadgetBackgroundInstanceForm } from './gadgetbackgroundinstanceform';
import React from 'react';
import { useGadgetConn } from '../gadgets/conn';

// Mock dependencies
vi.mock('@iconify/react', () => ({
    Icon: () => <div data-testid="icon" />,
}));

vi.mock('@kinvolk/headlamp-plugin/lib/K8s', () => ({
    default: {
        ResourceClasses: {
            Node: {
                useList: () => [[]],
            },
            Pod: {
                useList: () => [[]],
            },
        },
    },
}));

vi.mock('@kinvolk/headlamp-plugin/lib/Utils', () => ({
    getCluster: () => 'my-cluster',
}));

const mockEnqueueSnackbar = vi.fn();
vi.mock('notistack', () => ({
    useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

vi.mock('react-router', () => ({
    useParams: () => ({ imageName: 'test-image' }),
}));

const mockCreateGadgetInstance = vi.fn();
export const mockUseGadgetConn = vi.fn().mockReturnValue({
    createGadgetInstance: mockCreateGadgetInstance,
});
vi.mock('../gadgets/conn', () => ({
    useGadgetConn: (...args: any[]) => mockUseGadgetConn(...args),
}));

vi.mock('./helpers', () => ({
    generateRandomString: () => '12345',
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('GadgetBackgroundInstanceForm', () => {
    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        filters: { filter1: 'value1' },
        nodesSelected: ['node1'],
        onGadgetInstanceCreation: vi.fn(),
        namespace: 'default',
        pod: 'pod1',
        resource: {
            jsonData: {
                kind: 'Pod',
                spec: { nodeName: 'node1' },
            },
        },
        image: 'custom-image',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    test('renders form fields with default values', () => {
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        expect(screen.getByLabelText(/Instance Name/i)).toBeDefined();
        expect((screen.getByLabelText(/Instance Name/i) as HTMLInputElement).value).toBe('custom-image-custom-12345');

        expect(screen.getByLabelText(/Tags/i)).toBeDefined();

        expect(screen.getByText(/Run on demand/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /create instance/i })).toBeDefined();
    });

    test('handles input changes', () => {
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        const nameInput = screen.getByLabelText(/Instance Name/i);
        fireEvent.change(nameInput, { target: { value: 'new-instance-name' } });
        expect((nameInput as HTMLInputElement).value).toBe('new-instance-name');

        const tagsInput = screen.getByLabelText(/Tags/i);
        fireEvent.change(tagsInput, { target: { value: 'tag1,tag2' } });
        expect((tagsInput as HTMLInputElement).value).toBe('tag1,tag2');

        const runOnDemandCheckbox = screen.getByRole('checkbox');
        // Initially runInBackground is true, so run on demand (which is !runInBackground) is unchecked (false)
        expect((runOnDemandCheckbox as HTMLInputElement).checked).toBe(false);

        // Clicking it should check run on demand -> runInBackground becomes false
        fireEvent.click(runOnDemandCheckbox);
        expect((runOnDemandCheckbox as HTMLInputElement).checked).toBe(true);
    });

    test('displays validation error if name is empty', () => {
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        const nameInput = screen.getByLabelText(/Instance Name/i);
        fireEvent.change(nameInput, { target: { value: '' } });

        const createButton: any = screen.getByRole('button', { name: /create instance/i });
        expect(createButton.disabled).toBe(true); // The disabled attribute should be true due to missing name
    });

    test('creates instance with Run in Background unchecked (local storage)', () => {
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        // Uncheck "Run in Background" (i.e. check "Run on demand")
        const runOnDemandCheckbox = screen.getByRole('checkbox');
        fireEvent.click(runOnDemandCheckbox);

        const createButton = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
            'Created instance custom-image-custom-12345',
            { variant: 'success' }
        );
        expect(defaultProps.onGadgetInstanceCreation).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();

        // Check localStorage
        const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('custom-image-custom-12345');
        expect(stored[0].isEmbedded).toBe(true);
    });

    test('creates instance with Run in Background checked (API call) - success', async () => {
        // Mock the success callback
        mockCreateGadgetInstance.mockImplementation((config, onSuccess, onError) => {
            onSuccess({ gadgetInstance: { id: 'new-id' } });
        });

        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        // By default, runInBackground is true
        const createButton = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        expect(mockCreateGadgetInstance).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
                'Created background instance custom-image-custom-12345',
                { variant: 'success' }
            );
        });

        expect(defaultProps.onGadgetInstanceCreation).toHaveBeenCalledWith({ gadgetInstance: { id: 'new-id' } });
        expect(defaultProps.onClose).toHaveBeenCalled();

        // Check localStorage
        const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe('new-id');
    });

    test('creates instance with Run in Background checked (API call) - error callback', async () => {
        // Mock the error callback
        mockCreateGadgetInstance.mockImplementation((config, onSuccess, onError) => {
            onError(new Error('API error'));
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        const createButton = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
                'Failed to create background instance',
                { variant: 'error' }
            );
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });



    test('getNodeNameFromResource edge cases - Node kind', () => {
        mockCreateGadgetInstance.mockImplementation((config, onSuccess, onError) => {
            onSuccess({ gadgetInstance: { id: 'new-id' } });
        });

        const resourceWithNode = {
            jsonData: {
                kind: 'Node',
                metadata: { name: 'my-node' }
            }
        };

        const propsWithNode = { ...defaultProps, resource: resourceWithNode };
        render(<GadgetBackgroundInstanceForm {...propsWithNode} />);

        const createButton = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        expect(mockCreateGadgetInstance).toHaveBeenCalled();
        const callArgs = mockCreateGadgetInstance.mock.calls[0][0];
        expect(callArgs.nodes).toEqual(['my-node']);
    });

    test('getNodeNameFromResource edge cases - Missing Resource', () => {
        mockCreateGadgetInstance.mockImplementation((config, onSuccess, onError) => {
            onSuccess({ gadgetInstance: { id: 'new-id' } });
        });

        const propsWithoutResource = { ...defaultProps, resource: null };
        render(<GadgetBackgroundInstanceForm {...propsWithoutResource} />);

        const createButton = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        expect(mockCreateGadgetInstance).toHaveBeenCalled();
        const callArgs = mockCreateGadgetInstance.mock.calls[0][0];
        expect(callArgs.nodes).toEqual(['node1']); // from nodesSelected default fallback
    });

    test('getNodeNameFromResource edge cases - Unknown Resource Kind', () => {
        mockCreateGadgetInstance.mockImplementation((config, onSuccess, onError) => {
            onSuccess({ gadgetInstance: { id: 'new-id' } });
        });

        const propsWithUnknown = { ...defaultProps, resource: { jsonData: { kind: 'Deployment' } } };
        render(<GadgetBackgroundInstanceForm {...propsWithUnknown} />);

        const createButton: any = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        const callArgs = mockCreateGadgetInstance.mock.calls[0][0];
        expect(callArgs.nodes).toEqual(['']); // Default fallback from getNodeNameFromResource
    });

    test('regenerates name if image prop changes and name was empty', () => {
        const { rerender } = render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        // Empty the name
        const nameInput = screen.getByLabelText(/Instance Name/i);
        fireEvent.change(nameInput, { target: { value: '' } });
        expect((nameInput as HTMLInputElement).value).toBe('');

        // Change image prop, should trigger useEffect and repopulate
        rerender(<GadgetBackgroundInstanceForm {...defaultProps} image="new-image" />);
        expect((nameInput as HTMLInputElement).value).toContain('new-image-custom-');
    });

    test('handles missing createGadgetInstance method', () => {
        mockUseGadgetConn.mockReturnValue({
            createGadgetInstance: undefined
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        const createButton: any = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        expect(consoleSpy).toHaveBeenCalledWith('ig.createGadgetInstance is not available');
        expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Failed to create background instance: API not available', { variant: 'error' });

        consoleSpy.mockRestore();
    });

    test('handles exceptions inside createGadgetInstance block', () => {
        mockUseGadgetConn.mockReturnValue({
            createGadgetInstance: mockCreateGadgetInstance
        });
        // Force synchronous throw
        mockCreateGadgetInstance.mockImplementationOnce(() => {
            throw new Error('Sync Error');
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        const createButton: any = screen.getByRole('button', { name: /create instance/i });
        fireEvent.click(createButton);

        expect(consoleSpy).toHaveBeenCalledWith('Error creating gadget instance:', expect.any(Error));
        expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Failed to create background instance', { variant: 'error' });

        consoleSpy.mockRestore();
    });

    test('displays validation error if name is empty (branch coverage)', () => {
        render(<GadgetBackgroundInstanceForm {...defaultProps} />);

        const nameInput = screen.getByLabelText(/Instance Name/i);
        fireEvent.change(nameInput, { target: { value: '' } });

        const createButton: any = screen.getByRole('button', { name: /create instance/i });

        // Find internal React fiber node to trigger the bound onClick directly,
        // bypassing MUI's native disabled block and testing-library's strict bounds.
        const fiberKey = Object.keys(createButton).find(key => key.startsWith('__reactFiber$'));
        let fiber = fiberKey ? createButton[fiberKey] : null;

        let originalHandler = null;
        while (fiber) {
            if (fiber.memoizedProps && typeof fiber.memoizedProps.onClick === 'function') {
                originalHandler = fiber.memoizedProps.onClick;
            }
            fiber = fiber.return;
        }

        if (originalHandler) {
            originalHandler();
        }

        expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Please fill all required fields', { variant: 'error' });
    });
});
