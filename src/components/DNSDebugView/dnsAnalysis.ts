/**
 * DNS Security Analysis — pure analysis functions.
 *
 * These functions run over the existing bufferedGadgetData event array produced by
 * trace_dns.  They have no side effects, no API calls, and no WebSocket connections.
 * They are designed to be called inside a React useMemo() hook so they re-run only
 * when the event buffer reference changes.
 *
 * Key design decisions:
 *
 * 1. The bufferedGadgetData events have already been through processDataColumn(), so
 *    k8s.* fields (namespace, podName, node) are stored as React Link elements rather
 *    than plain strings.  extractString() handles both shapes transparently.
 *
 * 2. Nanosecond Unix timestamps exceed Number.MAX_SAFE_INTEGER (~9e15) — the epoch in
 *    nanoseconds is ~1.77e18 in 2026.  JavaScript floats lose sub-microsecond precision
 *    at this magnitude, but millisecond-level precision is sufficient for 10-second
 *    storm windows and 120-second baseline windows.
 *
 * 3. All thresholds are module-level constants so they can be adjusted or surfaced as
 *    configurable props in a future iteration without touching the algorithm logic.
 */

import { DNSSecuritySignals, FailedLookupGroup, RetryStorm, UnexpectedDomain } from './types';

// ---------------------------------------------------------------------------
// Thresholds (all configurable in a future UI settings popover)
// ---------------------------------------------------------------------------

/** Sliding window size for retry storm detection (nanoseconds). */
const RETRY_STORM_WINDOW_NS = 10_000_000_000; // 10 seconds

/** Minimum queries within window to qualify as a retry storm. */
const RETRY_STORM_MIN_QUERIES = 10;

/** Failure rate threshold above which a window is flagged as a storm. */
const RETRY_STORM_FAILURE_THRESHOLD = 0.5;

/** Shannon entropy threshold for DGA (Domain Generation Algorithm) suspect labelling. */
const DGA_ENTROPY_THRESHOLD = 3.5;

/**
 * Baseline observation window for "new domain" detection.
 * Domains seen during this initial period are considered known-good.
 */
const BASELINE_WINDOW_NS = 120_000_000_000; // 120 seconds

/** Minimum TXT-type failure count to flag as a DNS tunneling candidate. */
const TXT_TUNNELING_MIN_COUNT = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract a plain string from a value that may be:
 *   - a plain string (e.g. dnName, rcode, qtype after processDataColumn default case)
 *   - a number (e.g. timestamp or pid before stringification)
 *   - a React Link element (e.g. k8s.namespace, k8s.podName, k8s.node)
 *
 * For React elements, we read from props.params.name (the pattern used by
 * processDataColumn for k8s.namespace, k8s.podName, and k8s.node Link components).
 */
function extractString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  const el = val as Record<string, any>;
  if (el && typeof el === 'object' && el.props) {
    // k8s.podName Link: params={{ name: podName, namespace: ns }}
    // k8s.namespace Link: params={{ name: namespaceName }}
    if (el.props?.params?.name) return String(el.props.params.name);
    if (typeof el.props?.children === 'string') return el.props.children;
  }
  return String(val);
}

/**
 * Parse a timestamp value (stored as a stringified number in processedData)
 * back to a float.  Nanosecond precision beyond ~1µs is lost in JS float
 * arithmetic but is acceptable for 10-second window comparisons.
 */
function extractTimestampNs(val: unknown): number {
  return parseFloat(extractString(val)) || 0;
}

/** True when the rcode indicates a DNS failure (anything other than NOERROR). */
function isFailure(rcode: string): boolean {
  return rcode !== 'NOERROR' && rcode !== '';
}

/**
 * Extract the leftmost label of a domain name for entropy analysis.
 * Removes the trailing dot from fully-qualified domain names (e.g. "api.example.com.").
 */
function domainLabel(dnName: string): string {
  const clean = dnName.endsWith('.') ? dnName.slice(0, -1) : dnName;
  return clean.split('.')[0] || clean;
}

// ---------------------------------------------------------------------------
// Exported pure analysis functions
// ---------------------------------------------------------------------------

/**
 * Compute Shannon entropy of a string in bits per character.
 *
 * Used to distinguish algorithmically generated domain names (high entropy,
 * e.g. "x4f2a9bc.evil.com") from human-readable names (low entropy,
 * e.g. "www.google.com").  A threshold of ~3.5 bits/char separates most DGA
 * domains from legitimate ones based on published research.
 */
export function shannonEntropy(str: string): number {
  if (!str) return 0;
  const freq: Record<string, number> = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = str.length;
  return Object.values(freq).reduce((h, count) => {
    const p = count / len;
    return h - p * Math.log2(p);
  }, 0);
}

