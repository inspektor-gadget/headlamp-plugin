import { SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Box } from '@mui/material';
import _ from 'lodash';
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HEADLAMP_VALUE } from '../helpers';

function prepareChartData(data, value) {
  if (data && data[value] && _.isArray(data[value])) {
    return data[value].map((item, index) => {
      return {
        name: String(Math.pow(2, index)),
        [value]: item,
      };
    });
  }
  return [];
}

export function MetricChart(props: { data: any; fields: any; node: any }) {
  const { data, fields, node } = props;
  const [chartData, setChartData] = React.useState([]);
  const value = fields
    .find(field => field?.header?.includes(HEADLAMP_VALUE))
    ?.header.replace(`${HEADLAMP_VALUE}_`, '');

  React.useEffect(() => {
    if (data) {
      setChartData(prepareChartData(data, value));
    }
  }, [data]);

  return (
    chartData &&
    chartData.length > 0 && (
      <SectionBox title={`Metric Chart for node ${node}`}>
        <Box width="60vw" height="30vh">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={'500px'}
              height={'400px'}
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="top" wrapperStyle={{ lineHeight: '40px' }} />
              {/* <ReferenceLine y={0} stroke="#000" /> */}
              <Bar dataKey={`${value}`} fill="#8884d8" />
              {/* <Bar dataKey="uv" fill="#82ca9d" /> */}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SectionBox>
    )
  );
}
