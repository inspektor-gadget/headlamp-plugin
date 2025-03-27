import { ConfirmDialog, Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster, getClusterPrefixedPath } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Box, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { generatePath, useHistory, useParams } from 'react-router-dom';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { GadgetDescription } from '../common/GadgetDescription';
import { GadgetWithDataSource } from '../common/GadgetWithDataSource';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { generateRandomString, updateInstanceFromStorage } from '../common/helpers';
import { NodeSelection } from '../common/NodeSelection';
import { useGadgetConn } from './conn';

export function GadgetDetails() {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const gadgetState = useGadgetState();

  if (nodes === null || pods === null) {
    return <Loader />;
  }
  const { imageName, id } = useParams<{ imageName: string; id: string }>();
  const embeddedInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
  const matchedInstance = embeddedInstances.find(instance => instance.id === id);

  if (!matchedInstance) {
    return <div>Gadget instance not found</div>;
  }

  let instance = null;
  let isInstantRun = false;
  if (!matchedInstance.isHeadless) {
    instance = null;
    isInstantRun = true;
  } else {
    instance = {
      id: matchedInstance.id,
      gadgetConfig: {
        ...matchedInstance.gadgetConfig,
      },
    };
  }

  return (
    <GadgetContext.Provider value={{ ...gadgetState }}>
      <GadgetRenderer
        nodes={nodes}
        pods={pods}
        instance={instance}
        onGadgetInstanceCreation={() => {}}
        imageName={imageName}
        isInstantRun={isInstantRun}
      />
    </GadgetContext.Provider>
  );
}

