import { DateLabel, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Box, Button, Grid } from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useHistory, useParams } from 'react-router';
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
  } = props;
  console.log('gadget data is ', gadgetData);
  const { enqueueSnackbar } = useSnackbar();
  const [gadgetConn, setGadgetConn] = React.useState(null);
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const { imageName } = useParams();
  const history = useHistory();
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;
  const cluster = getCluster();
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
      <SectionBox title={imageName}>
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
                  disabled={podsSelected.length === 0}
                  onClick={() => {
                    if (gadgetRunningStatus) {
                      // delete the gadget instance
                      gadgetConn.deleteGadgetInstance(gadgetInstance.id, () => {
                        enqueueSnackbar('Background instance deleted', { variant: 'success' });
                        if (cluster) {
                          history.replace(`/c/${cluster}/gadgets/background`);
                        }
                      });
                    }
                    setGadgetRunningStatus(prevVal => !prevVal);
                  }}
                  variant="outlined"
                >
                  {loading ? 'Processing' : !gadgetRunningStatus ? 'Attach' : 'Delete'}
                </Button>
              )}
              {!gadgetInstance && (
                <Button
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
        {fields?.find(field => field.header === IS_METRIC) ? (
          <MetricChart data={gadgetData ? gadgetData[dataSourceID] : []} fields={fields} />
        ) : (
          fields && (
            <Table
              columns={fields}
              data={gadgetData ? gadgetData[dataSourceID] : []}
              loading={loading}
            />
          )
        )}
      </SectionBox>
    )
  );
}
