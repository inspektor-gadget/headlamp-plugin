import { DateLabel, Loader, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Button, Box, Select, FormControlLabel, Checkbox } from '@mui/material';
import React from 'react';
import _ from 'lodash';
import { isIGPod, pubSub } from './helper';
import { useLocation } from 'react-router';
import GadgetFilters from './gadgetFilters';
import usePortForward from './igSocket';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import './wasm.js'

function NodeSelection() {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  console.log(pods, nodes);

  const [nodesSelected, setNodesSelected] = React.useState([]);
  const [isNodesSelectedContinueClicked, setIsNodesSelectedContinueClicked] = React.useState(false);
  const [podsSelected, setPodsSelected] = React.useState([]);
  const [gadgetData, setGadgetData] = React.useState([]);
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [dataColumns, setDataColumns] = React.useState([]);
  const [gadgetConfig, setGadgetConfig] = React.useState({} as any);
  const [filters, setFilters] = React.useState({});
  const location  = useLocation();
  const [podStreamsConnected, setPodStreamsConnected] = React.useState(0);

  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;

  console.log("pods selected", podsSelected);
  if(podsSelected.length > 0) {
    
    return <>
    { podsSelected.map((podSelected) => <GenericGadgetRenderer podSelected={podSelected.jsonData.metadata.name} gadgetData={gadgetData} setGadgetData={setGadgetData} setGadgetConfig={setGadgetConfig} dataColumns={dataColumns} setDataColumns={setDataColumns}
    gadgetRunningStatus={gadgetRunningStatus}  filters={filters} 
    setPodStreamsConnected={setPodStreamsConnected}
    areAllPodStreamsConnected={areAllPodStreamsConnected}
    podStreamsConnected={podStreamsConnected}
    />)}

{ areAllPodStreamsConnected && <SectionBox title={location.state.category} backLink={true}>
       <GadgetFilters config={gadgetConfig} isConnected={podStreamsConnected} setFilters={setFilters} filters={filters} onApplyFilters={() => {
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
        dataColumns.map((column) => {
          return {
            header: column,
            accessorFn: (data) => {
              if(column == 'timestamp') {
                return <DateLabel date={data[column]} />
              }
              return data[column]}
          }
        })
      }
      data={gadgetData}
      loading={!areAllPodStreamsConnected}
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
        console.log('pods interested in are', podsInterestedIn);

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
  gadgetData: any;
  setGadgetData: any;
  setGadgetConfig: any;
  dataColumns: any;
  setDataColumns: any;
  gadgetRunningStatus: any;
  filters: any;
  setPodStreamsConnected: any;
  areAllPodStreamsConnected: any;
  podStreamsConnected: any;
}) {
  const { podSelected, setGadgetConfig, gadgetData, setGadgetData, dataColumns, setDataColumns, gadgetRunningStatus, filters, setPodStreamsConnected, areAllPodStreamsConnected, podStreamsConnected } = props;
  const location  = useLocation();
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
 
  console.log('pods selected', podSelected);
  
  const { ig, isConnected } = usePortForward(`api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`);

  React.useEffect(() => {
    const processBufferedData = setInterval(() => {
      if(bufferedGadgetData.length > 20) {
       setGadgetData((prevData) => [...prevData, ...bufferedGadgetData]);
       setBufferedGadgetData([]);
      }
   }, 5000)

   return () => {
      clearInterval(processBufferedData);
   }
  }, [])

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
      }
  }, {
      onGadgetInfo: (gi) => { console.log('gadgetInfo', gi);
        console.log('dataColumns', gi);
        //setDataColumns(gi);
       },
      onData: (dsID, data) => {  
        console.log('data', dsID, data);
        setLoading(false);
        let columns = dataColumns;
        if(columns.length == 0 && dataColumns.length == 0) {
          console.log("inside")
          console.log('data columns are', Object.keys(data));
          columns = Object.keys(data);
          setDataColumns(Object.keys(data));
        }
        if(columns.length > 0) {
          const payload = data;
          const massagedData = {};
          columns.forEach((column) => {
            const val = JSON.stringify(payload[column]);
            console.log("column and val", column, val);
            massagedData[column] = val;
          })
            if(gadgetData.length < 10) {
              setGadgetData(prevData => [...prevData, massagedData]);
              return;
            }
            setBufferedGadgetData(prevData => [...prevData, massagedData]);
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
