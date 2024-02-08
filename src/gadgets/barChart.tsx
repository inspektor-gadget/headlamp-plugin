import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { SectionBox, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function useDefaultOptions(title: string) {
  const options = {
    indexAxis: 'y' as const,
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
  };

  return options;
}

export function BarChart(props: { options?: any; data: any; title: string }) {
  const { options, data, title } = props;
  if (!data || data.length === 0) {
    return (
      <SectionBox>
        <SimpleTable data={[]} columns={[]} />
      </SectionBox>
    );
  }
  return <Bar options={options ? options : useDefaultOptions(title)} data={data} />;
}
