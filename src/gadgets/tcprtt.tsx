import React from 'react';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Typography, Button, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import { BarChart } from './barChart';

export function TcprttChart(props: { restartFunc: () => void; entries: any }) {
  const [data, setData] = React.useState(null);
  const { restartFunc, entries } = props;
  const title =
    'Tcprtt gives you the distribution of tcp packets time taken for a round trip over a certain interval of time';

  React.useEffect(() => {
    if (entries) {
      const intervals = entries.payload?.histograms[0]?.intervals;
      const unit = entries.payload?.histograms[0]?.unit || '';
      console.log(entries);
      const labels = intervals.map(interval => `${interval.start}-${interval.end} ${unit}`);
      setData({
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
    }
  }, [entries]);
  console.log('data', data);
  return (
    <SectionBox title={'Tcprtt'} backLink={true}>
      <Grid container direction="column" justifyContent="center" alignItems="center" spacing={2}>
        <Grid item>
          <Typography variant="h6">
            Press restart to start recording the latency data again
          </Typography>
        </Grid>
        <Grid item>
          <Button variant="outlined" onClick={restartFunc}>
            <Icon icon={'mdi:restart'} width="30" height="30" />
            <Typography variant="h6">Restart</Typography>
          </Button>
        </Grid>
      </Grid>
      <Paper>{data && <BarChart data={data} title="Tcp packet round trip time" />}</Paper>
    </SectionBox>
  );
}
