import { Icon } from '@iconify/react';
import { DateLabel, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Grid,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo } from 'react';
import GadgetFilters from '../../gadgets/gadgetFilters';
import { IS_METRIC } from '../helpers';
import { MetricChart } from '../MetricChart';

interface GadgetWithDataSourceProps {
  podsSelected: any[];
  podStreamsConnected: number;
  setGadgetData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setBufferedGadgetData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setGadgetRunningStatus: React.Dispatch<React.SetStateAction<boolean>>;
  gadgetRunningStatus: boolean;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  filters: Record<string, any>;
  loading: boolean;
  gadgetConfig: any;
  dataSourceID: string;
  gadgetData: Record<string, any>;
  columns: string[];
  bufferedGadgetData: Record<string, any[]>;
  renderCreateBackgroundGadget: boolean;
  gadgetInstance?: any;
  gadgetConn: any;
  isRunningInBackground: boolean;
  isInstantRun: boolean;
  setIsRunningInBackground: React.Dispatch<React.SetStateAction<boolean>>;
  onGadgetInstanceCreation: (success: any) => void;
  error: any;
  headlessGadgetRunCallback: (success: any) => void;
  headlessGadgetDeleteCallback: (success: any) => void;
  handleRun: () => void;
}

export function GadgetWithDataSource(props: GadgetWithDataSourceProps) {
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
    gadgetInstance,

    isInstantRun,
    error,
    headlessGadgetDeleteCallback = () => {},
    headlessGadgetRunCallback = () => {},
    handleRun = () => {},
  } = props;
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;

  useEffect(() => {
    if (gadgetInstance) {
      const timer = setTimeout(() => {
        setGadgetRunningStatus(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(gadgetInstance || {})]);

  const fields = useMemo(
    () =>
      columns?.map(column => ({
        header: column,
        accessorFn: (data: any) =>
          column === 'timestamp' ? <DateLabel date={data[column]} /> : data[column],
      })),
    [columns]
  );

  useEffect(() => {
    // also bufferedGadgetData[dataSourceID] can be an object as well
    if (bufferedGadgetData[dataSourceID]) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData[dataSourceID], dataSourceID, setGadgetData]);

  function handleStartStop() {
    if (!gadgetRunningStatus) {
      setGadgetData(prev => ({
        ...prev,
        [dataSourceID]: [],
      }));
      setBufferedGadgetData(prev => ({
        ...prev,
        [dataSourceID]: [],
      }));
      handleRun();
    }

    setGadgetRunningStatus(prev => !prev);
    // Reset data when starting
  }

  const renderContent = () => {
    const hasMetricField = fields?.some(field => field.header === IS_METRIC);
    if (hasMetricField) {
      return podsSelected.map(pod => {
        const node = pod?.spec.nodeName;
        if (!node || !gadgetData[dataSourceID]) return null;
        return (
          <MetricChart
            key={pod?.jsonData.metadata.name}
            data={gadgetData[dataSourceID][node] || []}
            fields={fields}
            node={node}
          />
        );
      });
    }

    return (
      fields && <Table columns={fields} data={gadgetData[dataSourceID] || []} loading={loading} />
    );
  };

  return (
    <>
      {isInstantRun && (
        <Box mb={1}>
          <Accordion>
            <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" />}>
              <Typography>Configure Params</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {!error ? (
                <GadgetFilters
                  config={gadgetConfig}
                  setFilters={setFilters}
                  filters={filters}
                  onApplyFilters={() => {
                    setGadgetData(prev => ({
                      ...prev,
                      [dataSourceID]: [],
                    }));
                    setBufferedGadgetData(prev => ({
                      ...prev,
                      [dataSourceID]: [],
                    }));

                    // Toggle running status
                    setGadgetRunningStatus(prev => !prev);
                  }}
                />
              ) : (
                <Typography variant="body1" color="error">
                  {error}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
      {areAllPodStreamsConnected && (
        <Box mt={2}>
          <Box m={2}>
            <Grid container justifyContent="space-between" spacing={2}>
              <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>
              <Grid item>
                {gadgetInstance ? (
                  <>
                    <Button
                      // disabled={podsSelected.length === 0 || gadgetRunningStatus}
                      onClick={() => {
                        if (gadgetRunningStatus) {
                          headlessGadgetDeleteCallback(gadgetInstance);
                        }
                        headlessGadgetRunCallback(gadgetInstance);
                      }}
                      variant="outlined"
                    >
                      {loading ? 'Processing' : !gadgetRunningStatus ? 'Run' : 'Stop'}
                    </Button>
                  </>
                ) : (
                  podsSelected.length > 0 && (
                    <Button
                      disabled={podsSelected.length === 0}
                      onClick={handleStartStop}
                      variant="outlined"
                    >
                      {loading ? 'Processing' : !gadgetRunningStatus ? 'Start' : 'Stop'}
                    </Button>
                  )
                )}
              </Grid>
            </Grid>
          </Box>

          {renderContent()}
        </Box>
      )}
    </>
  );
}
