import { Alert, AlertTitle, Box, Chip, Typography } from '@mui/material';
import React from 'react';
import { RetryStorm } from './types';

interface RetryStormPanelProps {
  storms: RetryStorm[];
}

function formatNs(ns: number): string {
  if (!ns) return '—';
  return new Date(ns / 1_000_000).toISOString().replace('T', ' ').slice(0, 23) + 'Z';
}

function rcodeBreakdownText(breakdown: Record<string, number>): string {
  return Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([code, count]) => `${code}: ${count}`)
    .join('  ·  ');
}

export function RetryStormPanel({ storms }: RetryStormPanelProps) {
  if (storms.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          No retry storms detected. A storm requires ≥ 10 queries to the same domain from
          the same pod within any 10-second window with &gt; 50% failure rate.
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2} p={1}>
      <Typography variant="caption" color="textSecondary">
        {storms.length} storm{storms.length !== 1 ? 's' : ''} detected — sorted by failure rate
        descending. Each storm is a distinct 10-second window meeting the threshold.
      </Typography>
      {storms.map((storm, idx) => (
        <Alert key={idx} severity="warning" variant="outlined">
          <AlertTitle>
            Retry storm:{' '}
            <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{storm.dnName}</code>
            {' · pod '}
            <code style={{ fontFamily: 'monospace' }}>{storm.podName || '(unknown)'}</code>
          </AlertTitle>

          <Box mt={1} display="flex" flexWrap="wrap" gap={0.75}>
            <Chip
              label={`${storm.queryCount} queries`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${(storm.failureRate * 100).toFixed(0)}% failure`}
              color="error"
              size="small"
            />
            <Chip
              label={`${storm.failureCount} failed / ${storm.queryCount - storm.failureCount} ok`}
              size="small"
              variant="outlined"
            />
            {storm.namespace && (
              <Chip
                label={`ns: ${storm.namespace}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          <Box mt={1}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              <strong>Window:</strong> {formatNs(storm.windowStartNs)} → {formatNs(storm.windowEndNs)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              <strong>Response codes:</strong> {rcodeBreakdownText(storm.rcodeBreakdown)}
            </Typography>
          </Box>
        </Alert>
      ))}
    </Box>
  );
}
