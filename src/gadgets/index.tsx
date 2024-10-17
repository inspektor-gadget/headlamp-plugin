import { DateLabel, Link, Loader, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Button, Box, Select, FormControlLabel, Checkbox } from '@mui/material';
import React from 'react';
import _ from 'lodash';
import { getProperty, isIGPod, pubSub } from './helper';
import { useLocation } from 'react-router';
import GadgetFilters from './gadgetFilters';
import usePortForward from './igSocket';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';

import './wasm.js'

const MAX_DATA_SIZE = 500; // Set the maximum limit for total data
const IS_METRIC = 'isMetric';
const HEADLAMP_KEY = 'headlamp_key';
const HEADLAMP_VALUE = 'headlamp_value';

function NodeSelection() {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();

  const [nodesSelected, setNodesSelected] = React.useState([]);
  const [isNodesSelectedContinueClicked, setIsNodesSelectedContinueClicked] = React.useState(false);
  const [podsSelected, setPodsSelected] = React.useState([]);
  const [gadgetData, setGadgetData] = React.useState({
  });
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [dataColumns, setDataColumns] = React.useState({});
  const [gadgetConfig, setGadgetConfig] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  const [podStreamsConnected, setPodStreamsConnected] = React.useState(0);
  const [dataSources, setDataSources] = React.useState([]);
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;

  if(podsSelected.length > 0) {
    
    return <>
    { podsSelected.map((podSelected) => <GenericGadgetRenderer podSelected={podSelected.jsonData.metadata.name}  setGadgetConfig={setGadgetConfig} dataColumns={dataColumns} setDataColumns={setDataColumns}
    gadgetRunningStatus={gadgetRunningStatus}  filters={filters} 
    setPodStreamsConnected={setPodStreamsConnected}
    areAllPodStreamsConnected={areAllPodStreamsConnected}
    podStreamsConnected={podStreamsConnected}
    setBufferedGadgetData={setBufferedGadgetData}
    setLoading={setLoading}
    setDataSources={setDataSources}
    />)}
    {
      dataSources.map((dataSource, index) => {
        const dataSourceID = dataSource?.id || index;
      return (<GadgetWithDataSource
        areAllPodStreamsConnected={areAllPodStreamsConnected}
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
      />)
    }) 
    }
    </>
  }
    
    return <><SectionBox title="Select a node you want to run the gadget on" backLink={true}>
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
    </>
}

