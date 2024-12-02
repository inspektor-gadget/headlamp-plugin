import './wasm.js';
import { Icon } from '@iconify/react';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, IconButton, Tab, Tabs } from '@mui/material';
import _ from 'lodash';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { GadgetWithDataSource } from '../common/GadgetWithDataSource';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { HEADLAMP_KEY, HEADLAMP_VALUE, IS_METRIC } from '../common/helpers';
import { NodeSelection } from '../common/NodeSelection';
import { BackgroundRunning } from './backgroundgadgets';
import { GadgetConnectionForBackgroundRunningProcess } from './conn';

// Create a context for sharing gadget-related state
const GadgetContext = createContext(null);

// Custom hook to manage gadget state
function useGadgetState() {
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
        const value = dataSource.fields.find(field => !field.tags.includes('role:key'))?.fullName;

        fieldsFromDataSource.push(`${HEADLAMP_KEY}_${key}`);
        fieldsFromDataSource.push(`${HEADLAMP_VALUE}_${value}`);
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

function prepareGadgetInstance(version, instance, imageName) {
  if (_.isEmpty(version) || _.isEmpty(instance) || _.isEmpty(imageName)) {
    return null;
  }
  return {
    id: instance,
    gadgetConfig: {
      imageName,
      version,
    },
  };
}

function GadgetRendererWithTabs() {
  let { version, instance, imageName } = useParams<{
    version: string;
    instance: string;
    imageName: string;
  }>();
  imageName = decodeURIComponent(imageName);
  const gadgetState = useGadgetState();
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();

  const gadgetInstance = prepareGadgetInstance(version, instance, imageName);

  const { dynamicTabs, activeTabIndex, setActiveTabIndex, addDynamicTab, removeDynamicTab } =
    gadgetState;

  const handleTabChange = (event, newValue) => {
    setActiveTabIndex(newValue);
    // reset gadget data on tab change
    console.log('resetting gadget data');
    gadgetState.setGadgetData({});
    gadgetState.setBufferedGadgetData({});
  };

  if (gadgetInstance) {
    return (
      <GadgetContext.Provider value={{ ...gadgetState, gadgetInstance }}>
        <GadgetRenderer nodes={nodes} pods={pods} onGadgetInstanceCreation={() => {}} />
      </GadgetContext.Provider>
    );
  }

  return (
    <GadgetContext.Provider value={{ ...gadgetState, gadgetInstance }}>
      <SectionBox>
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <Tabs
            value={activeTabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Create" />
            <Tab label="Running Instances" />
            {dynamicTabs.map((tab, index) => (
              <Tab
                key={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {tab.label}
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        removeDynamicTab(index);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <Icon icon="mdi:close" />
                    </IconButton>
                  </Box>
                }
              />
            ))}
          </Tabs>

          {activeTabIndex === 0 && (
            <GadgetRenderer
              nodes={nodes}
              pods={pods}
              onGadgetInstanceCreation={function (success) {
                addDynamicTab(success.gadgetInstance);
                setActiveTabIndex(dynamicTabs.length + 2);
              }}
              onInstanceDelete={() => {}}
            />
          )}
          {activeTabIndex === 1 && (
            <Box mt={2}>
              <BackgroundRunning
                imageName={imageName}
                callback={row => {
                  addDynamicTab(row);
                  setActiveTabIndex(dynamicTabs.length + 2);
                }}
                hideTitle
              />
            </Box>
          )}
          {dynamicTabs.map(
            (tab, index) =>
              activeTabIndex === index + 2 && (
                <Box key={tab.id} p={3}>
                  <GadgetRenderer
                    nodes={nodes}
                    pods={pods}
                    instance={{
                      id: tab.id,
                      gadgetConfig: {
                        ...tab.content.gadgetConfig,
                      },
                    }}
                    onGadgetInstanceCreation={() => {}}
                    onInstanceDelete={gadgetInstance => {
                      // get index of this tab and remove it
                      const index = dynamicTabs.findIndex(tab => tab.id === gadgetInstance.id);
                      removeDynamicTab(index);
                      setActiveTabIndex(1);
                    }}
                  />
                </Box>
              )
          )}
        </Box>
      </SectionBox>
    </GadgetContext.Provider>
  );
}

function GadgetRenderer({
  nodes,
  pods,
  instance = null,
  onGadgetInstanceCreation,
  onInstanceDelete,
}) {
  const {
    podsSelected,
    setPodsSelected,
    podStreamsConnected,
    setPodStreamsConnected,
    isGadgetInfoFetched,
    setIsGadgetInfoFetched,
    open,
    setOpen,
    nodesSelected,
    setNodesSelected,
    dataSources,
    prepareGadgetInfo,
    gadgetInstance,
    dataColumns,
    gadgetConn,
    setGadgetConn,
    ...otherState
  } = useContext(GadgetContext);
  console.log('on gadgetInstance creation', onGadgetInstanceCreation);
  useEffect(() => {
    otherState.setGadgetRunningStatus(false);
    if (podStreamsConnected > podsSelected.length) {
      setPodStreamsConnected(podsSelected.length);
    }
  }, [podsSelected]);

  return (
    <>
      {nodes && pods && (
        <GadgetConnectionForBackgroundRunningProcess
          nodes={nodes}
          pods={pods}
          callback={setGadgetConn}
          prepareGadgetInfo={prepareGadgetInfo}
          setIsGadgetInfoFetched={setIsGadgetInfoFetched}
        />
      )}
      <NodeSelection
        setPodsSelected={setPodsSelected}
        open={open}
        setOpen={setOpen}
        nodesSelected={nodesSelected}
        setNodesSelected={setNodesSelected}
        setPodStreamsConnected={setPodStreamsConnected}
        gadgetConn={gadgetConn}
        gadgetInstance={gadgetInstance || instance}
        onInstanceDelete={onInstanceDelete}
      />
      {!isGadgetInfoFetched && (
        <Box mt={2}>
          <Loader title="gadget info loading" />
        </Box>
      )}
      {podsSelected.map(podSelected => (
        <GenericGadgetRenderer
          {...otherState}
          gadgetInstance={gadgetInstance || instance}
          podsSelected={podsSelected}
          node={podSelected?.spec.nodeName}
          podSelected={podSelected?.jsonData.metadata.name}
          dataColumns={dataColumns}
          podStreamsConnected={podStreamsConnected}
          setPodStreamsConnected={setPodStreamsConnected}
        />
      ))}
      {dataSources.map((dataSource, index) => {
        const dataSourceID = dataSource?.id || index;
        return (
          <GadgetWithDataSource
            {...otherState}
            podsSelected={podsSelected}
            podStreamsConnected={podStreamsConnected}
            dataSourceID={dataSourceID}
            columns={dataColumns[dataSourceID]}
            gadgetInstance={gadgetInstance || instance}
            gadgetConn={gadgetConn}
            onGadgetInstanceCreation={onGadgetInstanceCreation}
          />
        );
      })}
    </>
  );
}

export default function Gadget() {
  return <GadgetRendererWithTabs />;
}
