import { useState } from 'react';
import { createContext } from 'react';
import { HEADLAMP_KEY, HEADLAMP_METRIC_UNIT, HEADLAMP_VALUE, IS_METRIC } from '../helpers';

// Create a context for sharing gadget-related state
export const GadgetContext = createContext(null);

// Custom hook to manage gadget state
export function useGadgetState() {
  const [podsSelected, setPodsSelected] = useState([]);
  const [gadgetData, setGadgetData] = useState({});
  const [gadgetRunningStatus, setGadgetRunningStatus] = useState(false);
  const [dataColumns, setDataColumns] = useState({});
  const [gadgetConfig, setGadgetConfig] = useState(null);
  const [filters, setFilters] = useState({});
  const [podStreamsConnected, setPodStreamsConnected] = useState(0);
  const [dataSources, setDataSources] = useState([]);
  const [bufferedGadgetData, setBufferedGadgetData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isGadgetInfoFetched, setIsGadgetInfoFetched] = useState(false);
  const [open, setOpen] = useState(true);
  const [nodesSelected, setNodesSelected] = useState([]);
  const [gadgetConn, setGadgetConn] = useState(null);
  const [isRunningInBackground, setIsRunningInBackground] = useState(false);
  const [dynamicTabs, setDynamicTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Method to add a new dynamic tab
  const addDynamicTab = row => {
    // Check if tab with this ID already exists
    const existingTabIndex = dynamicTabs.findIndex(tab => tab.id === row.id);

    if (existingTabIndex === -1) {
      // Add new tab if it doesn't exist
      setDynamicTabs(prevTabs => [
        ...prevTabs,
        {
          id: row.id,
          label: row.id,
          content: row,
        },
      ]);
      // Set the newly added tab as active
      setActiveTabIndex(dynamicTabs.length);
    } else {
      // If tab exists, just set it as active
      setActiveTabIndex(existingTabIndex + 2); // +2 to account for initial two tabs
    }
  };

  // Method to remove a dynamic tab
  const removeDynamicTab = indexToRemove => {
    setDynamicTabs(prevTabs => prevTabs.filter((_, index) => index !== indexToRemove));
    // Adjust active tab if needed
    setActiveTabIndex(prev =>
      prev > indexToRemove + 2 ? prev - 1 : prev === indexToRemove + 2 ? 1 : prev
    );
  };

  const prepareGadgetInfo = info => {
    setIsGadgetInfoFetched(true);
    const fields = {};
    info.dataSources.forEach((dataSource, index) => {
      const annotations = dataSource.annotations;
      const isMetricAnnotationAvailable =
        annotations &&
        Object.keys(annotations).find(
          annotationKey =>
            annotationKey === 'metrics.print' && annotations[annotationKey] === 'true'
        );

      if (isMetricAnnotationAvailable) {
        const fieldsFromDataSource = dataSource.fields
          .filter(field => (field.flags & 4) === 0)
          .map(field => field.fullName)
          .filter(field => field !== 'k8s');

        const key = dataSource.fields.find(field => field.tags.includes('role:key'))?.fullName;
        const value = dataSource.fields.find(field => !field.tags.includes('role:key'));
        const metricUnit = value.annotations['metrics.unit'];
        fieldsFromDataSource.push(`${HEADLAMP_KEY}_${key}`);
        fieldsFromDataSource.push(`${HEADLAMP_VALUE}_${value?.fullName}`);
        fieldsFromDataSource.push(`${HEADLAMP_METRIC_UNIT}_${metricUnit}`);
        fieldsFromDataSource.push(IS_METRIC);
        fields[dataSource.id || index] = fieldsFromDataSource;
      } else {
        fields[dataSource.id || index] = dataSource.fields
          .filter(field => (field.flags & 4) === 0)
          .map(field => field.fullName)
          .filter(field => field !== 'k8s');
      }
    });

    setGadgetConfig(info);
    setDataSources(info.dataSources);
    setDataColumns({ ...fields });
  };

  return {
    podsSelected,
    setPodsSelected,
    gadgetData,
    setGadgetData,
    gadgetRunningStatus,
    setGadgetRunningStatus,
    dataColumns,
    setDataColumns,
    gadgetConfig,
    setGadgetConfig,
    filters,
    setFilters,
    podStreamsConnected,
    setPodStreamsConnected,
    dataSources,
    setDataSources,
    bufferedGadgetData,
    setBufferedGadgetData,
    loading,
    setLoading,
    isGadgetInfoFetched,
    setIsGadgetInfoFetched,
    open,
    setOpen,
    nodesSelected,
    setNodesSelected,
    gadgetConn,
    setGadgetConn,
    isRunningInBackground,
    setIsRunningInBackground,
    prepareGadgetInfo,
    dynamicTabs,
    setDynamicTabs,
    activeTabIndex,
    setActiveTabIndex,
    addDynamicTab,
    removeDynamicTab,
  };
}
