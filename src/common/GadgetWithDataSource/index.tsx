import { DateLabel, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, Button, Grid } from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useParams } from 'react-router';
import { GadgetConnectionForBackgroundRunningProcess } from '../../gadgets/conn';
import GadgetFilters from '../../gadgets/gadgetFilters';
import { IS_METRIC } from '../helpers';
import { MetricChart } from '../MetricChart';

export function GadgetWithDataSource(props: {
  podsSelected: any;
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
  renderCreateBackgroundGadget: boolean;
  gadgetInstance: any;
  setOpen: any;
}) {
  const {
    podStreamsConnected,
    setGadgetData,
    setBufferedGadgetData,
    setGadgetRunningStatus,
    gadgetRunningStatus,
    setFilters,
    filters,
    loading,
    gadgetConfig,
    dataSourceID,
    gadgetData,
    columns,
    bufferedGadgetData,
    podsSelected,
    renderCreateBackgroundGadget,
    gadgetInstance,
    setOpen,
  } = props;
  const { enqueueSnackbar } = useSnackbar();
  const [gadgetConn, setGadgetConn] = React.useState(null);
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const { imageName } = useParams();
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;
  const fields = React.useMemo(() => {
    return columns?.map(column => {
      return {
        header: column,
        accessorFn: data => {
          if (column === 'timestamp') {
            return <DateLabel date={data[column]} />;
          }
          return data[column];
        },
      };
    });
  }, [columns]);
  React.useEffect(() => {
    if (bufferedGadgetData[dataSourceID]?.length > 0) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData[dataSourceID]]);
  return (
    areAllPodStreamsConnected && (
      <SectionBox
        backLink
        title={
          <Box display="flex" alignItems="center">
            <Box>
              <h2>{imageName}</h2>
            </Box>
            <Box ml={1}>
              <Button
                sx={theme => ({
                  color: theme.palette.clusterChooser.button.color,
                  background: theme.palette.clusterChooser.button.background,
                  '&:hover': {
                    background: theme.palette.clusterChooser.button.hover.background,
                  },
                  maxWidth: '20em',
                  textTransform: 'none',
                  padding: '6px 22px',
                })}
                onClick={() => {
                  setOpen(true);
                }}
              >
                Configure Nodes
              </Button>
            </Box>
          </Box>
        }
      >
        {!gadgetInstance && (
          <GadgetFilters
            config={gadgetConfig}
            isConnected={podStreamsConnected}
            setFilters={setFilters}
            filters={filters}
            onApplyFilters={() => {
              setGadgetData(prevData => {
                prevData[dataSourceID] = [];
                setBufferedGadgetData({ ...prevData });
                return { ...prevData };
              });

              // first send a stop action to stop this gadget and then start it again
              if (gadgetRunningStatus) {
                setGadgetRunningStatus(false);
              }
              setGadgetRunningStatus(true);
            }}
          />
        )}
        {nodes && pods && (
          <GadgetConnectionForBackgroundRunningProcess
            nodes={nodes}
            pods={pods}
            callback={setGadgetConn}
          />
        )}
        <Box m={2}>
          <Grid container justifyContent="space-between" spacing="2">
            <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>
            {!gadgetInstance && renderCreateBackgroundGadget && (
              <Grid item>
                <Button
                  disabled={gadgetConn === null}
                  onClick={() => {
                    gadgetConn.createGadgetInstance(
                      {
                        version: 1,
                        imageName: `${imageName}`,
                        paramValues: {
                          ...filters,
                        },
                      },
                      succ => {
                        enqueueSnackbar('Background instance created', { variant: 'success' });
                        console.log('succ is ', succ);
                      },
                      err => {
                        console.error(err);
                      }
                    );
                  }}
                  variant="outlined"
                >
                  Create Background Instance
                </Button>
              </Grid>
            )}
            <Grid item>
              {gadgetInstance && (
                <Button
                  sx={theme => ({
                    color: theme.palette.clusterChooser.button.color,
                    background: theme.palette.clusterChooser.button.background,
                    '&:hover': {
                      background: theme.palette.clusterChooser.button.hover.background,
                    },
                    maxWidth: '20em',
                    textTransform: 'none',
                    padding: '6px 22px',
                  })}
                  disabled={podsSelected.length === 0 || gadgetRunningStatus}
                  onClick={() => {
                    if (gadgetRunningStatus) {
                      // delete the gadget instance
                    }
                    setGadgetRunningStatus(prevVal => !prevVal);
                  }}
                  variant="outlined"
                >
                  {loading ? 'Processing' : !gadgetRunningStatus ? 'Attach' : 'Attached'}
                </Button>
              )}
              {!gadgetInstance && (
                <Button
                  sx={theme => ({
                    color: theme.palette.clusterChooser.button.color,
                    background: theme.palette.clusterChooser.button.background,
                    '&:hover': {
                      background: theme.palette.clusterChooser.button.hover.background,
                    },
                    maxWidth: '20em',
                    textTransform: 'none',
                    padding: '6px 22px',
                  })}
                  disabled={podsSelected.length === 0}
                  onClick={() => {
                    if (!gadgetRunningStatus) {
                      setGadgetData(prevData => {
                        prevData[dataSourceID] = [];
                        return { ...prevData };
                      });
                      setBufferedGadgetData(prevData => {
                        prevData[dataSourceID] = [];
                        return { ...prevData };
                      });
                    }
                    setGadgetRunningStatus(prevVal => !prevVal);
                  }}
                  variant="outlined"
                >
                  {loading ? 'Processing' : !gadgetRunningStatus ? 'Start' : 'Stop'}
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
        {fields?.find(field => field.header === IS_METRIC)
          ? podsSelected.map(pod => {
              const node = pod?.spec.nodeName;
              if (!node || !gadgetData[dataSourceID]) {
                return null;
              }
              return (
                <MetricChart
                  data={gadgetData ? gadgetData[dataSourceID][node] : []}
                  fields={fields}
                  key={pod.jsonData.metadata.name}
                  node={node}
                />
              );
            })
          : fields && (
              <Table
                columns={fields}
                data={gadgetData ? gadgetData[dataSourceID] : []}
                loading={loading}
              />
            )}
      </SectionBox>
    )
  );
}
