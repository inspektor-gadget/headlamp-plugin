import './wasm.js';
import { Icon } from '@iconify/react';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, IconButton, Tab, Tabs, Modal, Paper, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { GadgetDescription } from '../common/GadgetDescription';
import { GadgetWithDataSource } from '../common/GadgetWithDataSource';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { prepareGadgetInstance } from '../common/helpers';
import { NodeSelection } from '../common/NodeSelection';
import { BackgroundRunning } from './backgroundgadgets';
import {  useGadgetConn } from './conn';
import { GadgetCardEmbedWrapper, GadgetGrid } from './gadgetGrid';
import { fetchInspektorGadgetFromArtifactHub } from '../api/artifacthub';

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
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const gadgetInstance = prepareGadgetInstance(version, instance, imageName);
  const [gadgets, setGadgets] = useState([]);
  const [selectedGadget, setSelectedGadget] = useState(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);

  useEffect(() => {
    fetchInspektorGadgetFromArtifactHub().then(data => setGadgets([...data])); // Wrap single item in array if needed
  }, []);

  const { dynamicTabs, activeTabIndex, setActiveTabIndex, addDynamicTab, removeDynamicTab } =
    gadgetState;
    
  // Ensure we default to the "Running Instances" tab (index 0) when there are no dynamic tabs
  useEffect(() => {
    if (dynamicTabs.length === 0 && activeTabIndex > 0) {
      setActiveTabIndex(0);
    }
  }, [dynamicTabs, activeTabIndex, setActiveTabIndex]);

  const handleTabChange = (event, newValue) => {
    setActiveTabIndex(newValue);
    gadgetState.setIsGadgetInfoFetched(false);
    // reset gadget data on tab change
    gadgetState.setGadgetData({});
    gadgetState.setBufferedGadgetData({});
  };

  const handleRemoveTab = (index) => {
    removeDynamicTab(index);
    
    // If we're removing the currently active tab,
    // we need to set activeTabIndex to a valid tab
    if (activeTabIndex === index + 1) {
      // If there are tabs to the left, go there
      if (index > 0) {
        setActiveTabIndex(index);
      } else if (dynamicTabs.length > 1) {
        // If there are tabs to the right, go there
        setActiveTabIndex(1);
      } else {
        // Otherwise go to "Running Instances" tab
        setActiveTabIndex(0);
      }
    } else if (activeTabIndex > index + 1) {
      // If the removed tab is to the left of active tab,
      // we need to adjust the active index
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  if (gadgetInstance) {
    return (
      <GadgetContext.Provider value={{ ...gadgetState, gadgetInstance }}>
        <GadgetRenderer nodes={nodes} pods={pods} onGadgetInstanceCreation={() => {}} imageName={''} />
      </GadgetContext.Provider>
    );
  }

  return (
    <GadgetContext.Provider value={{ ...gadgetState, gadgetInstance }}>
      <SectionBox title={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
          <Typography variant="h5" sx={{ ml: 4 }}>
            Gadgets
          </Typography>
          </Box>
          <Box>
          <IconButton
            size="medium"
            onClick={() => setOpenConfirmDialog(true)}
            sx={{ ml: 0.2 }}
          >
            <Icon icon="mdi:plus" />
          </IconButton>
          </Box>
        </Box>
      }>
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <GadgetDescription
            onInstanceDelete={gadgetInstance => {
              // get index of this tab and remove it
              const index = dynamicTabs.findIndex(tab => tab.id === gadgetInstance.id);
              if (index !== -1) {
                handleRemoveTab(index);
              }
            }}
            instance={
              // its there if the dynamic tab is loaded on screen
              activeTabIndex > 0 && activeTabIndex <= dynamicTabs.length 
                ? dynamicTabs[activeTabIndex - 1] 
                : null
            }
          />
          <Box mb={1}>
            <Tabs
              value={activeTabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Embedded Gadgets" />
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
                          handleRemoveTab(index);
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
          </Box>

          {activeTabIndex === 0 && (
            <Box mt={2}>
              <Modal 
                open={openConfirmDialog} 
                onClose={() => setOpenConfirmDialog(false)}
              >
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '95%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    overflow: 'hidden', // Change to hidden to prevent double scrollbars
                    p: 3,  // Add padding for the content
                    borderRadius: 1, // Optional: add rounded corners
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      Add Gadget
                    </Typography>
                    <IconButton onClick={() => setOpenConfirmDialog(false)} size="small">
                      <Icon icon="mdi:close" />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                    <GadgetGrid 
                      gadgets={gadgets} 
                      enableEmbed={true} 
                      onViewSelect={() => {
                        // setOpen(true);
                      }}
                      callbackRunGadget={(row) => {
                        // if this row.id exist in dynamicTabs, then setActiveTabIndex to that index
                        const index = dynamicTabs.findIndex(tab => tab.id === row.id);
                        if (index !== -1) {
                          setActiveTabIndex(index + 1);
                          return;
                        }
                        addDynamicTab(row);
                        setActiveTabIndex(dynamicTabs.length + 1);
                        setOpenConfirmDialog(false);
                      }}
                      onEmbedClick={(row) => {
                        setSelectedGadget(row);
                        setEmbedDialogOpen(true);
                      }}
                    />
                    {embedDialogOpen && <GadgetCardEmbedWrapper gadget={selectedGadget} embedDialogOpen={embedDialogOpen} onClose={() => setEmbedDialogOpen(false)} />}
  
                  </Box>
                </Paper>
              </Modal>
              <BackgroundRunning
                imageName={imageName}
                embedDialogOpen={embedDialogOpen}
                callback={row => {
                  // if this row.id exist in dynamicTabs, then setActiveTabIndex to that index
                  const index = dynamicTabs.findIndex(tab => tab.id === row.id);
                  if (index !== -1) {
                    setActiveTabIndex(index + 1);
                    return;
                  }
                  addDynamicTab(row);
                  setActiveTabIndex(dynamicTabs.length + 1);
                }}
                hideTitle
                callbackAddGadget={() => setOpenConfirmDialog(true)}
              />
            </Box>
          )}
          {dynamicTabs.map(
            (tab, index) => {
              // check if this id is already in localStorage
              const localGadgets = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
              // check by searching for the id
              // const localGadget = localGadgets.find((gadget) => gadget.id === tab.id);
              // or if the tab has property isForeground set to true
              // if so, then it's a local gadget
              
              let instance = null;
              let isInstantRun = false;
              if (!tab.content.isHeadless) {
                instance = null;
                isInstantRun = true;
              } else {
                instance = {
                  id: tab.id,
                  gadgetConfig: {
                    ...tab.content.gadgetConfig,
                  },
                };
              }
              return activeTabIndex === index + 1 && (
                <Box key={tab.id} p={3}>
                  <GadgetRenderer
                    nodes={nodes}
                    pods={pods}
                    instance={instance}
                    onGadgetInstanceCreation={() => {}}
                    imageName={tab.content.gadgetConfig.imageName}
                    isInstantRun={isInstantRun}
                  />
                </Box>
              );
            }
          )}
        </Box>
      </SectionBox>
    </GadgetContext.Provider>
  );
}

function GadgetRenderer({ nodes, pods, instance = null, onGadgetInstanceCreation, imageName, isInstantRun = false }) {
  const {
    podsSelected,
    podStreamsConnected,
    setPodStreamsConnected,
    isGadgetInfoFetched,
    setIsGadgetInfoFetched,
    dataSources,
    prepareGadgetInfo,
    gadgetInstance,
    dataColumns,
    gadgetConn,
    setPodsSelected,
    nodesSelected,
    setOpen,
    setNodesSelected,
    setGadgetConn,
    ...otherState
  } = useContext(GadgetContext);
  const [error, setError] = useState(null);
  // Track whether we've made the gadget info request
  const [infoRequested, setInfoRequested] = useState(false);
  
  // Effect for handling pod stream connections
  useEffect(() => {
    if (podStreamsConnected > podsSelected.length) {
      setPodStreamsConnected(podsSelected.length);
      otherState.setGadgetRunningStatus(false);
    }
  }, [podsSelected, podStreamsConnected]);

  useEffect(() => {
      otherState.setGadgetRunningStatus(false);
  }, [JSON.stringify(gadgetInstance || {})])
  const ig = useGadgetConn(nodes, pods);
  const decodedImageName = instance?.gadgetConfig?.imageName 
    ? decodeURIComponent(instance.gadgetConfig.imageName) 
    : decodeURIComponent(imageName);

  // Effect for fetching gadget info - only run once per instance
  useEffect(() => {
    // Only proceed if we have the connection and haven't requested info yet
    if (ig && !infoRequested && decodedImageName) {
      setInfoRequested(true);
      
      // Set connection only if it's different
      if (gadgetConn !== ig) {
        setGadgetConn(ig);
      }
      
      // Request gadget info
      ig.getGadgetInfo(
        {
          version: 1,
          imageName: decodedImageName,
        },
        (info) => {
          prepareGadgetInfo(info);
          setIsGadgetInfoFetched(true);
          setError(null);
        },
        (err) => {
          console.error('Failed to get gadget info:', err);
          // Reset the flag so we can try again if needed
          setError(err);
          setIsGadgetInfoFetched(true);
          setInfoRequested(false);
        }
      );
    }
  }, [
    ig, 
    decodedImageName, 
    infoRequested,  
    prepareGadgetInfo, 
    gadgetConn
  ]);
  
  return (
    <>
      <NodeSelection
        setPodsSelected={setPodsSelected}
        open={open}
        setOpen={setOpen}
        nodesSelected={nodesSelected || []}
        setNodesSelected={setNodesSelected}
        setPodStreamsConnected={setPodStreamsConnected}
        gadgetConn={gadgetConn}
        gadgetInstance={gadgetInstance || instance}
        isInstantRun={isInstantRun}
      />
      
      {!isGadgetInfoFetched && (
        <Box mt={2}>
          <Loader title="Gadget info loading" />
        </Box>
      )}
      
      {isGadgetInfoFetched && podsSelected.map(podSelected => (
        <GenericGadgetRenderer
          key={podSelected?.jsonData.metadata.name}
          {...otherState}
          filters={instance?.gadgetConfig?.paramValues}
          gadgetInstance={gadgetInstance || instance}
          podsSelected={podsSelected}
          node={podSelected?.spec.nodeName}
          podSelected={podSelected?.jsonData.metadata.name}
          dataColumns={dataColumns}
          podStreamsConnected={podStreamsConnected}
          setPodStreamsConnected={setPodStreamsConnected}
          imageName={imageName}
        />
      ))}
      
      {error ? <Typography variant="body1" color="error">{error}</Typography> : (isGadgetInfoFetched && dataSources.map((dataSource, index) => {
        const dataSourceID = dataSource?.id || index;
        return (
          <GadgetWithDataSource
            key={`data-source-${dataSourceID}`}
            {...otherState}
            podsSelected={podsSelected}
            podStreamsConnected={podStreamsConnected}
            dataSourceID={dataSourceID}
            columns={dataColumns[dataSourceID]}
            gadgetInstance={gadgetInstance || instance}
            gadgetConn={gadgetConn}
            onGadgetInstanceCreation={onGadgetInstanceCreation}
            isInstantRun={isInstantRun}
            error={error}
          />
        );
      }))}
    </>
  );
}

export default function Gadget() {
  return <GadgetRendererWithTabs />;
}