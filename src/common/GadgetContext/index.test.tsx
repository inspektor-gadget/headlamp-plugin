import { renderHook, act } from '@testing-library/react';
import { useGadgetState } from './index';
import { describe, it, expect } from 'vitest';
import { HEADLAMP_KEY, HEADLAMP_METRIC_UNIT, HEADLAMP_VALUE, IS_METRIC } from '../helpers';

describe('GadgetContext', () => {
    describe('useGadgetState', () => {
        it('should return initial state', () => {
            const { result } = renderHook(() => useGadgetState());

            expect(result.current.podsSelected).toEqual([]);
            expect(result.current.gadgetData).toEqual({});
            expect(result.current.gadgetRunningStatus).toBe(false);
            expect(result.current.dataColumns).toEqual({});
            expect(result.current.gadgetConfig).toBeNull();
            expect(result.current.filters).toEqual({});
            expect(result.current.podStreamsConnected).toBe(0);
            expect(result.current.dataSources).toEqual([]);
            expect(result.current.bufferedGadgetData).toEqual({});
            expect(result.current.loading).toBe(false);
            expect(result.current.isGadgetInfoFetched).toBe(false);
            expect(result.current.open).toBe(true);
            expect(result.current.nodesSelected).toEqual([]);
            expect(result.current.gadgetConn).toBeNull();
            expect(result.current.isRunningInBackground).toBe(false);
            expect(result.current.dynamicTabs).toEqual([]);
            expect(result.current.activeTabIndex).toBe(0);
        });

        describe('dynamicTabs', () => {
            it('should add a new dynamic tab', () => {
                const { result } = renderHook(() => useGadgetState());
                const initialTabCount = result.current.dynamicTabs.length;

                const newTab = { id: 'tab1', someData: 'data' };

                act(() => {
                    result.current.addDynamicTab(newTab);
                });

                expect(result.current.dynamicTabs).toHaveLength(initialTabCount + 1);
                expect(result.current.dynamicTabs[0].id).toBe('tab1');
                expect(result.current.activeTabIndex).toBe(2);
            });

            it('should remove a dynamic tab', () => {
                const { result } = renderHook(() => useGadgetState());
                const tab1 = { id: 'tab1' };
                const tab2 = { id: 'tab2' };

                act(() => {
                    result.current.addDynamicTab(tab1);
                });
                act(() => {
                    result.current.addDynamicTab(tab2);
                });

                expect(result.current.dynamicTabs).toHaveLength(2);
                expect(result.current.activeTabIndex).toBe(3);

                act(() => {
                    result.current.removeDynamicTab(0); // Remove tab1
                });

                expect(result.current.dynamicTabs).toHaveLength(1);
                expect(result.current.dynamicTabs[0].id).toBe('tab2');
                expect(result.current.activeTabIndex).toBe(2);
            });

            it('should set active tab to default when active tab is removed', () => {
                const { result } = renderHook(() => useGadgetState());
                const tab1 = { id: 'tab1' };

                act(() => {
                    result.current.addDynamicTab(tab1);
                });

                expect(result.current.activeTabIndex).toBe(2);

                act(() => {
                    result.current.removeDynamicTab(0); // Remove tab1 (active)
                });

                expect(result.current.dynamicTabs).toHaveLength(0);
                expect(result.current.activeTabIndex).toBe(1); // Should reset to default tab
            });

            it('should not change active tab when a tab to the right is removed', () => {
                const { result } = renderHook(() => useGadgetState());
                const tab1 = { id: 'tab1' };
                const tab2 = { id: 'tab2' };

                act(() => {
                    result.current.addDynamicTab(tab1);
                });
                act(() => {
                    result.current.addDynamicTab(tab2);
                });

                // Set active tab to tab1 (index 2)
                act(() => {
                    result.current.setActiveTabIndex(2);
                    // Wait, we need to properly set it if it changed.
                    // But adding tab2 sets it to 3 automatically.
                    // Let's explicitly set it back to 2 (tab1).
                });
                // Actually addDynamicTab sets valid index.
                // addDynamicTab(tab1) -> index 2.
                // addDynamicTab(tab2) -> index 3.
                // We want to be at index 2 (tab1) and remove index 1 (tab2).

                act(() => {
                    result.current.setActiveTabIndex(2);
                });

                expect(result.current.activeTabIndex).toBe(2);

                act(() => {
                    result.current.removeDynamicTab(1); // Remove tab2 (which is at index 1 in dynamicTabs array, but corresponds to tab index 3 in view)
                });

                expect(result.current.dynamicTabs).toHaveLength(1);
                expect(result.current.dynamicTabs[0].id).toBe('tab1');
                expect(result.current.activeTabIndex).toBe(2); // Should remain 2
            });

            it('should not duplicate tab with same ID and set it as active', () => {
                const { result } = renderHook(() => useGadgetState());
                const tab1 = { id: 'tab1' };

                act(() => {
                    result.current.addDynamicTab(tab1);
                });

                expect(result.current.dynamicTabs).toHaveLength(1);
                expect(result.current.activeTabIndex).toBe(2);

                act(() => {
                    result.current.addDynamicTab(tab1);
                });

                expect(result.current.dynamicTabs).toHaveLength(1);
                expect(result.current.activeTabIndex).toBe(2);
            });
        });

        describe('prepareGadgetInfo', () => {
            it('should parse non-metric gadget info correctly', () => {
                const { result } = renderHook(() => useGadgetState());

                const mockInfo = {
                    dataSources: [
                        {
                            id: 'ds1',
                            fields: [
                                { fullName: 'field1', flags: 0 },
                                { fullName: 'k8s', flags: 0 }, // Should be filtered out
                                { fullName: 'hidden', flags: 4 } // Should be filtered out
                            ]
                        }
                    ]
                };

                act(() => {
                    result.current.prepareGadgetInfo(mockInfo);
                });

                expect(result.current.isGadgetInfoFetched).toBe(true);
                expect(result.current.gadgetConfig).toBe(mockInfo);
                expect(result.current.dataSources).toBe(mockInfo.dataSources);

                // Check dataColumns
                expect(result.current.dataColumns).toHaveProperty('ds1');
                expect(result.current.dataColumns['ds1']).toContain('field1');
                expect(result.current.dataColumns['ds1']).not.toContain('k8s');
                expect(result.current.dataColumns['ds1']).not.toContain('hidden');
            });

            it('should parse metric gadget info correctly', () => {
                const { result } = renderHook(() => useGadgetState());

                const mockInfo = {
                    dataSources: [
                        {
                            id: 'ds_metric',
                            annotations: {
                                'metrics.print': 'true'
                            },
                            fields: [
                                { fullName: 'keyField', tags: ['role:key'], flags: 0 },
                                { fullName: 'valueField', tags: [], annotations: { 'metrics.unit': 'bytes' }, flags: 0 }
                            ]
                        }
                    ]
                };

                act(() => {
                    result.current.prepareGadgetInfo(mockInfo);
                });

                const columns = result.current.dataColumns['ds_metric'];
                expect(columns).toContain('keyField');
                expect(columns).toContain(`${HEADLAMP_KEY}_keyField`);
                expect(columns).toContain(`${HEADLAMP_VALUE}_valueField`);
                expect(columns).toContain(`${HEADLAMP_METRIC_UNIT}_bytes`);
                expect(columns).toContain(IS_METRIC);
            });

            it('should use index as key when dataSource ID is missing', () => {
                const { result } = renderHook(() => useGadgetState());

                const mockInfo = {
                    dataSources: [
                        {
                            // No ID provided
                            fields: [{ fullName: 'field1', flags: 0 }]
                        }
                    ]
                };

                act(() => {
                    result.current.prepareGadgetInfo(mockInfo);
                });

                // Check that index '0' is used as key
                expect(result.current.isGadgetInfoFetched).toBe(true);
                expect(result.current.dataColumns).toHaveProperty('0');
                expect(result.current.dataColumns['0']).toContain('field1');
            });

            it('should use index as key when metric dataSource ID is missing', () => {
                const { result } = renderHook(() => useGadgetState());

                const mockInfo = {
                    dataSources: [
                        {
                            // No ID provided, but IS metric
                            annotations: {
                                'metrics.print': 'true'
                            },
                            fields: [
                                { fullName: 'keyField', tags: ['role:key'], flags: 0 },
                                { fullName: 'valueField', tags: [], annotations: { 'metrics.unit': 'bytes' }, flags: 0 }
                            ]
                        }
                    ]
                };

                act(() => {
                    result.current.prepareGadgetInfo(mockInfo);
                });

                // Check that index '0' is used as key for metric data
                expect(result.current.dataColumns).toHaveProperty('0');
                const columns = result.current.dataColumns['0'];
                expect(columns).toContain('keyField');
                expect(columns).toContain(`${HEADLAMP_KEY}_keyField`);
                expect(columns).toContain(IS_METRIC);
            });
        });
    });
});
