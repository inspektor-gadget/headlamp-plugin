import React from 'react';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Typography, Button, Paper, Box } from '@mui/material';
import { Icon } from '@iconify/react';
import { BarChart } from './barChart';

export function BlockIOChart(props: { restartFunc: () => void; entries: any }) {
  const [data, setData] = React.useState(null);
  const { restartFunc, entries } = props;
  const title = 'Biolatency';

  React.useEffect(() => {
    if (entries) {
      console.log(entries);
      const unit = entries.payload.unit || '';
      const intervals = entries.payload?.intervals;
      console.log(intervals);
      const labels = intervals.map(interval => `${interval.start}-${interval.end} ${unit}`);
      setData({
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
    }
  }, [entries]);

  return (
    <SectionBox title={title} backLink={true}>
      <Grid container direction="column" justifyContent="center" alignItems="center" spacing={2}>
        <Grid item>
          <Typography variant="h6">
            Press restart to start recording the latency data again
          </Typography>
        </Grid>
        <Grid item>
          <Box mb={2}>
            <Button variant="outlined" onClick={restartFunc}>
              <Icon icon={'mdi:restart'} width="30" height="30" />
              <Typography variant="h6">Restart</Typography>
            </Button>
          </Box>
        </Grid>
      </Grid>
      <Paper>{data && <BarChart data={data} title="Block I/O distribution" />}</Paper>
    </SectionBox>
  );
}
