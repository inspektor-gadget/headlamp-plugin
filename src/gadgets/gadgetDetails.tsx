import { useParams } from 'react-router-dom';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { useContext, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { useGadgetConn } from './conn';
import { NodeSelection } from '../common/NodeSelection';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { GadgetWithDataSource } from '../common/GadgetWithDataSource';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import { GadgetDescription } from '../common/GadgetDescription';

export function GadgetDetails() {
    const [nodes] = K8s.ResourceClasses.Node.useList();
    const [pods] = K8s.ResourceClasses.Pod.useList();
    console.log('nodes', nodes);
    console.log('pods', pods);
    console.log(useGadgetState())
    const gadgetState = useGadgetState();
    console.log('use params', useParams());
   
    if (nodes === null || pods === null) {
        return <Loader />;
    }
    const { imageName, id } = useParams<{ imageName: string, id: string }>();
    console.log('imageName', imageName);
    console.log('id', id);
    const foregroundRunningInstances = JSON.parse(
        localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]'
    );
    const embeddedInstances = JSON.parse(
        localStorage.getItem('headlamp_embeded_resources') || '[]'
    );

    let matchedInstance = foregroundRunningInstances.find((instance) => instance.id === id);
    if(!matchedInstance) {
        matchedInstance = embeddedInstances.find((instance) => instance.id === id);
    }

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
                ...matchedInstance.gadgetConfig
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
    )
}

function GadgetRenderer({ nodes, pods, instance = null, onGadgetInstanceCreation, imageName, isInstantRun = false }) {
    console.log('Gadget instance is ', instance);
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
    const ig = useGadgetConn(nodes, pods);
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
           <SectionBox
        title={
              <GadgetDescription onInstanceDelete={() => {}}  ig={ig}/>
        }
        backLink={true}
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
      </SectionBox>
    );
  }