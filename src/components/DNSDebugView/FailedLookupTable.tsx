import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { FailedLookupGroup } from './types';

interface FailedLookupTableProps {
  groups: FailedLookupGroup[];
}

function formatNs(ns: number): string {
  if (!ns) return '—';
  return new Date(ns / 1_000_000).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

export function FailedLookupTable({ groups }: FailedLookupTableProps) {
  if (groups.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          No failed DNS lookups detected in the current event buffer.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Domain</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Failures</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Response Codes</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Query Types</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>First Seen</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Affected Pods</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Signals</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, idx) => (
            <tr
              key={g.dnName}
              style={{
                background:
                  g.isDGASuspect || g.isTXTTunnelingCandidate
                    ? 'rgba(211,47,47,0.06)'
                    : idx % 2 === 0
                    ? 'transparent'
                    : 'rgba(0,0,0,0.02)',
                borderTop: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{g.dnName}</td>
              <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>
                {g.count}
              </td>
              <td style={{ padding: '6px 12px' }}>{g.rcodes.join(', ')}</td>
              <td style={{ padding: '6px 12px' }}>{g.qtypes.join(', ')}</td>
              <td style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'text.secondary' }}>
                {formatNs(g.firstSeen)}
              </td>
              <td style={{ padding: '6px 12px' }}>
                <Tooltip title={g.affectedPods.join('\n')} placement="top">
                  <span>
                    {g.affectedPods.length} pod{g.affectedPods.length !== 1 ? 's' : ''}
                  </span>
                </Tooltip>
              </td>
              <td style={{ padding: '6px 12px' }}>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {g.isDGASuspect && (
                    <Tooltip
                      title={`Shannon entropy ${g.entropy.toFixed(2)} bits/char (threshold: 3.5) — domain label resembles algorithmically generated names`}
                    >
                      <Chip label="DGA suspect" color="error" size="small" />
                    </Tooltip>
                  )}
                  {g.isTXTTunnelingCandidate && (
                    <Tooltip title="Repeated TXT-type queries with failures — possible DNS tunneling exfiltration channel">
                      <Chip label="TXT tunnel" color="warning" size="small" />
                    </Tooltip>
                  )}
                </Box>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Paper>
  );
}