/**
 * Detect retry storms from a bufferedGadgetData event array.
 *
 * Algorithm:
 *   For each unique (dnName, podName) pair:
 *     Sort events by timestamp ascending.
 *     For each event e[i]:
 *       Define windowEnd = e[i].timestamp + RETRY_STORM_WINDOW_NS.
 *       Collect all events in [e[i].timestamp, windowEnd].
 *       If count >= RETRY_STORM_MIN_QUERIES AND failureRate > RETRY_STORM_FAILURE_THRESHOLD:
 *         Emit a RetryStorm and advance i past the window (deduplication).
 *
 * Complexity: O(n log n) for the sort + O(n) sliding window per group.
 * For MAX_DATA_LIMIT = 20,000 events this runs in <10ms in practice.
 */
export function detectRetryStorms(events: any[]): RetryStorm[] {
  if (events.length === 0) return [];

  // Group events by (dnName, podName)
  const grouped = new Map<string, any[]>();
  for (const ev of events) {
    const dnName = extractString(ev['name']);
    const podName = extractString(ev['k8s.podName']);
    if (!dnName) continue;
    const key = `${dnName}\x00${podName}`;
    const group = grouped.get(key);
    if (group) {
      group.push(ev);
    } else {
      grouped.set(key, [ev]);
    }
  }

  const storms: RetryStorm[] = [];

  for (const [key, groupEvents] of grouped.entries()) {
    const nullIdx = key.indexOf('\x00');
    const dnName = key.slice(0, nullIdx);
    const podName = key.slice(nullIdx + 1);
    const namespace = extractString(groupEvents[0]?.['k8s.namespace']);

    // Sort ascending by timestamp
    const sorted = groupEvents
      .slice()
      .sort((a, b) => extractTimestampNs(a['timestamp']) - extractTimestampNs(b['timestamp']));

    let i = 0;
    while (i < sorted.length) {
      const windowStart = extractTimestampNs(sorted[i]['timestamp']);
      const windowEnd = windowStart + RETRY_STORM_WINDOW_NS;

      // Collect all events inside this window
      let j = i;
      while (j < sorted.length && extractTimestampNs(sorted[j]['timestamp']) <= windowEnd) {
        j++;
      }
      const windowEvents = sorted.slice(i, j);

      if (windowEvents.length >= RETRY_STORM_MIN_QUERIES) {
        const rcodeBreakdown: Record<string, number> = {};
        let failureCount = 0;
        for (const ev of windowEvents) {
          const rcode = extractString(ev['rcode']);
          rcodeBreakdown[rcode] = (rcodeBreakdown[rcode] || 0) + 1;
          if (isFailure(rcode)) failureCount++;
        }
        const failureRate = failureCount / windowEvents.length;

        if (failureRate > RETRY_STORM_FAILURE_THRESHOLD) {
          storms.push({
            dnName,
            podName,
            namespace,
            windowStartNs: windowStart,
            windowEndNs: windowEnd,
            queryCount: windowEvents.length,
            failureCount,
            failureRate,
            rcodeBreakdown,
          });
          // Advance past this window to avoid overlapping duplicate storms
          i = j;
          continue;
        }
      }
      i++;
    }
  }

  // Surface highest-failure-rate storms first
  return storms.sort((a, b) => b.failureRate - a.failureRate || b.queryCount - a.queryCount);
}

/**
 * Group failed DNS lookups (rcode != NOERROR) by domain name.
 *
 * Flags:
 *   isDGASuspect   — Shannon entropy of the leftmost label > DGA_ENTROPY_THRESHOLD
 *   isTXTTunnelingCandidate — TXT queries with count > TXT_TUNNELING_MIN_COUNT
 *
 * Returns groups sorted by count descending so the most-impactful failures
 * appear at the top of the table.
 */
export function groupFailedLookups(events: any[]): FailedLookupGroup[] {
  if (events.length === 0) return [];

  const groups = new Map<
    string,
    {
      count: number;
      firstSeen: number;
      lastSeen: number;
      affectedPods: Set<string>;
      qtypes: Set<string>;
      rcodes: Set<string>;
    }
  >();

  for (const ev of events) {
    const rcode = extractString(ev['rcode']);
    if (!isFailure(rcode)) continue;

    const dnName = extractString(ev['name']);
    if (!dnName) continue;

    const podName = extractString(ev['k8s.podName']);
    const qtype = extractString(ev['qtype']);
    const ts = extractTimestampNs(ev['timestamp']);

    let g = groups.get(dnName);
    if (!g) {
      g = {
        count: 0,
        firstSeen: ts,
        lastSeen: ts,
        affectedPods: new Set(),
        qtypes: new Set(),
        rcodes: new Set(),
      };
      groups.set(dnName, g);
    }

    g.count++;
    if (ts > 0) {
      g.firstSeen = g.firstSeen > 0 ? Math.min(g.firstSeen, ts) : ts;
      g.lastSeen = Math.max(g.lastSeen, ts);
    }
    if (podName) g.affectedPods.add(podName);
    if (qtype) g.qtypes.add(qtype);
    if (rcode) g.rcodes.add(rcode);
  }

  const result: FailedLookupGroup[] = [];
  for (const [dnName, g] of groups.entries()) {
    const label = domainLabel(dnName);
    const entropy = shannonEntropy(label);
    const qtypesArr = Array.from(g.qtypes);
    result.push({
      dnName,
      count: g.count,
      firstSeen: g.firstSeen,
      lastSeen: g.lastSeen,
      affectedPods: Array.from(g.affectedPods),
      qtypes: qtypesArr,
      rcodes: Array.from(g.rcodes),
      isDGASuspect: entropy > DGA_ENTROPY_THRESHOLD,
      isTXTTunnelingCandidate: qtypesArr.includes('TXT') && g.count > TXT_TUNNELING_MIN_COUNT,
      entropy,
    });
  }

  return result.sort((a, b) => b.count - a.count);
}

