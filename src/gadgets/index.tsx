import './wasm.js';
import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Paper } from '@mui/material';
import _ from 'lodash';
import React from 'react';
import { useParams } from 'react-router';
import { GadgetWithDataSource } from '../common/GadgetWithDataSource';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { NodeSelection } from '../common/NodeSelection';

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

function GadgetRenderer() {
  const { version, instance, imageName } = useParams();
  const [podsSelected, setPodsSelected] = React.useState([]);
  const [gadgetData, setGadgetData] = React.useState({});
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [dataColumns, setDataColumns] = React.useState({});
  const [gadgetConfig, setGadgetConfig] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  const [podStreamsConnected, setPodStreamsConnected] = React.useState(0);
  const [dataSources, setDataSources] = React.useState([]);
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [isGadgetInfoFetched, setIsGadgetInfoFetched] = React.useState(false);
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;
  const gadgetInstance = prepareGadgetInstance(version, instance, imageName);
  const [open, setOpen] = React.useState(true);
  const [nodesSelected, setNodesSelected] = React.useState([]);

  return (
    <>
      <NodeSelection
        setPodStreamsConnected={setPodStreamsConnected}
        setPodsSelected={setPodsSelected}
        open={open}
        setOpen={setOpen}
        nodesSelected={nodesSelected}
        setNodesSelected={setNodesSelected}
      />
      {(!areAllPodStreamsConnected && gadgetInstance && podsSelected.length > 0) ||
        (areAllPodStreamsConnected && !isGadgetInfoFetched && podsSelected.length > 0 && (
          <Box>
            <Box
              width="30%"
              style={{
                margin: '0 auto',
              }}
            >
              <Paper>
                <Box p={2}>
                  <h3>Preparing gadget info</h3>
                  <Loader title="gadget info loading" />
                </Box>
              </Paper>
            </Box>
          </Box>
        ))}
      {podsSelected.map(podSelected => (
        <GenericGadgetRenderer
          gadgetInstance={gadgetInstance}
          podsSelected={podsSelected}
          node={podSelected?.spec.nodeName}
          podSelected={podSelected.jsonData.metadata.name}
          setGadgetConfig={setGadgetConfig}
          dataColumns={dataColumns}
          setDataColumns={setDataColumns}
          gadgetRunningStatus={gadgetRunningStatus}
          filters={filters}
          setPodStreamsConnected={setPodStreamsConnected}
          podStreamsConnected={podStreamsConnected}
          setBufferedGadgetData={setBufferedGadgetData}
          setLoading={setLoading}
          setDataSources={setDataSources}
          setIsGadgetInfoFetched={setIsGadgetInfoFetched}
          setGadgetData={setGadgetData}
        />
      ))}
      {dataSources.map((dataSource, index) => {
        const dataSourceID = dataSource?.id || index;
        return (
          <GadgetWithDataSource
            podsSelected={podsSelected}
            podStreamsConnected={podStreamsConnected}
            setGadgetData={setGadgetData}
            setBufferedGadgetData={setBufferedGadgetData}
            setGadgetRunningStatus={setGadgetRunningStatus}
            gadgetRunningStatus={gadgetRunningStatus}
            setFilters={setFilters}
            filters={filters}
            loading={loading}
            gadgetConfig={gadgetConfig}
            dataSourceID={dataSourceID}
            gadgetData={gadgetData}
            columns={dataColumns[dataSourceID]}
            bufferedGadgetData={bufferedGadgetData}
            renderCreateBackgroundGadget
            gadgetInstance={gadgetInstance}
            setOpen={setOpen}
          />
        );
      })}
    </>
  );
}

export default function Gadget() {
  return <GadgetRenderer />;
}
