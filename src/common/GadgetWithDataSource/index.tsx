import { Icon } from '@iconify/react';
import { DateLabel, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import GadgetFilters from '../../gadgets/gadgetFilters';
import { AllColumnMeta } from '../../gadgets/utility';
import { IS_METRIC } from '../helpers';
import { MetricChart } from '../MetricChart';
import { EventDetailPanel } from '../EventDetailPanel';

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
  columnMeta?: AllColumnMeta;
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
    columnMeta,
  } = props;

  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;
  const [inspectedRow, setInspectedRow] = useState<Record<string, any> | null>(null);

  // Lock body scroll while the panel is open to prevent scrollbar-width oscillation
  useEffect(() => {
    if (inspectedRow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [inspectedRow]);

  useEffect(() => {
    if (gadgetInstance) {
      const timer = setTimeout(() => {
        setGadgetRunningStatus(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(gadgetInstance || {})]);

  // Inspect action column — renders a small icon button in each row
  const inspectColumn = useMemo(
    () => ({
      id: 'inspect-action',
      header: '',
      accessorFn: (data: any) => data,
      Cell: ({ cell }: { cell: any }) => (
        <Tooltip title="Inspect event">
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation();
              setInspectedRow(cell.row.original);
            }}
          >
            <Icon icon="mdi:magnify" width={16} />
          </IconButton>
        </Tooltip>
      ),
      gridTemplate: 'min-content',
      enableSorting: false,
      enableColumnFilter: false,
    }),
    []
  );

  const fields = useMemo(
    () =>
      columns?.map(column => {
        const meta = columnMeta?.[dataSourceID]?.[column];
        const header = meta?.annotations?.['columns.title'] || column;
        return {
          header,
          accessorFn: (data: any) =>
            column === 'timestamp' ? <DateLabel date={data[column]} /> : data[column],
        };
      }),
    [columns, columnMeta, dataSourceID]
  );

  // Merge data columns with the inspect action column
  const allFields = useMemo(
    () => (fields ? [...fields, inspectColumn] : undefined),
    [fields, inspectColumn]
  );

  useEffect(() => {
    if (bufferedGadgetData[dataSourceID]) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData[dataSourceID], dataSourceID, setGadgetData]);

  function handleStartStop() {
    if (!gadgetRunningStatus) {
      setGadgetData(prev => ({ ...prev, [dataSourceID]: [] }));
      setBufferedGadgetData(prev => ({ ...prev, [dataSourceID]: [] }));
      handleRun();
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

    const rows = gadgetData[dataSourceID] || [];
    return (
      allFields && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5, px: 1 }}>
            <Chip label={`${rows.length} events`} size="small" variant="outlined" />
          </Box>
          <Table columns={allFields} data={rows} loading={loading} />
        </>
      )
    );
  };

  return (
    <>
      {/* Side panel overlay — plain divs because MUI Drawer doesn't render inside Headlamp's plugin host */}
      {inspectedRow && (
        <>
          <Box
            onClick={() => setInspectedRow(null)}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 1298,
            }}
          />
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 'min(420px, 100%)',
              height: '100%',
              zIndex: 1299,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 8,
              bgcolor: 'background.paper',
            }}
          >
            <EventDetailPanel row={inspectedRow} onClose={() => setInspectedRow(null)} />
          </Box>
        </>
      )}
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
                    setGadgetData(prev => ({ ...prev, [dataSourceID]: [] }));
                    setBufferedGadgetData(prev => ({ ...prev, [dataSourceID]: [] }));
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
                  <Button
                    onClick={() => {
                      if (gadgetRunningStatus) {
                        headlessGadgetDeleteCallback(gadgetInstance);
                      }
                      headlessGadgetRunCallback(gadgetInstance);
                    }}
                    variant="outlined"
                    disabled={loading}
                  >
                    {loading ? 'Processing' : !gadgetRunningStatus ? 'Run' : 'Stop'}
                  </Button>
                ) : (
                  podsSelected.length > 0 && (
                    <Button
                      disabled={loading || podsSelected.length === 0}
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
