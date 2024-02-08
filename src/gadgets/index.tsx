import { useLocation, useParams } from 'react-router';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { useEffect, useState } from 'react';
import { JsonStreamParser, isIGPod, pubSub } from './helper';
import { makeStyles } from '@mui/styles';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { Button, Paper, Grid, Checkbox, Box } from '@mui/material';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';
import {
  SectionBox,
  SectionHeader,
  SimpleTable,
  Loader,
  DateLabel,
  Link,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Icon } from '@iconify/react';
import _ from 'lodash';
import { prepareFilters } from './filters';
import { BarChart } from './barChart';

function GenericGadgetRenderer(props: {
  name: string;
  category: string;
  gadget: any;
  columns: {
    label: string;
    getter: (...args) => any;
  }[];
  gadgetID: string;
  isDataAccessTypeObject?: boolean;
}) {
  const { name, category, gadget, columns, gadgetID } = props;
  console.log('columns are ', columns);
  const { params, operatorParamsCollection } = gadget;
  const decoder = new TextDecoder('utf-8');
  const [entries, setEntries] = useState([]);
  const [pods, error] = K8s.ResourceClasses.Pod.useList();
  const [nodes, nodesError] = K8s.ResourceClasses.Node.useList();
  const [namespaces, namespaceError] = K8s.ResourceClasses.Namespace.useList();
  const [igPod, setIGPod] = useState(null);
  const [loading, setLoading] = React.useState(false);
  const execRef = React.useRef(null);
  const [filters, setFilters] = React.useState({});
  const [applyFilters, setApplyFilters] = React.useState(false);
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [gadgetPayload, setGadgetPayload] = React.useState(null);
  const [isBackgroundRunning, setIsBackgroundRunning] = React.useState(gadgetPayload);
  const gadgetListID = 'gadget-list';
  const [nodeToWorkOn, setNodeToWorkOn] = React.useState(null);
  const handleChange = event => {
    setIsBackgroundRunning(event.target.checked);
  };

  async function prepareSocket() {
    return new Promise((resolve, reject) => {
      let intervalID = setInterval(() => {
        let socket = execRef.current.getSocket();
        console.log('socket is ready');

        if (socket) {
          clearInterval(intervalID);
          resolve(socket);
        }
      }, 0);
    });
  }

  function runGadgetWithActionAndPayload(socket, action, payload, extraParams = {}) {
    if(!socket) {
      return
    }
    console.log('action and payload', action, payload);
    socket.send('\0' + JSON.stringify({ action, payload, ...extraParams }) + '\n');
  }


  useEffect(() => {
    if (!pods || !nodeToWorkOn) {
      return;
    }
    const igPods = pods?.filter(isIGPod);
    const igPod = igPods?.find(pod => pod.spec.nodeName === nodeToWorkOn.metadata.name);
    if (!igPod) {
      return;
    }
    setIGPod(igPod);
  }, [nodeToWorkOn]);

  useEffect(() => {
    if (!igPod) {
      return;
    }

    if (execRef.current) {
      return;
    }

    if (applyFilters) {
      execRef.current.close();
    }

    let socket;
    (async function() {
      execRef.current = await igPod.exec('gadget', () => {}, {
        command: ['/usr/bin/socat', '/run/gadgetstreamingservice.socket', '-'],
        tty: false,
        stdin: true,
        stdout: true,
        stderr: false,
      });
      socket = await prepareSocket();

      socket.addEventListener('message', event => {
        const items = new Uint8Array(event.data);
        const text = decoder.decode(items.slice(1));
  
        if (new Uint8Array(items)[0] !== 1) {
          return;
        }
  
        const parser = new JsonStreamParser();
        parser.feed(text);
      });
  
      socket.addEventListener('open', () =>
        runGadgetWithActionAndPayload(socket, 'list', {}, { id: gadgetListID })
      );
    })();
   

    

    return () => {
      execRef.current.cancel();
    };
  }, [igPod]);

  React.useEffect(() => {
    pubSub.subscribe(gadgetID, (data: any) => {
      setLoading(false);

      if (name === 'block-io' && category === 'profile') {
        const unit = data.payload.unit || '';
        const intervals = data.payload?.intervals;
        const labels = intervals.map(interval => `${interval.start}-${interval.end} ${unit}`);
        setEntries({
          labels: labels,
          datasets: [
            {
              label: 'count',
              data: intervals.map(interval => interval.count),
              borderColor: 'rgb(53, 162, 235)',
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
          ],
        });
      } else if (name === 'tcprtt' && category === 'profile') {
        const intervals = data.payload?.histograms[0]?.intervals;
        const unit = data.payload?.histograms[0]?.unit || '';
        const labels = intervals.map(interval => `${interval.start}-${interval.end} ${unit}`);
        setEntries({
          labels: labels,
          datasets: [
            {
              label: 'count',
              data: intervals.map(interval => interval.count),
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
          ],
        });
      } else {
        let dataToUse = data;
        if (dataToUse.payload) {
          dataToUse = data['payload'];
        }
        if (!Array.isArray(dataToUse)) {
          setEntries(prev => (prev === null ? [dataToUse] : [...prev, dataToUse]));
        } else {
          setEntries(prev => (prev === null ? [...dataToUse] : [...prev, ...dataToUse]));
        }
      }
    });

    pubSub.subscribe(gadgetListID, (data: any) => {
      const { persistentGadgets } = data.payload;
      persistentGadgets?.forEach(item => {
        {
          const { tags } = item;
          if (tags.includes(gadgetID)) {
            setGadgetPayload(item);
            setIsBackgroundRunning(true);
            setLoading(true);
            setGadgetRunningStatus(true);
          }
        }
      });
    });
  }, []);

  React.useEffect(() => {
    if (gadgetPayload) {
      pubSub.subscribe(gadgetPayload.id, data => {
        setLoading(false);
        if (name === 'block-io' && category === 'profile') {
          const unit = data.payload.unit || '';
          const intervals = data.payload?.intervals;
          const labels = intervals.map(interval => `${interval.start}-${interval.end} ${unit}`);
          setEntries({
            labels: labels,
            datasets: [
              {
                label: 'count',
                data: intervals.map(interval => interval.count),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
              },
            ],
          });
        } else if (name === 'tcprtt' && category === 'profile') {
          const intervals = data.payload?.histograms[0]?.intervals;
          const unit = data.payload?.histograms[0]?.unit || '';
          const labels = intervals.map(interval => `${interval.start}-${interval.end} ${unit}`);
          setEntries({
            labels: labels,
            datasets: [
              {
                label: 'count',
                data: intervals.map(interval => interval.count),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
              },
            ],
          });
        } else {
          let dataToUse = data;
          if (dataToUse.payload) {
            dataToUse = data['payload'];
          }
          if (!Array.isArray(dataToUse)) {
            setEntries(prev => (prev === null ? [dataToUse] : [...prev, dataToUse]));
          } else {
            setEntries(prev => (prev === null ? [...dataToUse] : [...prev, ...dataToUse]));
          }
        }
      });
    }
  }, [gadgetPayload]);

  useEffect(() => {
    const preparedFilters = prepareFilters(params, operatorParamsCollection, pods, namespaces);
    setFilters({ ...preparedFilters });
  }, [operatorParamsCollection, pods, namespaces]);

  useEffect(() => {}, [isBackgroundRunning]);

  function gadgetStartStopHandler(action) {
    if (!action) {
      setLoading(true);
    }
    console.log('action is', action);
    const socket = execRef.current.getSocket();
    if (!action) {
      // stop the gadget
      setGadgetRunningStatus(true);
      let massagedFilters = {};

      Object.keys(filters).forEach(key => {
        massagedFilters[key] = filters[key].value;
      });

      runGadgetWithActionAndPayload(socket, 'start', {
        gadgetName: name,
        gadgetCategory: category,
        id: gadgetPayload ? gadgetPayload.id : gadgetID,
        params: { ...massagedFilters },
        background: isBackgroundRunning,
      });
    } else {
      if (gadgetPayload && !isBackgroundRunning) {
        runGadgetWithActionAndPayload(socket, 'stop', {
          gadgetName: name,
          gadgetCategory: category,
          id: gadgetPayload ? gadgetPayload.id : gadgetID,
        });

        runGadgetWithActionAndPayload(socket, 'delete', {
          name,
          category,
          id: gadgetPayload ? gadgetPayload.id : gadgetID,
        });
      } else {
        runGadgetWithActionAndPayload(socket, 'stop', {
          gadgetName: name,
          id: gadgetPayload ? gadgetPayload.id : gadgetID,
          gadgetCategory: category,
        });
      }
      setGadgetRunningStatus(false);
    }
  }

  if (!nodes) {
    return <Loader />;
  }

  if (nodesError) {
    return <div>Uhooooh..... Error fetching nodes {nodesError}</div>;
  }
  if (!nodeToWorkOn) {
    return (
      <SectionBox
        title={name}
        backLink={true}
        style={{
          margin: '1rem 0rem',
        }}
      >
        <SectionHeader title="Select node to run this gadget on" />
        <Grid container spacing="2">
          {nodes?.map(node => {
            return (
              <Grid item md={8}>
                <Button
                  onClick={() => setNodeToWorkOn(node)}
                  variant="outlined"
                  style={{
                    width: '100%',
                    margin: '0.1rem 0rem',
                  }}
                >
                  {node.metadata.name}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </SectionBox>
    );
  }

  return (
    <SectionBox
      title={name}
      backLink={true}
      style={{
        margin: '1rem 0rem',
      }}
    >
      {Object.keys(filters).length !== 0 && (
        <Accordion
          square
          component={Paper}
          style={{
            margin: '1rem 0rem',
          }}
        >
          <AccordionSummary
            expandIcon={<Icon icon={'mdi:chevron-down'} />}
            aria-controls=""
            id="gadget-filters"
          >
            <SectionHeader title="Filters" />
          </AccordionSummary>

          <AccordionDetails>
            {
              <Grid container spacing="2">
                {Object.keys(filters)?.map(key => {
                  const FilterComponent = filters[key].component;
                  return (
                    <Grid item md={4}>
                      <FilterComponent key={Math.random() + key} />
                    </Grid>
                  );
                })}
              </Grid>
            }
          </AccordionDetails>
        </Accordion>
      )}
      <Box mb={2}>
        <Grid container justifyContent="space-between" spacing="2">
          <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>
          {category === 'profile' && (
            <Grid item>
              Run In the Background
              <Checkbox checked={isBackgroundRunning} onChange={handleChange} />
            </Grid>
          )}
          <Grid item>
            <Button onClick={() => gadgetStartStopHandler(gadgetRunningStatus)} variant="outlined">
              {!gadgetRunningStatus ? 'Start' : 'Stop'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      {!loading ? (
        (name === 'block-io' && category === 'profile') ||
        (name === 'tcprtt' && category === 'profile') ? (
          <BarChart
            data={entries}
            title={
              name === 'block-io'
                ? 'Block I/O distribution'
                : name === 'tcprtt'
                ? 'tcp round trip time'
                : ''
            }
          />
        ) : (
          <SimpleTable columns={columns} data={entries} />
        )
      ) : (
        <Loader />
      )}
    </SectionBox>
  );
}

const useJsonPrettyStyle = makeStyles({
  root: {
    '& .__json-pretty__': {
      background: 'none',
    },
  },
});
export default function Gadget() {
  const location = useLocation();
  const classes = useJsonPrettyStyle();
  const { gadget, category } = useParams<{ gadget: string; category: string }>();
  const gadgetObj = location.state;
  let columns = [];
  if (gadgetObj.columnsDefinition) {
    let gadgetColumnKeys = Object.keys(gadgetObj.columnsDefinition);
    for (let i = 0; i < Object.keys(gadgetObj.columnsDefinition).length; i++) {
      const col = gadgetObj.columnsDefinition[gadgetColumnKeys[i]];
      if (col.name.includes('.')) {
        continue;
      }
      columns.push({
        label: col.name,
        getter: e => {
          if (_.isObject(e[col.name])) {
            //@ts-ignore
            return <JSONPretty data={e[col.name]} className={classes.root} />;
          }
          if (col.name === 'namespace' || col.name === 'pod' || col.name === 'node') {
            return (
              <Link
                routeName={col.name}
                params={{ name: e[col.name] || 'default', namespace: e['namespace'] || 'default' }}
              >
                {col.name === 'namespace' ? e[col.name] || 'default' : e[col.name]}
              </Link>
            );
          }
          if (col.name === 'timestamp') {
            return <DateLabel date={e[col.name]} />;
          }
          return e[col.name];
        },
        hide: !col.visible,
      });
    }
  }

  return (
    <GenericGadgetRenderer
      name={gadget}
      category={category}
      gadgetID={`ig-gadget-${gadget}-${category}`}
      isDataAccessTypeObject={true}
      gadget={gadgetObj}
      columns={columns}
    />
  );
}
