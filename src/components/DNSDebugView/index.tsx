/**
 * DNS Security Debug View — /gadgets/dns
 *
 * A specialised page for security-focused DNS analysis built on top of the
 * existing trace_dns gadget infrastructure.  It reuses the full GenericGadgetRenderer
 * + GadgetWithDataSource pipeline unchanged — no new WebSocket connections, no new
 * API calls — and adds a security analysis layer driven by pure useMemo computations
 * over the same bufferedGadgetData event array the raw table already consumes.
 *
 * Architecture:
 *   DNSDebugView (route entry point)
 *     └─ GadgetContext.Provider   (standard gadget state from useGadgetState())
 *          └─ DNSGadgetRenderer   (inner component, mirrors GadgetDetails pattern)
 *               ├─ NodeSelection  (pick which cluster node to trace)
 *               ├─ GenericGadgetRenderer × N pods  (data ingestion, returns null)
 *               ├─ GadgetWithDataSource  (raw events table + Start/Stop)
 *               └─ Security Analysis Tabs
 *                    ├─ Failed Lookups  (FailedLookupTable)
 *                    ├─ Retry Storms    (RetryStormPanel)
 *                    └─ Domain Analysis (DomainAnalysis)
 */

import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { GadgetContext, useGadgetState } from '../../common/GadgetContext';
import { GadgetWithDataSource } from '../../common/GadgetWithDataSource';
import GenericGadgetRenderer from '../../common/GenericGadgetRenderer';
import { NodeSelection } from '../../common/NodeSelection';
import { useGadgetConn } from '../../gadgets/conn';
import { computeDNSSecuritySignals } from './dnsAnalysis';
import { DomainAnalysis } from './DomainAnalysis';
import { FailedLookupTable } from './FailedLookupTable';
import { RetryStormPanel } from './RetryStormPanel';

const TRACE_DNS_IMAGE = 'ghcr.io/inspektor-gadget/gadget/trace_dns:latest';

// ---------------------------------------------------------------------------
// Route entry point — wraps the inner renderer in a GadgetContext provider
// ---------------------------------------------------------------------------