function GadgetRenderer({
  nodes,
  pods,
  instance = null,
  onGadgetInstanceCreation,
  imageName,
  isInstantRun = false,
}) {
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
  const history = useHistory();
  const ig = useGadgetConn(nodes, pods);
  const [embedView, setEmbedView] = useState('None');
  const { id } = useParams<{ id: string }>();
  const [enableHistoricalData, setEnableHistoricalData] = useState(true);
  const [update, setUpdate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Effect for handling pod stream connections
  useEffect(() => {
    if (podStreamsConnected > podsSelected.length) {
      setPodStreamsConnected(podsSelected.length);
      otherState.setGadgetRunningStatus(false);
    }
  }, [podsSelected, podStreamsConnected]);

  useEffect(() => {
    otherState.setGadgetRunningStatus(false);
  }, [JSON.stringify(gadgetInstance || {})]);

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
        info => {
          prepareGadgetInfo(info);
          setIsGadgetInfoFetched(true);
          setError(null);
        },
        err => {
          console.error('Failed to get gadget info:', err);
          // Reset the flag so we can try again if needed
          setError(err);
          setIsGadgetInfoFetched(true);
          setInfoRequested(false);
        }
      );
    }
  }, [ig, decodedImageName, infoRequested, prepareGadgetInfo, gadgetConn]);

  function headlessGadgetRunCallback() {
    // i am trying to run now what's my embedded state, also this is a run in background callback so i now isHeadless is true
    otherState.setGadgetRunningStatus(true);
    updateInstanceFromStorage(id, embedView, true);
  }

  const handleRun = () => {
    // but lets first check if it's not enableHistoricalData and embedView is not None
    // if embedView is not None we need to set the instance as embedded
    if (embedView !== 'None' && !enableHistoricalData) {
      updateInstanceFromStorage(id, embedView, false);
      setUpdate(prev => !prev);
      return;
    }
    // find me the name of this instance
    const allInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    const instance = allInstances.find(instance => instance.id === id);
    if (enableHistoricalData) {
      ig.createGadgetInstance(
        {
          name: instance.name,
          tags: instance?.tags,
          nodes: [],
          gadgetConfig: {
            imageName: imageName,
            version: 1,
            paramValues: {
              ...otherState.filters,
            },
          },
        },
        success => {
          // but we need to remove the old instance from localStorage
          const allInstances = JSON.parse(
            localStorage.getItem('headlamp_embeded_resources') || '[]'
          );
          const instance = allInstances.find(instance => instance.id === id);
          const updatedInstances = allInstances.filter(instance => instance.id !== id);
          localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
          const newID = success.gadgetInstance.id;
          const newInstance = {
            id: newID,
            name: success.gadgetInstance.name || imageName,
            gadgetConfig: {
              imageName: instance?.gadgetConfig?.imageName,
              version: 1,
              paramValues: {
                ...otherState.filters,
              },
            },
            isHeadless: true,
            tags: instance?.tags,
            nodes: [],
            cluster: getCluster(),
            kind: embedView,
            isEmbedded: embedView !== 'None',
          };
          const updatedEmbeddedInstances = [...updatedInstances, newInstance];
          localStorage.setItem(
            'headlamp_embeded_resources',
            JSON.stringify(updatedEmbeddedInstances)
          );
          history.replace(
            `${generatePath(getClusterPrefixedPath(), {
              cluster: getCluster(),
            })}/gadgets/${imageName}/${newID}`
          );
        },
        err => {
          console.error('Failed to create gadget instance:', err);
          setError(err);
        }
      );
    }

    // if historicalData is enabled we need to create a new gadget instance
  };
  function headlessGadgetDeleteCallback() {
    setDeleteDialogOpen(true);
  }

  function deleteHeadlessGadget() {
    ig.deleteGadgetInstance(
      id,
      () => {
        const newID = imageName + '-custom-' + generateRandomString();

        updateInstanceFromStorage(id, 'None', false);
        const allInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        localStorage.setItem(
          'headlamp_embeded_resources',
          JSON.stringify([
            ...allInstances,
            {
              id: newID,
              name: imageName + '-custom-' + generateRandomString(),
              gadgetConfig: {
                imageName: imageName,
                version: 1,
                paramValues: {
                  ...otherState.filters,
                },
              },
              isHeadless: false,
              tags: [],
              nodes: [],
              cluster: getCluster(),
              isEmbedded: false,
            },
          ])
        );
        otherState.setGadgetRunningStatus(false);
        history.replace(
          `${generatePath(getClusterPrefixedPath(), {
            cluster: getCluster(),
          })}/gadgets/${imageName}/${newID}`
        );
      },
      err => {
        console.error('Failed to delete gadget instance:', err);
      }
    );
  }
  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        handleClose={() => setDeleteDialogOpen(false)}
        title={`Delete gadget instance ${id}`}
        description="Are you sure you want to delete this gadget instance?"
        onConfirm={() => {
          deleteHeadlessGadget();
        }}
      />
      <SectionBox
        title={
          <GadgetDescription
            setEmbedView={setEmbedView}
            embedView={embedView}
            enableHistoricalData={enableHistoricalData}
            setEnableHistoricalData={setEnableHistoricalData}
            update={update}
          />
        }
        backLink
      >
        <NodeSelection
          setPodsSelected={setPodsSelected}
          open={open}
          setOpen={setOpen}
          nodesSelected={nodesSelected || []}
          setNodesSelected={setNodesSelected}
          setPodStreamsConnected={setPodStreamsConnected}
          gadgetConn={gadgetConn}
          gadgetInstance={instance}
          isInstantRun={isInstantRun}
        />

        {!isGadgetInfoFetched && (
          <Box mt={2}>
            <Loader title="Gadget info loading" />
          </Box>
        )}

        {isGadgetInfoFetched &&
          podsSelected.map(podSelected => (
            <GenericGadgetRenderer
              key={podSelected?.jsonData.metadata.name}
              {...otherState}
              filters={otherState.filters}
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

        {error ? (
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        ) : (
          isGadgetInfoFetched &&
          dataSources.map((dataSource, index) => {
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
                headlessGadgetRunCallback={headlessGadgetRunCallback}
                headlessGadgetDeleteCallback={headlessGadgetDeleteCallback}
                handleRun={handleRun}
              />
            );
          })
        )}
      </SectionBox>
    </>
  );
}
