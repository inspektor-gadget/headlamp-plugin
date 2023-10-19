import React from 'react';
import { SectionBox } from "@kinvolk/headlamp-plugin/lib/CommonComponents";
import { Grid, Typography, Button, Paper } from '@material-ui/core';
import {
    Chart,
    BarSeries,
    Title,
    ArgumentAxis,
    ValueAxis,
    Legend
  } from '@devexpress/dx-react-chart-material-ui';
import { Animation } from '@devexpress/dx-react-chart';
import { Icon } from '@iconify/react';


export function BlockIOChart(props: {
    restartFunc: () => void,
    entries: any,
}) {
    const [data, setData] = React.useState([]);
    const { restartFunc, entries } = props;
    const title="Biolatency"
    
    React.useEffect(() => {
        if(entries) {
            const intervals = entries.payload?.intervals;
            console.log(intervals)
            
            setData(intervals.map((interval) => {
                return {
                    'timeline': `${interval.start}-${interval.end}`,
                    count: interval.count
                }
            }))
        }
    }, [entries])

    return (
    <SectionBox title={title} backLink={true}>
    <Grid container direction="column" justify="center" alignItems="center" spacing={2}>
    <Grid item>
      <Typography variant="h6">
        Press restart to start recording the latency data again
      </Typography>
    </Grid>
    <Grid item>
      <Button variant="outlined" onClick={restartFunc}>
        <Icon icon={"mdi:restart"} width="30" height="30" />
        <Typography variant="h6">Restart</Typography>
      </Button>
    </Grid>
    </Grid>
   <Paper>
   <Chart
     data={data}
   >
     <ValueAxis />
     <ArgumentAxis 
     />

     <BarSeries
       valueField={"count"}
       argumentField="timeline"
       name={"No of block i/o operations in time interval (micro seconds)"}
     />
     <Title text={"Block i/o gives you the no of blocking i/o that happens in a given time interval"} />
     <Animation />
     <Legend position="bottom" />
   </Chart>
 </Paper>
 </SectionBox>
 )
}