/** Compute the top 20 most-queried domains with per-domain success rates. */
function computeTopDomains(
  events: any[]
): Array<{ dnName: string; count: number; successRate: number }> {
  const counts = new Map<string, { total: number; success: number }>();

  for (const ev of events) {
    const dnName = extractString(ev['name']);
    if (!dnName) continue;
    const rcode = extractString(ev['rcode']);
    let c = counts.get(dnName);
    if (!c) {
      c = { total: 0, success: 0 };
      counts.set(dnName, c);
    }
    c.total++;
    if (!isFailure(rcode)) c.success++;
  }

  return Array.from(counts.entries())
    .map(([dnName, { total, success }]) => ({
      dnName,
      count: total,
      successRate: total > 0 ? success / total : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

/**
 * Detect unexpected domains using two signals:
 *
 *   new_since_baseline — domain first appeared after the initial BASELINE_WINDOW_NS
 *     (120 seconds) of observation.  Requires the baseline to contain at least one
 *     event so that "no data yet" does not spuriously flag everything.
 *
 *   high_entropy — leftmost label Shannon entropy > DGA_ENTROPY_THRESHOLD.
 *     Applied regardless of baseline position.
 *
 * A single domain can produce multiple UnexpectedDomain entries (one per reason).
 */
function computeUnexpectedDomains(events: any[]): UnexpectedDomain[] {
  if (events.length === 0) return [];

  const timestamps = events
    .map(ev => extractTimestampNs(ev['timestamp']))
    .filter(t => t > 0);

  if (timestamps.length === 0) return [];

  const minTs = Math.min(...timestamps);
  const baselineEnd = minTs + BASELINE_WINDOW_NS;

  const baselineDomains = new Set<string>();
  const domainMeta = new Map<string, { ts: number; podName: string; namespace: string; count: number }>();

  for (const ev of events) {
    const dnName = extractString(ev['name']);
    if (!dnName) continue;
    const ts = extractTimestampNs(ev['timestamp']);
    const podName = extractString(ev['k8s.podName']);
    const namespace = extractString(ev['k8s.namespace']);

    if (ts > 0 && ts <= baselineEnd) {
      baselineDomains.add(dnName);
    }

    const existing = domainMeta.get(dnName);
    if (!existing || ts < existing.ts) {
      domainMeta.set(dnName, { ts, podName, namespace, count: existing?.count ?? 0 });
    }
    domainMeta.get(dnName)!.count++;
  }

  const result: UnexpectedDomain[] = [];
  for (const [dnName, info] of domainMeta.entries()) {
    const label = domainLabel(dnName);
    const entropy = shannonEntropy(label);

    if (!baselineDomains.has(dnName) && baselineDomains.size > 0) {
      result.push({
        dnName,
        queryCount: info.count,
        firstSeen: info.ts,
        podName: info.podName,
        namespace: info.namespace,
        reason: 'new_since_baseline',
        entropy,
      });
    }

    if (entropy > DGA_ENTROPY_THRESHOLD) {
      result.push({
        dnName,
        queryCount: info.count,
        firstSeen: info.ts,
        podName: info.podName,
        namespace: info.namespace,
        reason: 'high_entropy',
        entropy,
      });
    }
  }

  return result.sort(
    (a, b) => b.entropy - a.entropy || b.queryCount - a.queryCount
  );
}

/**
 * Master function: compute all DNS security signals from a bufferedGadgetData event array.
 *
 * Intended to be the sole entry point from the React component:
 *
 *   const signals = useMemo(
 *     () => computeDNSSecuritySignals(bufferedGadgetData[dsID] ?? []),
 *     [bufferedGadgetData[dsID]]
 *   );
 *
 * Pure function — deterministic, no side effects, safe to call in render.
 */
export function computeDNSSecuritySignals(events: any[]): DNSSecuritySignals {
  const failedLookupGroups = groupFailedLookups(events);

  return {
    retryStorms: detectRetryStorms(events),
    failedLookupGroups,
    unexpectedDomains: computeUnexpectedDomains(events),
    txtTunnelingCandidates: failedLookupGroups.filter(g => g.isTXTTunnelingCandidate),
    topDomains: computeTopDomains(events),
  };
}