function GadgetWithDataSource(props: {
  areAllPodStreamsConnected: any;
  podStreamsConnected: any;
  setGadgetData: any;
  setBufferedGadgetData: any;
  setGadgetRunningStatus: any;
  gadgetRunningStatus: any;
  setFilters: any;
  filters: any;
  loading: any;
  gadgetConfig: any;
  dataSourceID: any;
  gadgetData: any;
  columns: any;
  bufferedGadgetData: any;
}) {
  const { areAllPodStreamsConnected, podStreamsConnected, setGadgetData, setBufferedGadgetData, setGadgetRunningStatus, gadgetRunningStatus, setFilters, filters, loading, gadgetConfig, dataSourceID, gadgetData, columns, bufferedGadgetData } = props;
    const fields = React.useMemo(() => {
    return columns?.map((column) => {
      return {
        header: column,
        accessorFn: (data) => {
          if(column == 'timestamp') {
            return <DateLabel date={data[column]} />
          }
          return data[column]}
      }
    })
  }, [columns])
  React.useEffect(() => {
    if(bufferedGadgetData[dataSourceID]?.length > 0) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData[dataSourceID]])
  const location  = useLocation();
    return (areAllPodStreamsConnected && <SectionBox title={location.state.category} backLink={true}>
    <GadgetFilters config={gadgetConfig} isConnected={podStreamsConnected} setFilters={setFilters} filters={filters} onApplyFilters={() => {
     setGadgetData((prevData) => {
        prevData[dataSourceID] = [];
        setBufferedGadgetData({...prevData})
        return {...prevData}
     });

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
         <Button onClick={() => {
           if(!gadgetRunningStatus) {
            setGadgetData((prevData) => {
              prevData[dataSourceID] = [];
              return {...prevData}
           });
           setBufferedGadgetData((prevData) => {
            prevData[dataSourceID] = [];
            return {...prevData}
         });
           }
           setGadgetRunningStatus((prevVal) => !prevVal)}} variant="outlined" disabled={loading}>
           { loading ? 'Processing' : !gadgetRunningStatus ? 'Start' : 'Stop'}
         </Button>
       </Grid>
     </Grid>
 </Box>
 {fields?.find(field => field.header === (IS_METRIC)) ? <MetricChart data={gadgetData} fields={fields}/> :  fields && <Table
   columns={
     fields
   }
   data={gadgetData ? gadgetData[dataSourceID] : []}
   loading={loading}
/>}
</SectionBox>
    )
}

function MetricChart(props: {
  data: any;
  fields: any;
}) {
  const { data, fields } = props;
  const key = fields.find(field => field?.header?.includes(HEADLAMP_KEY))?.header.replace(`${HEADLAMP_KEY}_`, '');
  const value = fields.find(field => field?.header?.includes(HEADLAMP_VALUE))?.header.replace(`${HEADLAMP_VALUE}_`, '');  
  return <div>Metric data here</div>
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
  setLoading: any;
  setDataSources: any;
}) {
  const { podSelected, setGadgetConfig, dataColumns, setDataColumns, gadgetRunningStatus, filters, setPodStreamsConnected, areAllPodStreamsConnected, setBufferedGadgetData, setLoading, setDataSources } = props;
  const location  = useLocation();
  const { ig, isConnected } = usePortForward(`api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`);
  const gadgetRef = React.useRef(null);
  const gadgetRunningStatusRef = React.useRef(gadgetRunningStatus);

  React.useEffect(() => {
    if(isConnected && ig) {
      setPodStreamsConnected((prevVal) => prevVal + 1);
      ig.getGadgetInfo({
        version: 1,
        imageName: `${location.state?.name}:v0.32.0`
    }, (info) => {
      let fields = {};
      info.dataSources.forEach((dataSource, index) => {
        const annotations = dataSource.annotations;
        const isMetricAnnotationAvailable = annotations && Object.keys(annotations).find((annotationKey) => {
          if(annotationKey === 'metrics.print') {
            return annotations[annotationKey] === 'true';
          }
          return false
        })
        if(isMetricAnnotationAvailable) {
          let fieldsFromDataSource = dataSource.fields.filter((field) => (field.flags & 4) == 0).map((field) => field.fullName).filter((field) => field !== 'k8s')
          let key = dataSource.fields.find((field) => field.tags.includes('role:key'))?.fullName
          fieldsFromDataSource.push(`${HEADLAMP_KEY}_${key}`)
          let value = dataSource.fields.find((field) => !field.tags.includes('role:key'))?.fullName
          fieldsFromDataSource.push(`${HEADLAMP_VALUE}_${value}`)
          fieldsFromDataSource.push(IS_METRIC);
          fields[dataSource.id || index] = fieldsFromDataSource;
        } else {
          fields[dataSource.id || index] = dataSource.fields.filter((field) => (field.flags & 4) == 0).map((field) => field.fullName).filter((field) => field !== 'k8s');  
        }
      });
      console.log("fields are ", fields)
        setGadgetConfig(info);
        setDataSources(info.dataSources);
        setDataColumns({...fields})
    }, (err) => {
        console.error(err);
    })
    }
  }, [isConnected, ig])
  
  function handleGadgetData(data, dsID) {
    if(!gadgetRunningStatusRef.current) {
      return;
    }
    setLoading(false);
    if(!gadgetRunningStatusRef.current) {
      return;
    }
    let massagedData = {};
    let columns = dataColumns[dsID];
    if(columns.length > 0) {
      if(columns.includes(IS_METRIC)) {
        massagedData = data;
      } else {
        const payload = data;
        columns.forEach((column) => {
          if(column === IS_METRIC || column.includes(HEADLAMP_KEY) || column.includes(HEADLAMP_VALUE)) {
            return;
          }
          const value = getProperty(payload, column);
          if(column === 'k8s.containerName') {
            massagedData[column] = value;
          } else if(column === 'k8s.namespace' || column === 'k8s.node' || column === 'k8s.podName') {
            if((column === 'k8s.namespace' || column === 'k8s.node')) {
              massagedData[column] = <Link routeName={column} params={{name: value}}>{value}</Link>
            } else if(column === 'k8s.podName' && payload.k8s['namespace']) {
              massagedData[column] = <Link routeName='pod' params={{name: value, namespace: payload.k8s['namespace']}}>{value}</Link>
            } 
          } else {
            // remove quotes if any from string
            massagedData[column] = JSON.stringify(value).replace(/['"]+/g, '');
          }
        })
      }
      
      
    _.debounce(() => setBufferedGadgetData((prevData) => {
      const newBufferedData = {...prevData};
      newBufferedData[dsID] = [...newBufferedData[dsID], massagedData];
      return newBufferedData;
    }), 1000)();
    } 
  }
  function gadgetStartStopHandler() {
    setLoading(true);
    console.log('gadget payload', {
      version: 1,
      imageName: `${location.state.name}:v0.32.0`,
      paramValues: {
          ...filters
      },
  })
  if(!gadgetRunningStatusRef.current) {
    gadgetRef.current.stop();
    return;
  }
    gadgetRef.current = ig.runGadget({
      version: 1,
      imageName: `${location.state.name}:v0.32.0`,
      paramValues: {
          ...filters
      },
  }, {
      onGadgetInfo: (gi) => {  
         
       },
       onReady: () => {
        if(!gadgetRunningStatusRef.current) {
          gadgetRef.current.stop();
        }
       },
       onDone: () => {
        setLoading(false);
       },
       onError: (error) => {
        console.log("error is ", error)
       },

      onData: (dsID, dataFromGadget) => {  
        if(_.isArray(dataFromGadget)) {
          dataFromGadget.forEach((d) => {
            handleGadgetData(d, dsID);
        })

          } else {
            handleGadgetData(dataFromGadget, dsID);
          }
       }
  }, (err) => {
      console.log("got error",err);
  })
  }

  React.useEffect(() => {
    gadgetRunningStatusRef.current = gadgetRunningStatus;
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
