import { DateLabel, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Button, Grid } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router';
import GenericGadgetRenderer from '../common/GenericGadgetRenderer';
import { IS_METRIC } from '../common/helpers';
import { MetricChart } from '../common/MetricChart';
import { NodeSelection } from '../common/NodeSelection';
import GadgetFilters from './gadgetFilters';

export function BackgroundGadgetsDetail() {
  const [podsSelected, setPodsSelected] = React.useState([]);
  const [gadgetData, setGadgetData] = React.useState({});
  const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
  const [dataColumns, setDataColumns] = React.useState({});
  const [gadgetConfig, setGadgetConfig] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  const [podStreamsConnected, setPodStreamsConnected] = React.useState(0);
  const [dataSources, setDataSources] = React.useState([]);
  const [bufferedGadgetData, setBufferedGadgetData] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [isGadgetInfoFetched, setIsGadgetInfoFetched] = React.useState(false);
  const { imageName, version, instance } = useParams();
  return (
    <>
      <NodeSelection
        setPodStreamsConnected={setPodStreamsConnected}
        setPodsSelected={setPodsSelected}
      />
      {podsSelected.map(podSelected => (
        <GenericGadgetRenderer
          gadgetInstance={{
            id: instance,
            gadgetConfig: {
              imageName: imageName,
              version: version,
            },
          }}
          podsSelected={podsSelected}
          podSelected={podSelected?.jsonData.metadata.name}
          setGadgetConfig={setGadgetConfig}
          dataColumns={dataColumns}
          setDataColumns={setDataColumns}
          gadgetRunningStatus={gadgetRunningStatus}
          filters={filters}
          setPodStreamsConnected={setPodStreamsConnected}
          podStreamsConnected={podStreamsConnected}
          setBufferedGadgetData={setBufferedGadgetData}
          setLoading={setLoading}
          setDataSources={setDataSources}
          setIsGadgetInfoFetched={setIsGadgetInfoFetched}
        />
      ))}
      {dataSources.map((dataSource, index) => {
        const dataSourceID = dataSource?.id || index;
        return (
          <GadgetData
            podsSelected={podsSelected}
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
          />
        );
      })}
    </>
  );
}

function GadgetData(props: {
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
}) {
  const { imageName, version, instance } = useParams();
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
  } = props;

  console.log('gadgetData', gadgetData);
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;
  const fields = React.useMemo(() => {
    return columns?.map(column => {
      return {
        header: column,
        accessorFn: data => {
          if (column == 'timestamp') {
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
      <SectionBox title={`${imageName}_${version}_${instance}`}>
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
        <Box m={2}>
          <Grid container justifyContent="space-between" spacing="2">
            <Grid item>Status: Running in background</Grid>
            <Grid item>
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
                }}
                variant="outlined"
              >
                Delete
              </Button>
            </Grid>
          </Grid>
        </Box>
        {fields?.find(field => field.header === IS_METRIC) ? (
          <MetricChart data={gadgetData} fields={fields} />
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
