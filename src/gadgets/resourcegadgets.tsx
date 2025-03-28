import { Icon } from '@iconify/react';
import { ConfirmDialog, DateLabel, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HEADLAMP_KEY, HEADLAMP_METRIC_UNIT, HEADLAMP_VALUE, IS_METRIC } from '../common/helpers';
import { MetricChart } from '../common/MetricChart';
import { isIGPod } from './helper';
import usePortForward from './igSocket';
import { processGadgetData } from './utility';

function getGadgetPodForThisResourceNode(node, pods) {
  if (!node || !pods) return null;
  return pods.find(pod => pod.spec.nodeName === node && isIGPod(pod));
}

const RunningGadgetsForResource = ({ resource, open }) => {
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [gadgetInstances, setGadgetInstances] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState(null);

  const node =
    resource?.jsonData.kind === 'Node'
      ? resource?.jsonData.metadata.name
      : resource?.jsonData?.spec?.nodeName;
  const matchingGadgetPodForThisResourceNode = getGadgetPodForThisResourceNode(node, pods);
  const { ig } = usePortForward(
    matchingGadgetPodForThisResourceNode
      ? `api/v1/namespaces/gadget/pods/${matchingGadgetPodForThisResourceNode?.jsonData.metadata.name}/portforward?ports=8080`
      : ''
  );
  const cluster = getCluster();

  const processLocalStorageInstances = useMemo(
    () => localStorageInstances => {
      if (!localStorageInstances) return [];
      return localStorageInstances
        .filter(item => item.kind === resource?.jsonData.kind && item.cluster === cluster)
        .filter(i => i.isEmbedded);
    },
    [resource?.jsonData.kind, cluster, open]
  );

  useEffect(() => {
    // Try to fetch from localStorage
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );
    const processedInstances = processLocalStorageInstances(localStorageInstances);
    setGadgetInstances(processedInstances);
  }, [processLocalStorageInstances]);

  const handleDeleteInstance = id => {
    setInstanceToDelete(id);
    setOpenConfirmDialog(true);
  };

  const confirmDeleteInstance = () => {
    if (!instanceToDelete) return;

    // Get a copy of the current localStorage
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );

    // Find the instance to delete in the current state
    const instance = gadgetInstances.find(instance => instance.id === instanceToDelete);
    if (!instance) {
      console.error('Instance to delete not found in state.');
      setInstanceToDelete(null);
      setOpenConfirmDialog(false);
      return;
    }

    let updatedLocalStorageInstances = [...localStorageInstances];

    if (instance.isHeadless) {
      // Handle remote instance deletion
      ig.deleteGadgetInstance(
        instanceToDelete,
        () => {
          console.log('Remote instance deleted:', instanceToDelete);
        },
        err => {
          console.error('Error deleting remote instance:', err);
        }
      );
    }

    console.log('Deleting instance:', instanceToDelete);

    // Remove the instance from localStorage
    updatedLocalStorageInstances = updatedLocalStorageInstances.filter(
      i => i.id !== instanceToDelete
    );

    // Update localStorage and state
    localStorage.setItem(
      'headlamp_embeded_resources',
      JSON.stringify(updatedLocalStorageInstances)
    );

    setGadgetInstances(prevInstances =>
      prevInstances.filter(instance => instance.id !== instanceToDelete)
    );

    setInstanceToDelete(null);
    setOpenConfirmDialog(false);
  };

  // Group instances by image name
  const groupedInstances = useMemo(() => {
    if (!gadgetInstances) return {};

    return gadgetInstances.reduce((acc, instance) => {
      const imageName = instance.gadgetConfig.imageName;
      if (!acc[imageName]) {
        acc[imageName] = [];
      }
      acc[imageName].push(instance);
      return acc;
    }, {});
  }, [gadgetInstances]);

  if (!gadgetInstances || gadgetInstances.length === 0) return null;
  return (
    <Box sx={{ width: '100%' }}>
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Instance"
        description="Are you sure you want to delete this instance?"
        onConfirm={confirmDeleteInstance}
        handleClose={() => {
          setOpenConfirmDialog(false);
          setInstanceToDelete(null);
        }}
      />

      {/* Grouped Instances */}
      {Object.entries(groupedInstances).map(([imageName, instances]) => (
        <Box key={imageName} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            {imageName} ({instances.length})
          </Typography>

          {instances?.map(instance => (
            <Accordion key={instance.id} sx={{ mb: 1 }} defaultExpanded={instance.isHeadless}>
              <AccordionSummary
                expandIcon={<Icon icon="mdi:chevron-down" />}
                aria-controls={`panel-${instance.id}-content`}
                id={`panel-${instance.id}-header`}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {instance.name} ({instance.id.slice(-8)})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteInstance(instance.id);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <Icon icon="mdi:trash-can-outline" />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1, pt: 0 }}>
                <Box ml={2}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1 }}
                  >
                    Version: {instance.gadgetConfig.version} • Status:{' '}
                    {instance.isHeadless
                      ? 'Running'
                      : 'Running on demand (will stop if this view is closed)'}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />
                  <RunningGadgetForActiveTab instance={instance} resource={resource} ig={ig} />
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}
    </Box>
  );
};

