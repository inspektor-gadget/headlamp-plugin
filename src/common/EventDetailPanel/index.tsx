import { Icon } from '@iconify/react';
import { NameValueTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Button, ButtonGroup, IconButton, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HEADLAMP_KEY, HEADLAMP_METRIC_UNIT, HEADLAMP_VALUE, IS_METRIC } from '../helpers';

interface EventDetailPanelProps {
  row: Record<string, any>;
  onClose: () => void;
}

/** Internal keys that should never appear in the detail view */
const HIDDEN_KEYS = new Set([
  '__raw',
  IS_METRIC,
  HEADLAMP_KEY,
  HEADLAMP_VALUE,
  HEADLAMP_METRIC_UNIT,
]);

function isHiddenKey(key: string): boolean {
  return HIDDEN_KEYS.has(key) || key.startsWith('_');
}

/**
 * Recursively flatten an object into dot-notated [key, displayValue] pairs.
 * - Nested objects: recurse with "parent.child" keys
 * - Arrays of primitives: join with ", "
 * - Arrays of objects: flatten each element with "field.0.key", "field.1.key"
 */
function flattenEvent(data: Record<string, any>, prefix = ''): [string, string][] {
  const result: [string, string][] = [];

  for (const [key, val] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (isHiddenKey(key)) continue;

    if (val === null || val === undefined) {
      result.push([fullKey, '—']);
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        result.push([fullKey, '[]']);
      } else if (val.every(v => typeof v !== 'object' || v === null)) {
        // array of primitives
        result.push([
          fullKey,
          val.map(v => (v === null || v === undefined ? '—' : String(v))).join(', '),
        ]);
      } else {
        // array of objects — flatten each with index
        val.forEach((item, i) => {
          if (item !== null && typeof item === 'object') {
            result.push(...flattenEvent(item, `${fullKey}.${i}`));
          } else {
            result.push([
              `${fullKey}.${i}`,
              item === null || item === undefined ? '—' : String(item),
            ]);
          }
        });
      }
    } else if (typeof val === 'object') {
      result.push(...flattenEvent(val, fullKey));
    } else {
      result.push([fullKey, String(val)]);
    }
  }

  return result;
}

/** Try to find a meaningful identifier from the event data for the subtitle */
function getEventSubtitle(data: Record<string, any>): string | null {
  // check common identifier fields in order of preference
  const candidates = ['proc.comm', 'comm', 'k8s.podName', 'k8s.containerName', 'name'];
  for (const key of candidates) {
    // support dotted paths
    const parts = key.split('.');
    let val: any = data;
    for (const p of parts) {
      val = val?.[p];
    }
    if (val && typeof val === 'string') return `${key}: ${val}`;
  }
  return null;
}

export function EventDetailPanel({ row, onClose }: EventDetailPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawData = row.__raw ?? row;
  const subtitle = getEventSubtitle(rawData);

  // Memoize serialized JSON so both the raw view and copy handler share one serialization
  const rawJson = useMemo(() => {
    try {
      return JSON.stringify(rawData, null, 2);
    } catch {
      return null;
    }
  }, [rawData]);

  // Memoize flattened rows so toggle / copy state changes don't recompute the full object tree
  const tableRows = useMemo(
    () =>
      flattenEvent(rawData).map(([key, value]) => ({
        name: (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
            }}
          >
            {key}
          </Typography>
        ),
        value: (
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              color: 'text.primary',
              wordBreak: 'break-all',
            }}
          >
            {value}
          </Typography>
        ),
      })),
    [rawData]
  );

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Clear copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  function handleCopy() {
    if (!navigator.clipboard || rawJson === null) return;
    navigator.clipboard
      .writeText(rawJson)
      .then(() => {
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // clipboard write failed (e.g. permission denied) — silently ignore
      });
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header: title + subtitle on left, toggle + copy + close on right */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          gap: 1,
          flexShrink: 0,
          bgcolor: 'background.paper',
        }}
      >
        {/* Left: title & subtitle */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            Event Details
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Right: toggle, copy, close */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => setShowRaw(false)}
              variant={!showRaw ? 'contained' : 'outlined'}
              sx={{ textTransform: 'none', fontSize: '0.7rem', px: 1, py: 0.25 }}
            >
              Formatted
            </Button>
            <Button
              onClick={() => setShowRaw(true)}
              variant={showRaw ? 'contained' : 'outlined'}
              sx={{ textTransform: 'none', fontSize: '0.7rem', px: 1, py: 0.25 }}
            >
              Raw JSON
            </Button>
          </ButtonGroup>
          <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton
              size="small"
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy JSON'}
            >
              <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width={16} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <Icon icon="mdi:close" width={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 2 }}>
        {showRaw ? (
          <Box
            component="pre"
            sx={{
              borderRadius: 1,
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              color: 'text.primary',
              p: 1.5,
              m: 0,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {rawJson ?? '(unserializable event)'}
          </Box>
        ) : tableRows.length > 0 ? (
          <NameValueTable rows={tableRows} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No fields to display.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
