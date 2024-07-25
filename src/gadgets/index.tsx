import { DateLabel, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Button, Box } from '@mui/material';
import React from 'react';
import _ from 'lodash';
import { pubSub } from './helper';
import { useLocation } from 'react-router';
import GadgetFilters from './gadgetFilters';
import usePortForward from './igSocket';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';

function getObjectValue(obj, keyString) {
  // Split the keyString into parts using '.'
  const keys = keyString.split('.');
  
  // Traverse the object using the keys array
  let value = obj;
  for (let key of keys) {
    value = value[key];
    if (value === undefined) {
      return undefined; // Return undefined if any key is not found
    }
  }
  
  return value;
}

function GenericGadgetRenderer() {
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [nodes] = K8s.ResourceClasses.Node.useList();

  console.log(pods, nodes);
  const { runGadgetWithActionAndPayload, isConnected, ws } = usePortForward('api/v1/namespaces/gadget/pods/gadget-kjpxp/portforward?ports=8082');
  const location  = useLocation();
  const [dataColumns, setDataColumns] = React.useState([]);
  const [gadgetData, setGadgetData] = React.useState([]);
  const [gadgetConfig, setGadgetConfig] = React.useState({} as any);
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState([]);
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [filters, setFilters] = React.useState({});
  const gadgetID = location.state.name;
  
  React.useEffect(() => {
    const processBufferedData = setInterval(() => {
      if(bufferedGadgetData.length > 20) {
       setGadgetData((prevData) => [...prevData, ...bufferedGadgetData]);
       setBufferedGadgetData([]);
      }
   }, 5000)

   return () => {
      clearInterval(processBufferedData);
      ws.close();
   }
  }, [])

  React.useEffect(() => {
    if(isConnected) {
      runGadgetWithActionAndPayload('info', 'trace_open', {
        id: gadgetID
      })
    }
  }, [isConnected])
  
  React.useEffect(() => {
    pubSub.subscribe(gadgetID, (data) => {
      setLoading(false);
      switch(data.type) {
        case 4:
          setGadgetConfig(data.payload);
          break;
        case 1000:
          setDataColumns(data.payload);
          break;
        default:
         
      }
      if(data.payload.imageName) {
        setGadgetConfig(data.payload);
        return;
      } 
     
      if(!data.type && data.payload && dataColumns.length > 0) {
        const payload = data.payload;
        const massagedData = {};
        dataColumns.forEach((column) => {
          const val = getObjectValue(payload, column);
          massagedData[column] = val;
        })
          if(gadgetData.length < 10) {
            setGadgetData(prevData => [...prevData, massagedData]);
            return;
          }
          setBufferedGadgetData(prevData => [...prevData, massagedData]);
      }
    })
  }, [dataColumns]);

  function gadgetStartStopHandler(status) {
    setLoading(true);
    setGadgetRunningStatus(!status);
    runGadgetWithActionAndPayload(status ? 'stop' : 'start', {
      imageName: location.state.name,
      id: gadgetID,
      paramValues: {
        ...filters
      }
    })
  }
  
  
  if(!isConnected) {
    return <div>
      Establishing gadget connection...
    </div>
  }

  return <SectionBox title={location.state.category} backLink={true}>
       <GadgetFilters config={gadgetConfig} setFilters={setFilters} isConnected={isConnected} filters={filters} onApplyFilters={() => {
        setGadgetData([]);

        // first send a stop action to stop this gadget and then start it again
        if(gadgetRunningStatus) {
          gadgetStartStopHandler(true);
        
        }
        gadgetStartStopHandler(false);
       }}/>
    <Box m={2}>
    <Grid container justifyContent="space-between" spacing="2">
          <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>
          <Grid item>
            <Button onClick={() => gadgetStartStopHandler(gadgetRunningStatus)} variant="outlined">
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
      loading={!isConnected && loading }
  />
  </SectionBox>;
}

export default function Gadget() {
  

  return (
    <GenericGadgetRenderer/>
  );
}
