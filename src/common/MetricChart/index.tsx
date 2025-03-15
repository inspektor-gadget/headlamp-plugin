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
import { HEADLAMP_METRIC_UNIT, HEADLAMP_VALUE } from '../helpers';

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
  const unit = fields
    .find(field => field?.header.includes(HEADLAMP_METRIC_UNIT))
    ?.header.replace(`${HEADLAMP_METRIC_UNIT}_`, '');
  React.useEffect(() => {
    if (data) {
      setChartData(prepareChartData(data, value));
    }
  }, [data]);

  return (
    chartData &&
    chartData.length > 0 && (
      <SectionBox
        title={`Metric Chart for node ${node}`}
        sx={{
          backgroundColor: '#f9f9fc',
          borderRadius: 2,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <Box width="100%" height="40vh" display="flex" justifyContent="center" alignItems="center">
          <ResponsiveContainer width="95%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis
                dataKey="name"
                label={{
                  value: unit || 'Scale',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#666',
                }}
                tickLine={false}
                axisLine={{ stroke: '#999' }}
              />
              <YAxis
                label={{
                  value: value,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#666',
                }}
                tickLine={false}
                axisLine={{ stroke: '#999' }}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderRadius: 8,
                }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{
                  paddingBottom: 10,
                  color: '#333',
                }}
              />
              <Bar dataKey={`${value}`} fill="#3f51b5" barSize={40} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SectionBox>
    )
  );
}
