import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { DNSSecuritySignals } from './types';

interface DomainAnalysisProps {
  signals: DNSSecuritySignals;
}

const REASON_LABELS: Record<string, { label: string; color: 'error' | 'warning' | 'default'; tip: string }> = {
  new_since_baseline: {
    label: 'New after baseline',
    color: 'warning',
    tip: 'Domain not queried during the first 120 seconds of observation — may be newly contacted C2 or exfiltration target',
  },
  high_entropy: {
    label: 'High entropy (DGA)',
    color: 'error',
    tip: 'Leftmost domain label has Shannon entropy > 3.5 bits/char — consistent with algorithmically generated domain names used by malware',
  },
  external_only: {
    label: 'External only',
    color: 'default',
    tip: 'Domain resolves to no in-cluster addresses',
  },
};

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <Box display="flex" alignItems="baseline" gap={1} mb={1}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {count > 0 && (
        <Chip label={count} size="small" color="default" />
      )}
    </Box>
  );
}

export function DomainAnalysis({ signals }: DomainAnalysisProps) {
  const { topDomains, unexpectedDomains, txtTunnelingCandidates } = signals;

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* ── Unexpected Domains ───────────────────────────────────────── */}
      <Box>
        <SectionHeader title="Unexpected Domains" count={unexpectedDomains.length} />
        {unexpectedDomains.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No unexpected domains detected. Domains are flagged when they appear after the
            120-second baseline window or have high-entropy labels.
          </Typography>
        ) : (
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Domain</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Signal</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Entropy</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Queries</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Pod</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Namespace</th>
                </tr>
              </thead>
              <tbody>
                {unexpectedDomains.slice(0, 25).map((d, idx) => {
                  const meta = REASON_LABELS[d.reason] ?? {
                    label: d.reason,
                    color: 'default' as const,
                    tip: '',
                  };
                  return (
                    <tr
                      key={`${d.dnName}-${d.reason}-${idx}`}
                      style={{
                        borderTop: '1px solid rgba(0,0,0,0.08)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{d.dnName}</td>
                      <td style={{ padding: '6px 12px' }}>
                        <Tooltip title={meta.tip}>
                          <Chip label={meta.label} color={meta.color} size="small" />
                        </Tooltip>
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                        {d.entropy.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}>{d.queryCount}</td>
                      <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {d.podName || '—'}
                      </td>
                      <td style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        {d.namespace || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Paper>
        )}
      </Box>

      {/* ── TXT Tunneling Candidates ─────────────────────────────────── */}
      {txtTunnelingCandidates.length > 0 && (
        <Box>
          <SectionHeader title="DNS Tunneling Candidates (TXT)" count={txtTunnelingCandidates.length} />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Domains with repeated TXT-type query failures. DNS tunneling tools (dnscat2,
            iodine) use TXT records to encapsulate C2 traffic through DNS resolvers.
          </Typography>
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Domain</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>TXT Failures</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Affected Pods</th>
                </tr>
              </thead>
              <tbody>
                {txtTunnelingCandidates.map((c, idx) => (
                  <tr
                    key={c.dnName}
                    style={{
                      borderTop: '1px solid rgba(0,0,0,0.08)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{c.dnName}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {c.count}
                    </td>
                    <td style={{ padding: '6px 12px' }}>{c.affectedPods.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        </Box>
      )}

      {/* ── Top Queried Domains ──────────────────────────────────────── */}
      <Box>
        <SectionHeader title="Top Queried Domains (all)" count={topDomains.length} />
        {topDomains.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No domain data yet.
          </Typography>
        ) : (
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Domain</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Queries</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {topDomains.map((d, idx) => {
                  const pct = Math.round(d.successRate * 100);
                  const chipColor =
                    pct >= 90 ? ('success' as const)
                    : pct >= 50 ? ('warning' as const)
                    : ('error' as const);
                  return (
                    <tr
                      key={d.dnName}
                      style={{
                        borderTop: '1px solid rgba(0,0,0,0.08)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{d.dnName}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}>{d.count}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                        <Chip label={`${pct}%`} color={chipColor} size="small" variant="outlined" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