const RunningGadgetForActiveTab = ({ instance, resource, ig }) => {
  const node =
    resource?.jsonData.kind === 'Node'
      ? resource?.jsonData.metadata.name
      : resource?.jsonData?.spec.nodeName;
  const [dataColumns, setDataColumns] = useState({});
  const [dataSources, setDataSources] = useState([]);
  const [, setGadgetConfig] = useState({});
  const [, setGadgetData] = useState({});
  const [bufferedGadgetData, setBufferedGadgetData] = useState({});
  const [isGadgetInfoFetched, setIsGadgetInfoFetched] = useState(false);
  const dataColumnsRef = useRef(dataColumns); // Create a ref to store dataColumns
  const stopAttachmentRef = useRef(null); // Reference to store the stop function
  const [error, setError] = useState(null);
  useEffect(() => {
    dataColumnsRef.current = dataColumns; // Update the ref whenever dataColumns changes
  }, [dataColumns]);

  const prepareGadgetInfo = info => {
    setIsGadgetInfoFetched(true);
    const fields = {};
    info.dataSources.forEach((dataSource, index) => {
      const annotations = dataSource.annotations;
      const isMetricAnnotationAvailable =
        annotations &&
        Object.keys(annotations).find(
          annotationKey =>
            annotationKey === 'metrics.print' && annotations[annotationKey] === 'true'
        );

      if (isMetricAnnotationAvailable) {
        const fieldsFromDataSource = dataSource.fields
          .filter(field => (field.flags & 4) === 0)
          .map(field => field.fullName)
          .filter(field => field !== 'k8s');

        const key = dataSource.fields.find(field => field.tags.includes('role:key'))?.fullName;
        const value = dataSource.fields.find(field => !field.tags.includes('role:key'));
        const metricUnit = value.annotations['metrics.unit'];
        fieldsFromDataSource.push(`${HEADLAMP_KEY}_${key}`);
        fieldsFromDataSource.push(`${HEADLAMP_VALUE}_${value?.fullName}`);
        fieldsFromDataSource.push(`${HEADLAMP_METRIC_UNIT}_${metricUnit}`);
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
  };

  // Effect for gadget attachment/running
  useEffect(() => {
    let isComponentMounted = true;

    const setupGadget = () => {
      if (!ig || !instance || !isComponentMounted) return null;

      let paramValues = { ...instance.gadgetConfig.paramValues };
      if (instance.kind === 'Pod') {
        paramValues = {
          ...paramValues,
          [`operator.KubeManager.podname`]: resource.jsonData.metadata.name,
          [`operator.KubeManager.namespace`]: resource.jsonData.metadata.namespace,
        };
      }

      setGadgetData({});
      setBufferedGadgetData({});
      setDataColumns({});
      setIsGadgetInfoFetched(false);

      let stopFunction;

      if (instance.isHeadless) {
        setTimeout(
          () =>
            ig.attachGadgetInstance(
              {
                id: instance.id,
                version: instance.gadgetConfig.version,
              },
              {
                onGadgetInfo: info => {
                  if (isComponentMounted) prepareGadgetInfo(info);
                },
                onData: (dsID, dataFromGadget) => {
                  if (!isComponentMounted) return;

                  const dataToProcess = Array.isArray(dataFromGadget)
                    ? dataFromGadget
                    : [dataFromGadget];
                  // filter out the data that is not for this pod
                  const filteredData = dataToProcess.filter(data => {
                    if (instance.kind !== 'Pod') return true;
                    const podName = data?.['k8s']?.podName;
                    const podNamespace = data?.['k8s']?.namespace;
                    return (
                      podName &&
                      podName.includes(resource.jsonData.metadata.name) &&
                      podNamespace &&
                      podNamespace.includes(resource.jsonData.metadata.namespace)
                    );
                  });
                  filteredData.forEach(data =>
                    processGadgetData(
                      data,
                      dsID,
                      dataColumnsRef.current[dsID] || [],
                      node,
                      setGadgetData,
                      setBufferedGadgetData
                    )
                  );
                },
              },
              err => {
                setError(err);
                if (isComponentMounted) console.error('Gadget attach error:', err);
              }
            ),
          2000
        );
      } else {
        const timeoutId = setTimeout(() => {
          if (!isComponentMounted) return;

          stopFunction = ig.runGadget(
            {
              imageName: instance.gadgetConfig.imageName,
              paramValues,
              version: instance.gadgetConfig.version,
            },
            {
              onGadgetInfo: info => {
                if (isComponentMounted) prepareGadgetInfo(info);
              },
              onData: (dsID, dataFromGadget) => {
                if (!isComponentMounted) return;
                const dataToProcess = Array.isArray(dataFromGadget)
                  ? dataFromGadget
                  : [dataFromGadget];

                dataToProcess.forEach(data =>
                  processGadgetData(
                    data,
                    dsID,
                    dataColumnsRef.current[dsID] || [],
                    node,
                    setGadgetData,
                    setBufferedGadgetData
                  )
                );
              },
            },
            err => {
              setError(err);
              if (isComponentMounted) console.error('Gadget run error:', err);
            }
          );
        }, 1000);

        // Return a function that clears the timeout if component unmounts before timeout completes
        return () => {
          clearTimeout(timeoutId);
        };
      }

      if (stopFunction) {
        stopAttachmentRef.current = stopFunction;
        return stopFunction;
      }

      return null;
    };

    const stopFunction = setupGadget();

    // Cleanup function
    return () => {
      isComponentMounted = false;

      // Clean up the gadget connection
      if (stopAttachmentRef.current && typeof stopAttachmentRef.current.stop === 'function') {
        stopAttachmentRef.current.stop();
        stopAttachmentRef.current = null;
      }

      // If setupGadget returned a function (from setTimeout), call it
      if (typeof stopFunction === 'function') {
        stopFunction();
      }

      // Reset state
      setGadgetData({});
      setBufferedGadgetData({});
    };
  }, [ig, instance, resource, node]);

  if (error) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="error">
          Error: {error.message}
        </Typography>
      </Paper>
    );
  }
  return dataSources.map((dataSource, index) => {
    const dataSourceID = dataSource?.id || index;
    return (
      <GadgetDataView
        key={`${instance.id}-${dataSourceID}`}
        resource={resource}
        dataSourceID={dataSourceID}
        dataColumns={dataColumnsRef.current}
        gadgetData={bufferedGadgetData}
        loading={!isGadgetInfoFetched}
      />
    );
  });
};

const GadgetDataView = ({ resource, dataSourceID, dataColumns, gadgetData, loading }) => {
  const fields = useMemo(() => {
    return (
      dataColumns?.[dataSourceID]?.map(column => ({
        header: column,
        accessorFn: data =>
          column === 'timestamp' ? <DateLabel date={data[column]} /> : data[column],
      })) || []
    );
  }, [dataSourceID, dataColumns]);

  const hasMetricField = fields.some(field => field.header === 'isMetric');

  if (hasMetricField) {
    const node =
      resource?.jsonData.kind === 'Node'
        ? resource?.jsonData.metadata.name
        : resource?.jsonData?.spec.nodeName;
    if (!node || !gadgetData[dataSourceID]) return null;

    return (
      <MetricChart
        key={resource?.jsonData.metadata.name}
        data={gadgetData[dataSourceID][node] || []}
        fields={fields}
        node={node}
      />
    );
  }

  if (!gadgetData[dataSourceID] || gadgetData[dataSourceID].length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center">
        <Icon icon="mdi:alert-circle-outline" width="2em" height="2em" />
        <Typography variant="body1">No Data Available</Typography>
      </Box>
    );
  }
  return (
    fields.length > 0 && (
      <Table
        columns={fields}
        data={gadgetData[dataSourceID] || []}
        loading={loading}
        emptyMessage={
          <Box display="flex" flexDirection="column" alignItems="center">
            <Icon icon="mdi:alert-circle-outline" width="2em" height="2em" />
            <Typography variant="body1">No Data Available</Typography>
          </Box>
        }
      />
    )
  );
};

export default RunningGadgetsForResource;
