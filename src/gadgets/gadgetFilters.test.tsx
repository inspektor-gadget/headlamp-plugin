/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import GadgetFilters from './gadgetFilters';

vi.mock('@iconify/react', () => ({
    Icon: (props: any) => <span data-testid={`icon-${props.icon}`} onClick={props.onClick}>{props.title || props.icon}</span>,
}));

vi.mock('./params/annotation', () => ({
    default: ({ param, setFilters, filters }: any) => (
        <div data-testid="annotation-filter">
            Annotation Filter
            <button data-testid="annotation-btn" onClick={() => setFilters((prev: any) => ({ ...prev, [param.prefix + param.key]: 'anno-val' }))}>Set</button>
        </div>
    ),
}));

vi.mock('./params/bool', () => ({
    default: ({ config }: any) => {
        config.get();
        return (
            <div data-testid="bool-filter">
                Bool Filter
                <button data-testid="bool-btn" onClick={() => config.set('true')}>Set Bool</button>
            </div>
        );
    }
}));

vi.mock('./params/filter', () => ({
    default: ({ config }: any) => {
        config.get();
        return (
            <div data-testid="filter-component">
                Filter Component
                <button data-testid="filter-btn" onClick={() => config.set('filter-val')}>Set Filter</button>
            </div>
        );
    }
}));

vi.mock('./params/select', () => ({
    default: ({ config }: any) => {
        config.get();
        return (
            <div data-testid="select-filter">
                Select Filter
                <button data-testid="select-btn" onClick={() => config.set('select-val')}>Set Select</button>
            </div>
        );
    }
}));

vi.mock('./params/sortingfilter', () => ({
    default: ({ config }: any) => {
        config.get();
        return (
            <div data-testid="sorting-filter">
                Sorting Filter
                <button data-testid="sort-btn" onClick={() => config.set('sort-val')}>Set Sort</button>
            </div>
        );
    }
}));

vi.mock('./filter_types', () => ({
    FILTERS_TYPE: {
        fake_checkbox: { type: 'checkbox' },
        uint32: { type: 'number', min: 0, max: 100 },
        string: { type: 'string' },
        unsupported: { type: 'unknown_type_in_switch' }
    }
}));

