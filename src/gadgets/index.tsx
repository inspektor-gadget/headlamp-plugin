import './wasm.js';
import { Icon } from '@iconify/react';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, IconButton, Tab, Tabs } from '@mui/material';
import { useContext, useEffect } from 'react';
import { useParams } from 'react-router';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { GadgetDescription } from '../common/GadgetDescription';
import { GadgetWithDataSource } from '../common/GadgetWithDataSource';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { prepareGadgetInstance } from '../common/helpers';
import { NodeSelection } from '../common/NodeSelection';
import { BackgroundRunning } from './backgroundgadgets';
import { GadgetConnectionForBackgroundRunningProcess } from './conn';

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
      <SectionBox backLink>
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <GadgetDescription
            onInstanceDelete={gadgetInstance => {
              // get index of this tab and remove it
              const index = dynamicTabs.findIndex(tab => tab.id === gadgetInstance.id);
              removeDynamicTab(index);
              setActiveTabIndex(1);
            }}
            instance={
              // its there if the dynamic tab is loaded on scree
              activeTabIndex > 1 ? dynamicTabs[activeTabIndex - 2] : null
            }
          />
          <Box mb={1}>
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
          </Box>

          {activeTabIndex === 0 && (
            <GadgetRenderer
              nodes={nodes}
              pods={pods}
              onGadgetInstanceCreation={function (success) {
                addDynamicTab(success.gadgetInstance);
                setActiveTabIndex(dynamicTabs.length + 2);
              }}
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
                  />
                </Box>
              )
          )}
        </Box>
      </SectionBox>
    </GadgetContext.Provider>
  );
}

function GadgetRenderer({ nodes, pods, instance = null, onGadgetInstanceCreation }) {
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
