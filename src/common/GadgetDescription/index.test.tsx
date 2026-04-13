import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GadgetDescription } from './index';
import { GadgetContext } from '../GadgetContext';

const mockUseParams = vi.fn();
vi.mock('react-router', () => ({
    useParams: () => mockUseParams(),
}));

describe('GadgetDescription', () => {
    const defaultProps = {
        setEmbedView: vi.fn(),
        embedView: 'None',
        enableHistoricalData: true,
        setEnableHistoricalData: vi.fn(),
        update: 0,
    };

    const MockProvider = ({ children, value = {} }) => (
        <GadgetContext.Provider value={{ gadgetRunningStatus: false, ...value }}>
            {children}
        </GadgetContext.Provider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockUseParams.mockReturnValue({ imageName: 'test-image', id: 'gadget-id-1' });

        const initialInstances = [
            { id: 'gadget-id-1', name: 'Test Gadget', kind: 'None', isHeadless: true },
        ];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(initialInstances));
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should render gadget details', () => {
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        expect(screen.getByText('Test Gadget')).toBeInTheDocument();
        expect(screen.getByText('test-image')).toBeInTheDocument();
        expect(screen.getByText('gadget-id-1')).toBeInTheDocument();
    });

    it('should show loading state when instance is not found', () => {
        localStorage.clear();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );
        expect(screen.getByText('Loading gadget details...')).toBeInTheDocument();
    });

    it('should allow editing the gadget name', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const editButton = await screen.findByRole('button', { name: /edit name/i });
        await user.click(editButton);

        const input = screen.getByPlaceholderText('Enter gadget name');
        expect(input).toBeInTheDocument();
        await user.clear(input);
        await user.type(input, 'New Gadget Name');

        expect(input).toHaveValue('New Gadget Name');
    });

    it('should save edited name to local storage', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const editButton = await screen.findByRole('button', { name: /edit name/i });
        await user.click(editButton);

        const input = screen.getByPlaceholderText('Enter gadget name');
        await user.clear(input);
        await user.type(input, 'Updated Name');

        const activeButtons = screen.getAllByRole('button');
        const saveAction = activeButtons[0];
        await user.click(saveAction);

        expect(await screen.findByText('Updated Name')).toBeInTheDocument();

        const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        expect(stored[0].name).toBe('Updated Name');
    });

    it('should cancel editing when cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const editButton = await screen.findByRole('button', { name: /edit name/i });
        await user.click(editButton);

        const input = screen.getByPlaceholderText('Enter gadget name');
        await user.clear(input);
        await user.type(input, 'Cancelled Name');

        const activeButtons = screen.getAllByRole('button');
        // The second button is Cancel (Close icon)
        const cancelAction = activeButtons[1];
        await user.click(cancelAction);

        expect(screen.getByText('Test Gadget')).toBeInTheDocument();
        expect(screen.queryByText('Cancelled Name')).not.toBeInTheDocument();
    });

    it('should prevent saving an empty name', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const editButton = await screen.findByRole('button', { name: /edit name/i });
        await user.click(editButton);

        const input = screen.getByPlaceholderText('Enter gadget name');
        await user.clear(input); // empty string

        const activeButtons = screen.getAllByRole('button');
        const saveAction = activeButtons[0];
        await user.click(saveAction);

        // Edit mode should persist (input still visible)
        expect(screen.getByPlaceholderText('Enter gadget name')).toBeInTheDocument();

        // Value shouldn't be saved
        const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        expect(stored[0].name).toBe('Test Gadget');
    });

    it('should handle Embed Type change', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const selectTrigger = screen.getByRole('combobox');
        await user.click(selectTrigger);

        const optionPod = await screen.findByRole('option', { name: 'Pod' });
        await user.click(optionPod);

        expect(defaultProps.setEmbedView).toHaveBeenCalledWith('Pod');

        const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        expect(stored[0].kind).toBe('Pod');
        expect(stored[0].isEmbedded).toBe(true);
    });

    it('should handle Embed Type change to None', async () => {
        // Setup with an initially embedded gadget
        const initialInstances = [
            { id: 'gadget-id-1', name: 'Test Gadget', kind: 'Pod', isEmbedded: true, isHeadless: true },
        ];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(initialInstances));

        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} embedView="Pod" />
            </MockProvider>
        );

        const selectTrigger = screen.getByRole('combobox');
        await user.click(selectTrigger);

        const optionNone = await screen.findByRole('option', { name: 'None' });
        await user.click(optionNone);

        const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        expect(stored[0].kind).toBe('None');
        expect(stored[0].isEmbedded).toBe(false);
    });

    it('should handle Run on demand switch', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const switchControl = screen.getByRole('checkbox', { name: /Run on demand/i });
        await user.click(switchControl);

        expect(defaultProps.setEnableHistoricalData).toHaveBeenCalledWith(false);
    });

    it('should disable Run on demand switch when gadget is running', () => {
        render(
            <MockProvider value={{ gadgetRunningStatus: true }}>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const switchControl = screen.getByRole('checkbox', { name: /Run on demand/i });
        expect(switchControl).toBeDisabled();
    });

    it('should default Run on demand (historical data) to true if isHeadless is undefined', () => {
        const initialInstances = [
            { id: 'gadget-id-1', name: 'Test Gadget', kind: 'None' }, // isHeadless missing
        ];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(initialInstances));

        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        expect(defaultProps.setEnableHistoricalData).toHaveBeenCalledWith(true);
    });

    it('should handle saving name gracefully if local storage is cleared unexpectedly', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        const editButton = await screen.findByRole('button', { name: /edit name/i });
        await user.click(editButton);

        const input = screen.getByPlaceholderText('Enter gadget name');
        await user.clear(input);
        await user.type(input, 'New Name');

        // Clear storage to trigger the || '[]' branch in saveEditedName
        localStorage.clear();

        const saveButton = screen.getAllByRole('button')[0]; // First button is save checkmark
        await user.click(saveButton);

        expect(input).toBeInTheDocument();
    });

    it('should handle Embed Type change gracefully if local storage is cleared unexpectedly', async () => {
        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        // Clear storage to trigger the || '[]' branch in onChange
        localStorage.clear();

        const selectTrigger = screen.getByRole('combobox');
        await user.click(selectTrigger);

        const optionPod = await screen.findByRole('option', { name: 'Pod' });
        await user.click(optionPod);

        // Should update UI state (setEmbedView is called)
        expect(defaultProps.setEmbedView).toHaveBeenCalledWith('Pod');

        // But local storage should remain empty/unchanged (no crash)
        expect(localStorage.getItem('headlamp_embeded_resources')).toBeNull();
    });

    it('should handle missing "id" parameter gracefully', () => {
        // Mock useParams to return empty id
        mockUseParams.mockReturnValue({ imageName: 'test-image', id: undefined });

        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        expect(defaultProps.setEnableHistoricalData).not.toHaveBeenCalled();
    });

    it('should default "kind" to "None" if missing in instance', () => {
        const initialInstances = [
            { id: 'gadget-id-1', name: 'Test Gadget' }, // kind is missing
        ];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(initialInstances));

        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        expect(defaultProps.setEmbedView).toHaveBeenCalledWith('None');
    });

    it('should use empty string if name is missing when cancelling edit', async () => {

        const initialInstances = [
            { id: 'gadget-id-1', name: '' },
        ];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(initialInstances));

        const user = userEvent.setup();
        render(
            <MockProvider>
                <GadgetDescription {...defaultProps} />
            </MockProvider>
        );

        // Start editing
        const editButton = await screen.findByRole('button', { name: /edit name/i });
        await user.click(editButton);

        const input = screen.getByPlaceholderText('Enter gadget name');
        await user.type(input, 'New Name');

        // Cancel
        const buttons = screen.getAllByRole('button');
        const cancelButton = buttons[1];
        await user.click(cancelButton);

        expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();

    });
});
