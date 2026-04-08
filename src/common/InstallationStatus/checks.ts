import { IG_CONTAINER_KEY, IG_CONTAINER_VALUE } from '../../gadgets/helper';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'loading';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string;
  docsHint?: string;
}

export const IG_NAMESPACE = 'gadget';
export const IG_DAEMONSET_LABEL_KEY = IG_CONTAINER_KEY;
export const IG_DAEMONSET_LABEL_VALUE = IG_CONTAINER_VALUE;

export function checkNamespace(namespaces: any[] | null): CheckResult {
  if (namespaces === null) {
    return {
      name: 'Namespace',
      status: 'loading',
      message: 'Checking for gadget namespace...',
    };
  }

  const found = namespaces.some(
    ns => ns.jsonData?.metadata?.name === IG_NAMESPACE || ns.metadata?.name === IG_NAMESPACE
  );

  if (found) {
    return {
      name: 'Namespace',
      status: 'pass',
      message: `Namespace "${IG_NAMESPACE}" exists.`,
    };
  }

  return {
    name: 'Namespace',
    status: 'fail',
    message: `Namespace "${IG_NAMESPACE}" not found.`,
    details:
      'Inspektor Gadget requires the "gadget" namespace. This usually means Inspektor Gadget has not been installed yet.',
    docsHint: 'Install Inspektor Gadget using Helm or kubectl to create the required namespace.',
  };
}

export function checkDaemonSet(daemonSets: any[] | null): CheckResult {
  if (daemonSets === null) {
    return {
      name: 'DaemonSet',
      status: 'loading',
      message: 'Checking for gadget DaemonSet...',
    };
  }

  const ds = daemonSets.find(d => {
    const meta = d.jsonData || d;
    const metadataLabels = meta?.metadata?.labels || {};
    const selectorLabels = meta?.spec?.selector?.matchLabels || {};
    return (
      metadataLabels[IG_DAEMONSET_LABEL_KEY] === IG_DAEMONSET_LABEL_VALUE ||
      selectorLabels[IG_DAEMONSET_LABEL_KEY] === IG_DAEMONSET_LABEL_VALUE
    );
  });

  if (!ds) {
    return {
      name: 'DaemonSet',
      status: 'fail',
      message: 'Inspektor Gadget DaemonSet not found in the gadget namespace.',
      details:
        'The Inspektor Gadget DaemonSet is responsible for running gadget pods on each node. Without it, no gadgets can execute.',
      docsHint: 'Re-install Inspektor Gadget to create the DaemonSet.',
    };
  }
  const status = ds.jsonData?.status || ds.status || {};
  const desired = status.desiredNumberScheduled ?? 0;
  const ready = status.numberReady ?? 0;
  const unavailable = status.numberUnavailable ?? 0;

  if (desired === 0) {
    return {
      name: 'DaemonSet',
      status: 'warn',
      message: 'DaemonSet found but desired replicas is 0.',
      details:
        'The DaemonSet exists but is not scheduling any pods. Check node selectors or taints.',
    };
  }

  if (ready === desired) {
    return {
      name: 'DaemonSet',
      status: 'pass',
      message: `DaemonSet healthy: ${ready}/${desired} replicas ready.`,
    };
  }

  if (ready > 0) {
    return {
      name: 'DaemonSet',
      status: 'warn',
      message: `DaemonSet partially ready: ${ready}/${desired} replicas (${unavailable} unavailable).`,
      details:
        'Some nodes are not running the Inspektor Gadget pod. Gadgets will not capture events from those nodes.',
      docsHint: 'Check node taints, resource limits, or scheduling constraints.',
    };
  }

  return {
    name: 'DaemonSet',
    status: 'fail',
    message: `DaemonSet found but 0/${desired} replicas ready.`,
    details: 'The DaemonSet exists but no pods are running. Check pod events and logs for errors.',
    docsHint: 'Run "kubectl describe ds -n gadget" to see scheduling failures.',
  };
}

