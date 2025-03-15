import { DateLabel, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Box,
  Button,
  Checkbox,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material';
import { Icon } from '@iconify/react';
import React, { useEffect, useMemo, useState } from 'react';
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
    isRunningInBackground,
    isInstantRun,
    error
  } = props;
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;
  useEffect(() => {
    if (gadgetInstance) {
      const timer = setTimeout(() => {
        setGadgetRunningStatus(true);
      }, 1000);
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
    if (bufferedGadgetData[dataSourceID]?.length > 0) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData[dataSourceID], dataSourceID, setGadgetData]);

  function handleStartStop() {
    // Reset data when starting
    if (!gadgetRunningStatus) {
      setGadgetData(prev => ({
        ...prev,
        [dataSourceID]: [],
      }));
      setBufferedGadgetData(prev => ({
        ...prev,
        [dataSourceID]: [],
      }));
    }

    setGadgetRunningStatus(prev => !prev);
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
        <Accordion>
        <AccordionSummary
          expandIcon={<Icon icon="mdi:chevron-down" />}
        >
          <Typography>Configure Params</Typography>
        </AccordionSummary>
        <AccordionDetails>
        {!error ? <GadgetFilters
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
        /> : <Typography variant="body1" color="error">{error}</Typography>}
        </AccordionDetails>
        </Accordion>
      )}
      {/* {!gadgetInstance && (
        <Box my={1} mx={2}>
          <span>Run in Background</span>
          <Checkbox
            checked={isRunningInBackground}
            onChange={e => setIsRunningInBackground(e.target.checked)}
          />
        </Box>
      )} */}
      {areAllPodStreamsConnected && (
        <Box mt={2}>
          <Box m={2}>
            <Grid container justifyContent="space-between" spacing={2}>
              <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>

              {/* {!gadgetInstance && renderCreateBackgroundGadget && (
                <Grid item>
                  <span>Run in Background</span>
                  <Checkbox
                    checked={isRunningInBackground}
                    onChange={e => setIsRunningInBackground(e.target.checked)}
                  />
                </Grid>
              )} */}
              
              <Grid item>
                {gadgetInstance ? (
                  <>
                    <Button
                      disabled={podsSelected.length === 0 || gadgetRunningStatus}
                      onClick={() => setGadgetRunningStatus(prev => !prev)}
                      variant="outlined"
                    >
                      {loading ? 'Processing' : !gadgetRunningStatus ? 'Attach' : 'Attached'}
                    </Button>
                  </>
                ) : (
                  podsSelected.length > 0 && (
                    <Button
                      disabled={podsSelected.length === 0}
                      onClick={handleStartStop}
                      variant="outlined"
                    >
                      {loading
                        ? 'Processing'
                        : !gadgetRunningStatus
                        ? isRunningInBackground
                          ? 'Start'
                          : 'Run Now'
                        : 'Stop'}
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
