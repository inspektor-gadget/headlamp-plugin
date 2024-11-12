import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import _ from 'lodash';
import React from 'react';
import { useParams } from 'react-router';
import { getProperty } from '../../gadgets/helper';
import usePortForward from '../../gadgets/igSocket';
import { HEADLAMP_KEY, HEADLAMP_VALUE, IS_METRIC } from '../helpers';

export default function GenericGadgetRenderer(props: {
  podsSelected: any;
  podStreamsConnected: any;
  podSelected: any;
  setGadgetConfig: any;
  dataColumns: any;
  setDataColumns: any;
  gadgetRunningStatus: any;
  filters: any;
  setPodStreamsConnected: any;
  setBufferedGadgetData: any;
  setLoading: any;
  setDataSources: any;
  gadgetInstance: any;
  setIsGadgetInfoFetched: any;
  setGadgetData: any;
  node: any;
}) {
  const {
    podStreamsConnected,
    podSelected,
    setGadgetConfig,
    dataColumns,
    setDataColumns,
    gadgetRunningStatus,
    filters,
    setPodStreamsConnected,
    setBufferedGadgetData,
    setLoading,
    setDataSources,
    podsSelected,
    gadgetInstance,
    setIsGadgetInfoFetched,
    setGadgetData,
    node,
  } = props;
  const { ig, isConnected } = usePortForward(
    `api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`
  );
  const gadgetRef = React.useRef(null);
  const gadgetRunningStatusRef = React.useRef(gadgetRunningStatus);
  const areAllPodStreamsConnected = podsSelected.length === podStreamsConnected;
  const { imageName } = useParams();

  function prepareGadgetInfo(info) {
    setIsGadgetInfoFetched(true);
    const fields = {};
    info.dataSources.forEach((dataSource, index) => {
      const annotations = dataSource.annotations;
      const isMetricAnnotationAvailable =
        annotations &&
        Object.keys(annotations).find(annotationKey => {
          if (annotationKey === 'metrics.print') {
            return annotations[annotationKey] === 'true';
          }
          return false;
        });
      if (isMetricAnnotationAvailable) {
        const fieldsFromDataSource = dataSource.fields
          .filter(field => (field.flags & 4) === 0)
          .map(field => field.fullName)
          .filter(field => field !== 'k8s');
        const key = dataSource.fields.find(field => field.tags.includes('role:key'))?.fullName;
        fieldsFromDataSource.push(`${HEADLAMP_KEY}_${key}`);
        const value = dataSource.fields.find(field => !field.tags.includes('role:key'))?.fullName;
        fieldsFromDataSource.push(`${HEADLAMP_VALUE}_${value}`);
        fieldsFromDataSource.push(IS_METRIC);
        fields[dataSource.id || index] = fieldsFromDataSource;
      } else {
        fields[dataSource.id || index] = dataSource.fields
          .filter(field => (field.flags & 4) === 0)
          .map(field => field.fullName)
          .filter(field => field !== 'k8s');
      }
    });
    setGadgetConfig(info);
    setDataSources(info.dataSources);
    setDataColumns({ ...fields });
  }
  React.useEffect(() => {
    setLoading(false);
  }, [gadgetInstance]);
  React.useEffect(() => {
    if (isConnected && ig) {
      setPodStreamsConnected(prevVal => prevVal + 1);
      ig.getGadgetInfo(
        {
          version: 1,
          imageName: `${imageName}`,
        },
        info => {
          prepareGadgetInfo(info);
        },
        err => {
          console.error(err);
        }
      );
    }
  }, [isConnected]);

  function handleGadgetData(data, dsID) {
    if (!gadgetRunningStatusRef.current && !gadgetInstance) {
      return;
    }
    setLoading(false);
    let massagedData = {};
    const columns = dataColumns[dsID];
    if (columns?.length > 0) {
      if (columns.includes(IS_METRIC)) {
        massagedData = data;
      } else {
        const payload = data;
        columns.forEach(column => {
          if (
            column === IS_METRIC ||
            column.includes(HEADLAMP_KEY) ||
            column.includes(HEADLAMP_VALUE)
          ) {
            return;
          }
          const value = getProperty(payload, column);
          if (column === 'k8s.containerName') {
            massagedData[column] = value;
          } else if (
            column === 'k8s.namespace' ||
            column === 'k8s.node' ||
            column === 'k8s.podName'
          ) {
            if (column === 'k8s.namespace' || column === 'k8s.node') {
              massagedData[column] = (
                <Link routeName={column} params={{ name: value }}>
                  {value}
                </Link>
              );
            } else if (column === 'k8s.podName' && payload.k8s['namespace']) {
              massagedData[column] = (
                <Link routeName="pod" params={{ name: value, namespace: payload.k8s['namespace'] }}>
                  {value}
                </Link>
              );
            }
          } else {
            // remove quotes if any from string
            massagedData[column] = JSON.stringify(value).replace(/['"]+/g, '');
          }
        });
      }

      _.debounce(() => {
        if (dataColumns[dsID]?.includes(IS_METRIC)) {
          setGadgetData(prevData => {
            return {
              ...prevData,
              [dsID]: { [node]: massagedData },
            };
          });
          return;
        }
        setBufferedGadgetData(prevData => {
          const newBufferedData = { ...prevData };
          if (!newBufferedData[dsID]) {
            newBufferedData[dsID] = [];
          }
          newBufferedData[dsID] = [...newBufferedData[dsID], massagedData];
          return newBufferedData;
        }),
          1000;
      })();
    }
  }

  function gadgetStartStopHandler() {
    setLoading(true);
    if (!gadgetRunningStatusRef.current && !gadgetInstance) {
      gadgetRef?.current?.stop();
      return;
    }
    if (gadgetInstance) {
      setLoading(true);
      ig.attachGadgetInstance(
        {
          id: gadgetInstance.id,
          version: gadgetInstance.gadgetConfig.version,
        },
        {
          onGadgetInfo: gi => {
            console.log('gadget info is ', gi);
            prepareGadgetInfo(gi);
          },
          onReady: () => {
            console.log('gadget is ready');
          },
          onDone: () => {
            setLoading(false);
          },
          onError: error => {
            console.log('error is ', error);
          },
          onData: (dsID, dataFromGadget) => {
            if (_.isArray(dataFromGadget)) {
              dataFromGadget.forEach(d => {
                handleGadgetData(d, dsID);
              });
            } else {
              handleGadgetData(dataFromGadget, dsID);
            }
          },
        }
      );
      return;
    } else {
      gadgetRef.current = ig.runGadget(
        {
          version: 1,
          imageName: `${imageName}`,
          paramValues: {
            ...filters,
          },
        },
        {
          onGadgetInfo: () => {},
          onReady: () => {
            if (!gadgetRunningStatusRef.current) {
              gadgetRef?.current?.stop();
            }
          },
          onDone: () => {
            setLoading(false);
          },
          onError: error => {
            console.log('error is ', error);
          },

          onData: (dsID, dataFromGadget) => {
            if (_.isArray(dataFromGadget)) {
              dataFromGadget.forEach(d => {
                handleGadgetData(d, dsID);
              });
            } else {
              handleGadgetData(dataFromGadget, dsID);
            }
          },
        },
        err => {
          console.log('got error', err);
        }
      );
    }
  }

  React.useEffect(() => {
    gadgetRunningStatusRef.current = gadgetRunningStatus;
    if (areAllPodStreamsConnected) {
      gadgetStartStopHandler();
    }
  }, [gadgetRunningStatus]);

  React.useEffect(() => {
    return () => {
      if (gadgetRef.current) {
        gadgetRef.current.stop();
      }
    };
  }, []);

  return null;
}