export function DNSDebugView() {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const gadgetState = useGadgetState();

  if (nodes === null || pods === null) {
    return <Loader title="Loading cluster data..." />;
  }

  return (
    <GadgetContext.Provider value={{ ...gadgetState }}>
      <DNSGadgetRenderer nodes={nodes} pods={pods} />
    </GadgetContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Inner renderer — mirrors GadgetDetails but specialised for trace_dns
// ---------------------------------------------------------------------------

function DNSGadgetRenderer({ nodes, pods }: { nodes: any[]; pods: any[] }) {
  const {
    podsSelected,
    podStreamsConnected,
    setPodStreamsConnected,
    isGadgetInfoFetched,
    setIsGadgetInfoFetched,
    dataSources,
    prepareGadgetInfo,
    dataColumns,
    gadgetConn,
    setPodsSelected,
    nodesSelected,
    setOpen,
    setNodesSelected,
    setGadgetConn,
    bufferedGadgetData,
    ...otherState
  } = useContext(GadgetContext);

  const [error, setError] = useState<string | null>(null);
  const [infoRequested, setInfoRequested] = useState(false);
  // Active tab index for the security analysis panel (below the raw table)
  const [analysisTab, setAnalysisTab] = useState(0);

  const ig = useGadgetConn(nodes, pods);

  // Sync pod stream count: if pods deselected, cap the counter
  useEffect(() => {
    if (podStreamsConnected > podsSelected.length) {
      setPodStreamsConnected(podsSelected.length);
      otherState.setGadgetRunningStatus(false);
    }
  }, [podsSelected.length, podStreamsConnected]);

  // Fetch gadget info for trace_dns once per connection
  useEffect(() => {
    if (!ig || infoRequested) return;
    setInfoRequested(true);
    if (gadgetConn !== ig) setGadgetConn(ig);

    ig.getGadgetInfo(
      { version: 1, imageName: TRACE_DNS_IMAGE },
      (info: any) => {
        prepareGadgetInfo(info);
        setIsGadgetInfoFetched(true);
        setError(null);
      },
      (err: Error) => {
        setError(err?.message ?? String(err));
        setIsGadgetInfoFetched(true);
        setInfoRequested(false); // allow retry
      }
    );
  }, [ig, infoRequested]);

  // ── Security signal computation ─────────────────────────────────────────
  // Use the first datasource (trace_dns exposes exactly one).
  // Falls back to 0 (numeric) if the gadget info hasn't arrived yet.
  const dsID: string | number = dataSources[0]?.id ?? 0;
  const events: any[] = bufferedGadgetData[dsID] ?? [];

  const signals = useMemo(() => computeDNSSecuritySignals(events), [events]);

  const totalSignals =
    signals.retryStorms.length +
    signals.failedLookupGroups.length +
    signals.unexpectedDomains.length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SectionBox title="DNS Security Analysis (trace_dns)" backLink>
      {/* Node/pod selector — reuses the existing NodeSelection component */}
      <NodeSelection
        setPodsSelected={setPodsSelected}
        open={otherState.open}
        setOpen={setOpen}
        nodesSelected={nodesSelected ?? []}
        setNodesSelected={setNodesSelected}
        setPodStreamsConnected={setPodStreamsConnected as any}
        gadgetConn={gadgetConn}
        gadgetInstance={null}
        isInstantRun
      />

      {/* Loading state while gadget info is being fetched */}
      {!isGadgetInfoFetched && !error && (
        <Box mt={2}>
          <Loader title="Fetching trace_dns gadget metadata..." />
        </Box>
      )}

      {/* Error from getGadgetInfo (e.g. gadget not installed) */}
      {error && (
        <Box mt={2}>
          <Typography variant="body1" color="error">
            Failed to load trace_dns: {error}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Ensure the Inspektor Gadget DaemonSet is running and the trace_dns image is
            available: <code>{TRACE_DNS_IMAGE}</code>
          </Typography>
        </Box>
      )}

      {/* GenericGadgetRenderer — one per selected pod, renders null, drives data flow */}
      {isGadgetInfoFetched &&
        !error &&
        podsSelected.map((podSelected: any) => (
          <GenericGadgetRenderer
            key={podSelected?.jsonData?.metadata?.name}
            {...otherState}
            filters={otherState.filters}
            gadgetInstance={null}
            podsSelected={podsSelected}
            node={podSelected?.spec?.nodeName}
            podSelected={podSelected?.jsonData?.metadata?.name}
            dataColumns={dataColumns}
            podStreamsConnected={podStreamsConnected}
            setPodStreamsConnected={setPodStreamsConnected}
            imageName={TRACE_DNS_IMAGE}
            columnMeta={otherState.columnMeta}
          />
        ))}

      {/* Raw events table via GadgetWithDataSource (Start/Stop + raw table) */}
      {isGadgetInfoFetched &&
        !error &&
        dataSources.map((dataSource: any, index: number) => {
          const sourceID = dataSource?.id ?? index;
          return (
            <GadgetWithDataSource
              key={`ds-${sourceID}`}
              {...otherState}
              podsSelected={podsSelected}
              podStreamsConnected={podStreamsConnected}
              dataSourceID={sourceID}
              columns={dataColumns[sourceID] ?? []}
              gadgetInstance={null}
              gadgetConn={gadgetConn}
              onGadgetInstanceCreation={() => {}}
              isInstantRun
              isRunningInBackground={false}
              renderCreateBackgroundGadget={false}
              error={error}
              headlessGadgetRunCallback={() => {}}
              headlessGadgetDeleteCallback={() => {}}
              handleRun={() => {}}
              bufferedGadgetData={bufferedGadgetData}
              columnMeta={otherState.columnMeta}
            />
          );
        })}

      {/* ── Security Analysis Panel ──────────────────────────────────────── */}
      {events.length > 0 && (
        <Box mt={4}>
          <Box mb={1}>
            <Typography variant="h6" component="span">
              Security Signals
            </Typography>
            <Typography
              variant="body2"
              component="span"
              color={totalSignals > 0 ? 'error' : 'textSecondary'}
              sx={{ ml: 1 }}
            >
              {totalSignals > 0
                ? `${totalSignals} signal${totalSignals !== 1 ? 's' : ''} detected across ${events.length} events`
                : `No signals detected (${events.length} events analysed)`}
            </Typography>
          </Box>

          <Tabs
            value={analysisTab}
            onChange={(_, v: number) => setAnalysisTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab
              label={`Failed Lookups${signals.failedLookupGroups.length > 0 ? ` (${signals.failedLookupGroups.length})` : ''}`}
            />
            <Tab
              label={`Retry Storms${signals.retryStorms.length > 0 ? ` (${signals.retryStorms.length})` : ''}`}
            />
            <Tab
              label={`Domain Analysis${signals.unexpectedDomains.length > 0 ? ` (${signals.unexpectedDomains.length} flagged)` : ''}`}
            />
          </Tabs>

          {analysisTab === 0 && <FailedLookupTable groups={signals.failedLookupGroups} />}
          {analysisTab === 1 && <RetryStormPanel storms={signals.retryStorms} />}
          {analysisTab === 2 && <DomainAnalysis signals={signals} />}
        </Box>
      )}

      {/* Prompt to start the gadget when no events collected yet */}
      {isGadgetInfoFetched && !error && events.length === 0 && podsSelected.length > 0 && (
        <Box mt={2} p={2} sx={{ background: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Start the gadget above to begin capturing DNS events. Security signals will appear
            here once events are collected.
          </Typography>
        </Box>
      )}
    </SectionBox>
  );
}