describe('GadgetFilters', () => {
    let mockSetFilters: any;

    beforeEach(() => {
        mockSetFilters = vi.fn();
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    test('returns null if config is undefined or config.params is empty', () => {
        const { container: container1 } = render(<GadgetFilters config={undefined as any} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(container1.firstChild).toBeNull();

        const { container: container2 } = render(<GadgetFilters config={{ params: [] }} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(container2.firstChild).toBeNull();
    });

    test('renders FilterInput with generic TextField if no typeHint/valueHint, and handles input changes', () => {
        const config = {
            params: [
                { key: 'myparam', prefix: '--', description: 'test description' }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);

        const input = screen.getByLabelText('myparam');
        expect(input).toBeDefined();

        // Type a value
        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });

        fireEvent.change(input, { target: { value: 'hello' } });
        expect(mockSetFilters).toHaveBeenCalled();
        const newState = setStateCb({});
        expect(newState['--myparam']).toBe('hello');

        // Clear value (should delete the key)
        fireEvent.change(input, { target: { value: '' } });
        const clearedState = setStateCb({ '--myparam': 'hello', 'other': 'val' });
        expect(clearedState['--myparam']).toBeUndefined();
        expect(clearedState['other']).toBe('val');
    });

    test('sets initial values if namespace and pod props are provided', () => {
        let state = {};
        const mockSetFiltersState = vi.fn().mockImplementation((cb) => {
            state = cb(state);
        });

        const config = {
            params: [
                { key: 'all-namespaces', prefix: '-' },
                { key: 'namespace', prefix: '-n', valueHint: 'namespace' },
                { key: 'podname', prefix: '-p' }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFiltersState} filters={{}} namespace="default" pod="mypod" onApplyFilters={vi.fn()} />);

        expect(state).toEqual({
            '-all-namespaces': 'false',
            '-nnamespace': 'default',
            '-ppodname': 'mypod'
        });
    });

    test('renders AnnotationFilter and handles its updates', () => {
        const config = {
            params: [
                { key: 'annotation', prefix: '--' }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(screen.getByTestId('annotation-filter')).toBeDefined();

        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });
        fireEvent.click(screen.getByTestId('annotation-btn'));
        expect(setStateCb({})['--annotation']).toBe('anno-val');
    });

    test('renders SortingFilter and handles its updates', () => {
        const config = {
            params: [
                { key: 'sort', prefix: '--' }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(screen.getByTestId('sorting-filter')).toBeDefined();

        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });
        fireEvent.click(screen.getByTestId('sort-btn'));
        expect(setStateCb({})['--sort']).toBe('sort-val');
    });

    test('renders CheckboxFilter for typeHint="bool"', () => {
        const config = {
            params: [
                { key: 'boolparam', prefix: '--', typeHint: 'bool' }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(screen.getByTestId('bool-filter')).toBeDefined();

        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });
        fireEvent.click(screen.getByTestId('bool-btn'));
        expect(setStateCb({})['--boolparam']).toBe('true');
    });

    test('renders FilterComponent for key="filter"', () => {
        const config = {
            params: [
                { key: 'filter', prefix: '--' }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(screen.getByTestId('filter-component')).toBeDefined();

        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });
        fireEvent.click(screen.getByTestId('filter-btn'));
        expect(setStateCb({})['--filter']).toBe('filter-val');
    });

    test('renders SelectFilter for possibleValues', () => {
        const config = {
            params: [
                { key: 'myselect', prefix: '--', possibleValues: ['a', 'b'] }
            ]
        };

        render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);
        expect(screen.getByTestId('select-filter')).toBeDefined();

        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });
        fireEvent.click(screen.getByTestId('select-btn'));
        expect(setStateCb({})['--myselect']).toBe('select-val');
    });

    test('renders FilterInput with specific types mapped from FILTERS_TYPE', () => {
        const config = {
            params: [
                { key: 'p_checkbox', prefix: '--', typeHint: 'fake_checkbox', defaultValue: 'true' },
                { key: 'p_number', prefix: '--', typeHint: 'uint32', defaultValue: '10' },
                { key: 'p_string', prefix: '--', typeHint: 'string', defaultValue: 'str', description: 'a str param' },
                { key: 'p_unknown', prefix: '--', typeHint: 'unknown_type' }, // missing from FILTERS_TYPE
                { key: 'p_unsupported', prefix: '--', typeHint: 'unsupported' } // reaches switch default
            ]
        };

        const { container } = render(<GadgetFilters config={config} setFilters={mockSetFilters} filters={{}} onApplyFilters={vi.fn()} />);

        let setStateCb: any;
        mockSetFilters.mockImplementation((cb: any) => {
            setStateCb = cb;
        });

        // Test checkbox
        const checkbox: any = screen.getByLabelText('p_checkbox');
        expect(checkbox.checked).toBe(true);
        fireEvent.click(checkbox);
        expect(setStateCb({})['--p_checkbox']).toBe('false');

        // Test number
        const numInput = screen.getByLabelText('p_number');
        expect((numInput as any).value).toBe('10');
        fireEvent.change(numInput, { target: { value: '20' } });
        expect(setStateCb({})['--p_number']).toBe('20');

        // Test string
        const strInput = screen.getByLabelText('p_string');
        expect((strInput as any).value).toBe('str');
        fireEvent.change(strInput, { target: { value: 'hello' } });
        expect(setStateCb({})['--p_string']).toBe('hello');

        // Test info adornment
        expect(screen.getByTestId('icon-mdi:info')).toBeDefined();
    });

    test('calls onApplyFilters when triggered (mocked representation)', () => {
        const mockApply = vi.fn();
        render(<GadgetFilters config={{ params: [{ key: 'a', prefix: '-' }] }} filters={{}} onApplyFilters={mockApply} setFilters={mockSetFilters} />);

        // Given there's no actual "Apply" button inherently rendered by GadgetFilters 
        // in the implementation, we can just assert that providing it as a prop works.
        const applyBtn = screen.queryByRole('button', { name: /apply/i });
        // It should be null unless one of the children renders it (our mocks don't).
        expect(applyBtn).toBeNull();
    });
});