export function checkPodHealth(pods: any[] | null): CheckResult {
  if (pods === null) {
    return {
      name: 'Pod Health',
      status: 'loading',
      message: 'Checking gadget pod health...',
    };
  }

  const igPods = pods.filter(pod => {
    const labels = pod.jsonData?.metadata?.labels || pod.metadata?.labels || {};
    const namespace = pod.jsonData?.metadata?.namespace || pod.metadata?.namespace;
    return (
      labels[IG_DAEMONSET_LABEL_KEY] === IG_DAEMONSET_LABEL_VALUE && namespace === IG_NAMESPACE
    );
  });

  if (igPods.length === 0) {
    return {
      name: 'Pod Health',
      status: 'fail',
      message: 'No gadget pods found.',
      details: `No pods with label k8s-app=gadget were found in the "${IG_NAMESPACE}" namespace.`,
    };
  }

  const podStatuses: string[] = [];
  let crashingCount = 0;
  let pendingCount = 0;
  let runningCount = 0;

  for (const pod of igPods) {
    const podData = pod.jsonData || pod;
    const phase = podData.status?.phase || 'Unknown';
    const containerStatuses = podData.status?.containerStatuses || [];

    const isCrashing = containerStatuses.some(
      (cs: any) =>
        cs.state?.waiting?.reason === 'CrashLoopBackOff' ||
        cs.state?.waiting?.reason === 'ImagePullBackOff' ||
        cs.state?.waiting?.reason === 'ErrImagePull'
    );

    if (isCrashing) {
      const reason =
        containerStatuses.find(
          (cs: any) =>
            cs.state?.waiting?.reason === 'CrashLoopBackOff' ||
            cs.state?.waiting?.reason === 'ImagePullBackOff' ||
            cs.state?.waiting?.reason === 'ErrImagePull'
        )?.state?.waiting?.reason || 'Unknown';
      podStatuses.push(`${podData.metadata?.name || 'unknown'}: ${reason}`);
      crashingCount++;
    } else if (phase === 'Pending') {
      podStatuses.push(`${podData.metadata?.name || 'unknown'}: Pending`);
      pendingCount++;
    } else if (phase === 'Running') {
      runningCount++;
    }
  }

  if (crashingCount > 0) {
    return {
      name: 'Pod Health',
      status: 'fail',
      message: `${crashingCount}/${igPods.length} gadget pod(s) are failing.`,
      details: podStatuses.join('\n'),
      docsHint:
        'Check pod logs with "kubectl logs -n gadget <pod-name>". Common causes: missing BTF support, incompatible kernel version, or image pull errors.',
    };
  }

  if (pendingCount > 0) {
    return {
      name: 'Pod Health',
      status: 'warn',
      message: `${pendingCount}/${igPods.length} gadget pod(s) are pending.`,
      details: podStatuses.join('\n'),
      docsHint: 'Check node resources and scheduling constraints.',
    };
  }

  if (runningCount === igPods.length) {
    return {
      name: 'Pod Health',
      status: 'pass',
      message: `All ${runningCount} gadget pod(s) are running.`,
    };
  }

  return {
    name: 'Pod Health',
    status: 'warn',
    message: `${runningCount}/${igPods.length} gadget pod(s) running.`,
    details: podStatuses.length > 0 ? podStatuses.join('\n') : undefined,
  };
}

export function checkNodeCoverage(pods: any[] | null, nodes: any[] | null): CheckResult {
  if (pods === null || nodes === null) {
    return {
      name: 'Node Coverage',
      status: 'loading',
      message: 'Checking node coverage...',
    };
  }

  const schedulableNodes = nodes.filter(node => {
    const nodeData = node.jsonData || node;
    const spec = nodeData.spec || {};
    const taints = spec.taints || [];
    if (spec.unschedulable === true) return false;
    if (taints.some((t: any) => t.effect === 'NoSchedule')) return false;
    const conditions: any[] = nodeData.status?.conditions || [];
    const readyCondition = conditions.find((c: any) => c.type === 'Ready');
    return readyCondition?.status === 'True';
  });

  const igPods = pods.filter(pod => {
    const labels = pod.jsonData?.metadata?.labels || pod.metadata?.labels || {};
    const namespace = pod.jsonData?.metadata?.namespace || pod.metadata?.namespace;
    return (
      labels[IG_DAEMONSET_LABEL_KEY] === IG_DAEMONSET_LABEL_VALUE && namespace === IG_NAMESPACE
    );
  });

  const coveredNodes = new Set(
    igPods
      .filter(pod => {
        const phase = (pod.jsonData || pod).status?.phase;
        return phase === 'Running';
      })
      .map(pod => (pod.jsonData || pod).spec?.nodeName)
      .filter(Boolean)
  );

  const totalSchedulable = schedulableNodes.length;
  const covered = coveredNodes.size;

  if (totalSchedulable === 0) {
    return {
      name: 'Node Coverage',
      status: 'warn',
      message: 'No schedulable nodes found.',
    };
  }

  if (covered === totalSchedulable) {
    return {
      name: 'Node Coverage',
      status: 'pass',
      message: `All ${totalSchedulable} schedulable node(s) covered.`,
    };
  }

  if (covered > 0) {
    const uncoveredNames = schedulableNodes
      .filter(n => {
        const name = n.jsonData?.metadata?.name || n.metadata?.name;
        return !coveredNodes.has(name);
      })
      .map(n => n.jsonData?.metadata?.name || n.metadata?.name);

    return {
      name: 'Node Coverage',
      status: 'warn',
      message: `${covered}/${totalSchedulable} nodes covered. Missing: ${uncoveredNames.join(
        ', '
      )}`,
      details:
        'Gadgets will not capture events from uncovered nodes. This may cause blind spots in observability.',
      docsHint: 'Check DaemonSet tolerations and node taints.',
    };
  }

  return {
    name: 'Node Coverage',
    status: 'fail',
    message: 'No nodes are running a gadget pod.',
    details: `0/${totalSchedulable} schedulable nodes have a running gadget pod.`,
  };
}

export function getOverallStatus(
  checks: CheckResult[]
): 'healthy' | 'degraded' | 'failed' | 'loading' {
  if (checks.some(c => c.status === 'loading')) return 'loading';
  if (checks.every(c => c.status === 'pass')) return 'healthy';
  if (checks.some(c => c.status === 'fail')) return 'failed';
  return 'degraded';
}

export function formatDiagnostics(checks: CheckResult[]): string {
  const lines = [
    'Inspektor Gadget Plugin - Installation Diagnostics',
    `Timestamp: ${new Date().toISOString()}`,
    '---',
  ];

  for (const check of checks) {
    const statusMap: Record<CheckStatus, string> = {
      pass: 'PASS',
      warn: 'WARN',
      fail: 'FAIL',
      loading: 'LOAD',
    };
    const icon = statusMap[check.status] ?? 'FAIL';
    lines.push(`[${icon}] ${check.name}: ${check.message}`);
    if (check.details) {
      lines.push(`       Details: ${check.details}`);
    }
    if (check.docsHint) {
      lines.push(`       Hint: ${check.docsHint}`);
    }
  }

  return lines.join('\n');
}
