/**
 * DNS Security Analysis — TypeScript interfaces.
 *
 * These types describe the output of the pure analysis functions in dnsAnalysis.ts.
 * They are intentionally decoupled from Headlamp/MUI so that the analysis layer
 * can be tested independently of the UI layer.
 */

/** Aggregated group of failed DNS lookups for a single domain. */
export interface FailedLookupGroup {
  dnName: string;
  /** Total failed query count across all pods in the observation window. */
  count: number;
  /** Unix nanoseconds of the earliest failure event. */
  firstSeen: number;
  /** Unix nanoseconds of the most recent failure event. */
  lastSeen: number;
  /** Unique pod names that issued failed queries for this domain. */
  affectedPods: string[];
  /** Unique DNS query types seen for this domain (e.g. "A", "AAAA", "TXT"). */
  qtypes: string[];
  /** Unique response codes seen (e.g. "NXDOMAIN", "SERVFAIL", "REFUSED"). */
  rcodes: string[];
  /**
   * True when the leftmost label of the domain name has Shannon entropy
   * above DGA_ENTROPY_THRESHOLD (3.5 bits/char).  Advisory signal only.
   */
  isDGASuspect: boolean;
  /**
   * True when qtypes includes "TXT" and count exceeds TXT_TUNNELING_MIN_COUNT (5).
   * Elevated TXT query failure rates can indicate DNS tunneling attempts.
   */
  isTXTTunnelingCandidate: boolean;
  /** Computed Shannon entropy of the leftmost domain label. */
  entropy: number;
}

/**
 * A retry storm: the same (dnName, podName) pair producing >= 10 queries
 * in a 10-second sliding window with > 50% failure rate.
 */
export interface RetryStorm {
  dnName: string;
  podName: string;
  namespace: string;
  /** Start of the detected 10-second window (Unix ns). */
  windowStartNs: number;
  /** End of the detected 10-second window (Unix ns). */
  windowEndNs: number;
  /** Total queries from this pod to this domain within the window. */
  queryCount: number;
  /** Queries with rcode !== "NOERROR" within the window. */
  failureCount: number;
  /** failureCount / queryCount */
  failureRate: number;
  /** Per-rcode breakdown, e.g. { NXDOMAIN: 8, NOERROR: 2 }. */
  rcodeBreakdown: Record<string, number>;
}

/** A domain flagged as unexpected relative to the observation baseline. */
export interface UnexpectedDomain {
  dnName: string;
  queryCount: number;
  /** Unix nanoseconds when this domain was first seen. */
  firstSeen: number;
  podName: string;
  namespace: string;
  reason: 'new_since_baseline' | 'high_entropy' | 'external_only';
  /** Shannon entropy of the leftmost domain label. */
  entropy: number;
}

/** The complete set of security signals derived from the DNS event buffer. */
export interface DNSSecuritySignals {
  retryStorms: RetryStorm[];
  failedLookupGroups: FailedLookupGroup[];
  unexpectedDomains: UnexpectedDomain[];
  /** Subset of failedLookupGroups flagged as TXT tunneling candidates. */
  txtTunnelingCandidates: FailedLookupGroup[];
  /** Top 20 most-queried domains with success rates, sorted by count desc. */
  topDomains: Array<{ dnName: string; count: number; successRate: number }>;
}
