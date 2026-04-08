import { Icon } from '@iconify/react';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import K8s from '@kinvolk/headlamp-plugin/lib/k8s';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Typography,
  useTheme,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import {
  checkDaemonSet,
  checkNamespace,
  checkNodeCoverage,
  checkPodHealth,
  CheckResult,
  CheckStatus,
  formatDiagnostics,
  getOverallStatus,
  IG_NAMESPACE,
} from './checks';

function StatusIcon({ status }: { status: CheckStatus }) {
  const theme = useTheme();
  switch (status) {
    case 'pass':
      return (
        <Icon icon="mdi:check-circle" width="24" height="24" color={theme.palette.success.main} />
      );
    case 'warn':
      return (
        <Icon icon="mdi:alert-circle" width="24" height="24" color={theme.palette.warning.main} />
      );
    case 'fail':
      return (
        <Icon icon="mdi:close-circle" width="24" height="24" color={theme.palette.error.main} />
      );
    case 'loading':
      return (
        <Icon
          icon="mdi:progress-clock"
          width="24"
          height="24"
          color={theme.palette.text.secondary}
        />
      );
    default:
      return null;
  }
}

function CheckItem({ check }: { check: CheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = check.details || check.docsHint;
  const theme = useTheme();

  return (
    <ListItem
      sx={{
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 1.5,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        width="100%"
        sx={{ cursor: hasDetails ? 'pointer' : 'default' }}
        onClick={() => hasDetails && setExpanded(prev => !prev)}
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        aria-label={`${check.name} check: ${check.status}`}
        aria-expanded={hasDetails ? expanded : undefined}
        onKeyDown={e => {
          if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded(prev => !prev);
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <StatusIcon status={check.status} />
        </ListItemIcon>
        <ListItemText
          primary={<Typography variant="subtitle2">{check.name}</Typography>}
          secondary={check.message}
        />
        {hasDetails && (
          <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="20" height="20" />
        )}
      </Box>
      {hasDetails && (
        <Collapse in={expanded} sx={{ width: '100%', pl: 5 }}>
          <Box mt={1} mb={1}>
            {check.details && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-line', mb: 1 }}
              >
                {check.details}
              </Typography>
            )}
            {check.docsHint && (
              <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                {check.docsHint}
              </Alert>
            )}
          </Box>
        </Collapse>
      )}
    </ListItem>
  );
}

function OverallBanner({ status }: { status: ReturnType<typeof getOverallStatus> }) {
  const theme = useTheme();

  const config: Record<string, { icon: string; color: string; bg: string; text: string }> = {
    healthy: {
      icon: 'mdi:check-circle-outline',
      color: theme.palette.success.main,
      bg: theme.palette.mode === 'dark' ? 'rgba(46,125,50,0.15)' : 'rgba(46,125,50,0.08)',
      text: 'Inspektor Gadget is installed and healthy.',
    },
    degraded: {
      icon: 'mdi:alert-outline',
      color: theme.palette.warning.main,
      bg: theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.15)' : 'rgba(237,108,2,0.08)',
      text: 'Inspektor Gadget is partially running. Some checks need attention.',
    },
    failed: {
      icon: 'mdi:close-circle-outline',
      color: theme.palette.error.main,
      bg: theme.palette.mode === 'dark' ? 'rgba(211,47,47,0.15)' : 'rgba(211,47,47,0.08)',
      text: 'Inspektor Gadget installation has issues that must be resolved.',
    },
    loading: {
      icon: 'mdi:progress-clock',
      color: theme.palette.text.secondary,
      bg: 'transparent',
      text: 'Running diagnostic checks...',
    },
  };

  const c = config[status] || config.failed;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1.5}
      p={2}
      mb={2}
      borderRadius={1}
      sx={{ backgroundColor: c.bg }}
    >
      <Icon icon={c.icon} width="28" height="28" color={c.color} />
      <Typography variant="subtitle1" sx={{ color: c.color, fontWeight: 600 }}>
        {c.text}
      </Typography>
    </Box>
  );
}

function InstallationStatusPanel({ onRetry }: { onRetry: () => void }) {
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();
  const [daemonSets] = K8s.ResourceClasses.DaemonSet.useList({ namespace: IG_NAMESPACE });
  const [pods] = K8s.ResourceClasses.Pod.useList({ namespace: IG_NAMESPACE });
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackError, setSnackError] = useState(false);

  const checks: CheckResult[] = useMemo(
    () => [
      checkNamespace(namespaces),
      checkDaemonSet(daemonSets),
      checkPodHealth(pods),
      checkNodeCoverage(pods, nodes),
    ],
    [namespaces, daemonSets, pods, nodes]
  );

  const overall = useMemo(() => getOverallStatus(checks), [checks]);

  const handleCopyDiagnostics = useCallback(() => {
    const text = formatDiagnostics(checks);
    if (!navigator.clipboard?.writeText) {
      console.error('Clipboard API is not available in this environment.');
      setSnackError(true);
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => setSnackOpen(true))
      .catch(err => {
        console.error('Clipboard write failed:', err);
        setSnackError(true);
      });
  }, [checks]);

  if (overall === 'loading') {
    return <Loader title="Running installation checks..." />;
  }

  return (
    <SectionBox
      title={
        <Box display="flex" alignItems="center" gap={1}>
          <Icon icon="mdi:stethoscope" width="24" height="24" />
          <Typography variant="h5">Installation Diagnostics</Typography>
        </Box>
      }
    >
      <Box p={2}>
        <OverallBanner status={overall} />

        <List disablePadding>
          {checks.map(check => (
            <CheckItem key={check.name} check={check} />
          ))}
        </List>

        <Box display="flex" gap={2} mt={3} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={onRetry}
            startIcon={<Icon icon="mdi:refresh" />}
          >
            Re-run Checks
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCopyDiagnostics}
            startIcon={<Icon icon="mdi:content-copy" />}
          >
            Copy Diagnostics
          </Button>
        </Box>

        <Box mt={3} p={2} borderRadius={1} sx={{ backgroundColor: 'action.hover' }}>
          <Typography variant="subtitle2" gutterBottom>
            Need help?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Follow the{' '}
            <Link
              target="_blank"
              href="https://inspektor-gadget.io/docs/latest/quick-start"
              rel="noopener"
            >
              Inspektor Gadget Quick Start Guide
            </Link>{' '}
            to install or troubleshoot your deployment. You can also copy the diagnostics above to
            share with your team or in a{' '}
            <Link
              target="_blank"
              href="https://github.com/inspektor-gadget/inspektor-gadget/issues"
              rel="noopener"
            >
              GitHub issue
            </Link>
            .
          </Typography>
        </Box>
      </Box>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message="Diagnostics copied to clipboard"
      />
      <Snackbar
        open={snackError}
        autoHideDuration={4000}
        onClose={() => setSnackError(false)}
        message="Failed to copy diagnostics to clipboard"
      />
    </SectionBox>
  );
}

export function InstallationStatus() {
  const [retryKey, setRetryKey] = useState(0);
  return <InstallationStatusPanel key={retryKey} onRetry={() => setRetryKey(k => k + 1)} />;
}
