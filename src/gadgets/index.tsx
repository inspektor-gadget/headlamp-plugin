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
  const [gadgetData, setGadgetData] = React.useState({
  });
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [dataColumns, setDataColumns] = React.useState([]);
  const [gadgetConfig, setGadgetConfig] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  const [podStreamsConnected, setPodStreamsConnected] = React.useState(0);
  const [dataSources, setDataSources] = React.useState([]);
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState({});
  const [loading, setLoading] = React.useState(false);
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
    setLoading={setLoading}
    setDataSources={setDataSources}
    />)}
    {
      dataSources.map((dataSource, index) => <GadgetWithDataSource
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
        dataSourceID={dataSource?.id || index}
        gadgetData={gadgetData}
        columns={columns}
        bufferedGadgetData={bufferedGadgetData}
      />) 
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
        setGadgetData({...prevData});
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
              setGadgetData({...prevData});
           });
           setBufferedGadgetData((prevData) => {
            prevData[dataSourceID] = [];
            setBufferedGadgetData({...prevData});
         });
           }
           setGadgetRunningStatus((prevVal) => !prevVal)}} variant="outlined" disabled={loading}>
           { loading ? 'Processing' : !gadgetRunningStatus ? 'Start' : 'Stop'}
         </Button>
       </Grid>
     </Grid>
 </Box>
 <Table
   columns={
     columns
   }
   data={gadgetData ? gadgetData[dataSourceID] : []}
   loading={loading}
/>
</SectionBox>
    )
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
      console.log('gadget info', info);
        setGadgetConfig(info);
        setDataSources(info.dataSources);
    }, (err) => {
        console.error(err);
    })
    }
  }, [isConnected, ig])
  
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
      onData: (dsID, data) => {  
        console.log('data', data);
        if(_.isArray(data)) {
          data.forEach((d) => {
            if(!gadgetRunningStatusRef.current) {
              return;
            }
            setLoading(false);
            if(!gadgetRunningStatusRef.current) {
              return;
            }
            let columns = dataColumns;
            if(columns.length == 0 && dataColumns.length == 0) {
              columns = Object.keys(d);
              // remove the column called k8s and add containerName, namespace, node, podName
              columns = columns.filter((column) => column !== 'k8s');
              // add the new columns in mid
              columns = [...columns.slice(0, 1), 'containerName', 'namespace', 'node', 'podName', ...columns.slice(1)];
              setDataColumns(columns);
            }
            if(columns.length > 0) {
              const payload = d;
              const massagedData = {};
              columns.forEach((column) => {
                if(column === 'containerName') {
                  massagedData[column] = payload.k8s[column];
                } else if(column === 'namespace' || column === 'node' || column === 'podName') {
                  if((column === 'namespace' || column === 'node') && payload.k8s[column]) {
                    massagedData[column] = <Link routeName={column} params={{name: payload.k8s[column]}}>{payload.k8s[column]}</Link>
                  } else if(column === 'podName' && payload.k8s[column] && payload.k8s['namespace']) {
                    massagedData[column] = <Link routeName='pod' params={{name: payload.k8s[column], namespace: payload.k8s['namespace']}}>{payload.k8s[column]}</Link>
                  } else {
                    massagedData[column] = payload.k8s[column]
                  }
                } else {
                  massagedData[column] = JSON.stringify(payload[column]);
                }
              })
              
            _.debounce(() => setBufferedGadgetData((prevData) => {
              const newBufferedData = {...prevData};
              newBufferedData[dsID] = [...newBufferedData[dsID], massagedData];
              return newBufferedData;
            }), 1000)();
            } })

          } else {
            if(!gadgetRunningStatusRef.current) {
              return;
            }
            setLoading(false);
            //console.log("gadget running status for collection of data ",gadgetRunningStatusRef.current)
            if(!gadgetRunningStatusRef.current) {
              return;
            }
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
                  if((column === 'namespace' || column === 'node') && payload.k8s[column]) {
                    massagedData[column] = <Link routeName={column} params={{name: payload.k8s[column]}}>{payload.k8s[column]}</Link>
                  } else if(column === 'podName' && payload.k8s[column] && payload.k8s['namespace']) {
                    massagedData[column] = <Link routeName='pod' params={{name: payload.k8s[column], namespace: payload.k8s['namespace']}}>{payload.k8s[column]}</Link>
                  } else {
                    massagedData[column] = payload.k8s[column]
                  }
                } else {
                  massagedData[column] = JSON.stringify(payload[column]);
                }
              })
              _.debounce(() => setBufferedGadgetData((prevData) => {
                const newBufferedData = {...prevData};
                newBufferedData[dsID] = [...newBufferedData[dsID], massagedData];
                return newBufferedData;
              }), 1000)();
            }
          }
       }
  }, (err) => {
      console.error(err);
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
