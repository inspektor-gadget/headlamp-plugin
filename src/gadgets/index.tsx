import { DateLabel, Link, Loader, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Button, Box, Select, FormControlLabel, Checkbox } from '@mui/material';
import React from 'react';
import _ from 'lodash';
import { isIGPod, pubSub } from './helper';
import { useLocation } from 'react-router';
import GadgetFilters from './gadgetFilters';
import usePortForward from './igSocket';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import './wasm.js'

const MAX_DATA_SIZE = 500; // Set the maximum limit for total data

function NodeSelection() {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();

  const [nodesSelected, setNodesSelected] = React.useState([]);
  const [isNodesSelectedContinueClicked, setIsNodesSelectedContinueClicked] = React.useState(false);
  const [podsSelected, setPodsSelected] = React.useState([]);
  const [gadgetData, setGadgetData] = React.useState([]);
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [dataColumns, setDataColumns] = React.useState([]);
  const [gadgetConfig, setGadgetConfig] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  const location  = useLocation();
  const [podStreamsConnected, setPodStreamsConnected] = React.useState(0);
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState([]);
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if(bufferedGadgetData.length > 0) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData])

  const columns = React.useMemo(() => {
    return dataColumns.map((column) => {
      return {
        header: column,
        accessorFn: (data) => {
          if(column == 'timestamp') {
            return <DateLabel date={data[column]} />
          }
          return data[column]}
      }
    })
  }, [dataColumns])
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;

  if(podsSelected.length > 0) {
    
    return <>
    { podsSelected.map((podSelected) => <GenericGadgetRenderer podSelected={podSelected.jsonData.metadata.name}  setGadgetConfig={setGadgetConfig} dataColumns={dataColumns} setDataColumns={setDataColumns}
    gadgetRunningStatus={gadgetRunningStatus}  filters={filters} 
    setPodStreamsConnected={setPodStreamsConnected}
    areAllPodStreamsConnected={areAllPodStreamsConnected}
    podStreamsConnected={podStreamsConnected}
    setBufferedGadgetData={setBufferedGadgetData}
    bufferedGadgetData={bufferedGadgetData}
    setLoading={setLoading}
    />)}

{ areAllPodStreamsConnected && <SectionBox title={location.state.category} backLink={true}>
       <GadgetFilters config={gadgetConfig} isConnected={podStreamsConnected} setFilters={setFilters} filters={filters} onApplyFilters={() => {
        console.log("apply filters called")
        setGadgetData([]);

        // first send a stop action to stop this gadget and then start it again
        if(gadgetRunningStatus) {
          setGadgetRunningStatus(false);
        }
        setGadgetRunningStatus(true);
       }}/>
    <Box m={2}>
    <Grid container justifyContent="space-between" spacing="2">
          <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>
          <Grid item>
            <Button onClick={() => setGadgetRunningStatus((prevVal) => !prevVal)} variant="outlined">
              {!gadgetRunningStatus ? 'Start' : 'Stop'}
            </Button>
          </Grid>
        </Grid>
    </Box>
    <Table
      columns={
        columns
      }
      data={gadgetData}
      loading={loading}
  />
  </SectionBox>
  }
    </>
  }
    
    return <SectionBox title="Select a node you want to run the gadget on" backLink={true}>
    {
      <>
      { !nodes && <Loader title=''/> }
      { nodes?.map((node) => {
        return <Box>
          <FormControlLabel control={<Checkbox />} label={node.metadata.name} onChange={(e) => {
          if(e.target.checked) {
            setNodesSelected([...nodesSelected, node.metadata.name]);
          } else {
            setNodesSelected(nodesSelected.filter((n) => n != node.metadata.name));
          }
        }}/>
        </Box>
      })}
      </>
    }
    <Button disabled={nodesSelected.length === 0} variant="contained" onClick={() => {
      let podsInterestedIn = [];
      nodesSelected.forEach((nodeName) => {
        podsInterestedIn.push(...[...pods.filter((pod) => pod.spec.nodeName === nodeName && isIGPod(pod))]);
      })
      setPodsSelected(() => { 
        
        return podsInterestedIn
      });
      setIsNodesSelectedContinueClicked(true);
    }}>Continue</Button>
    </SectionBox>
    
}

function GenericGadgetRenderer(props: {
  podSelected: any;
  setGadgetConfig: any;
  dataColumns: any;
  setDataColumns: any;
  gadgetRunningStatus: any;
  filters: any;
  setPodStreamsConnected: any;
  areAllPodStreamsConnected: any;
  podStreamsConnected: any;
  setBufferedGadgetData: any;
  bufferedGadgetData: any;
  setLoading: any;
}) {
  const { podSelected, setGadgetConfig, dataColumns, setDataColumns, gadgetRunningStatus, filters, setPodStreamsConnected, areAllPodStreamsConnected, setBufferedGadgetData, bufferedGadgetData, setLoading } = props;
  const location  = useLocation();
  const { ig, isConnected } = usePortForward(`api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`);
  React.useEffect(() => {
    if(isConnected && ig) {
      setPodStreamsConnected((prevVal) => prevVal + 1);
      ig.getGadgetInfo({
        version: 1,
        imageName: location.state.name
    }, (info) => {
        console.info(info);
        setGadgetConfig(info);
    }, (err) => {
        console.error(err);
    })
    }
  }, [isConnected, ig])
  
  function gadgetStartStopHandler() {
    setLoading(true);
    ig.runGadget({
      version: 1,
      imageName: location.state.name,
      paramValues: {
          ...filters
      },
  }, {
      onGadgetInfo: (gi) => {
        //setDataColumns(gi);
       },
      onData: (dsID, data) => {  
        setLoading(false);
        let columns = dataColumns;
        if(columns.length == 0 && dataColumns.length == 0) {
          columns = Object.keys(data);
          // remove the column called k8s and add containerName, namespace, node, podName
          columns = columns.filter((column) => column !== 'k8s');
          // add the new columns in mid
          columns = [...columns.slice(0, 1), 'containerName', 'namespace', 'node', 'podName', ...columns.slice(1)];
          setDataColumns(columns);
        }
        if(columns.length > 0) {
          const payload = data;
          const massagedData = {};
          columns.forEach((column) => {
            if(column === 'containerName') {
              massagedData[column] = payload.k8s[column];
            } else if(column === 'namespace' || column === 'node' || column === 'podName') {
              massagedData[column] = payload.k8s[column];
            } else {
              massagedData[column] = JSON.stringify(payload[column]);
            }
          })
        _.debounce(() => setBufferedGadgetData((prevData) => {
          if(prevData.length > MAX_DATA_SIZE) {
            return prevData
          }
          const newBufferedData = [...prevData, massagedData];
          // If the buffer exceeds MAX_DATA_SIZE, remove the first element
          // if (newBufferedData.length > MAX_DATA_SIZE) {
          //   newBufferedData.shift(); // Remove the first (oldest) element
          // }
          return newBufferedData;
        }), 3000)();
        } }
  }, (err) => {
      console.error(err);
  })
  }

  React.useEffect(() => {
    if (areAllPodStreamsConnected) {
      gadgetStartStopHandler();
    }

  }, [gadgetRunningStatus])
  
  return null

}

export default function Gadget() {
  

  return (
    <NodeSelection/>
  );
}
