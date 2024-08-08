import { DateLabel, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Button, Box } from '@mui/material';
import React from 'react';
import _ from 'lodash';
import { pubSub } from './helper';
import { useLocation } from 'react-router';
import GadgetFilters from './gadgetFilters';
import usePortForward from './igSocket';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import './wasm.js'

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

function flattenObject(obj, parentKey = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
          flattenObject(value, newKey, result);
      } else {
          result[newKey] = value;
      }
  }
  return result;
}

function GenericGadgetRenderer() {
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [nodes] = K8s.ResourceClasses.Node.useList();

  console.log(pods, nodes);
  const { ig, isConnected } = usePortForward('api/v1/namespaces/gadget/pods/gadget-kjpxp/portforward?ports=8080');
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
   }
  }, [])

  React.useEffect(() => {
    if(isConnected && ig) {
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
  
  function gadgetStartStopHandler(status) {
    setLoading(true);
    setGadgetRunningStatus(!status);

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
        if(columns.length == 0) {
          console.log("inside")
          console.log('data columns are', Object.keys(data));
          columns = Object.keys(data);
          setDataColumns(Object.keys(data));
        }
        if(columns.length > 0) {
          const payload = data;
          const massagedData = {};
          columns.forEach((column) => {
            const val = flattenObject(payload)[column];
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
  
  
  if(!isConnected || !ig) {
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
