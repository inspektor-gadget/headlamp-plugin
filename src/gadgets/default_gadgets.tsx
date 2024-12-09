export const DefaultGadgets = [
  {
    name: 'trace_bind',
    description: 'The trace_bind gadget is used to stream socket binding syscalls',
  },
  {
    name: 'trace_capabilities',
    description:
      'The trace_capabilities gadget allows us to see what capability security checks are triggered by applications running in a container',
  },
  {
    name: 'trace_dns',
    description:
      'The trace dns gadget prints information about DNS queries and responses sent and received by the different pods',
  },
  {
    name: 'trace_exec',
    description: 'The trace exec gadget streams new processes creation events',
  },
  {
    name: 'trace_fsslower',
    description:
      'The trace fsslower gadget streams file operations (open, read, write and fsync) that are slower than a threshold.',
  },
  {
    name: 'trace_lsm',
    description: 'A strace for LSM tracepoints',
  },
  {
    name: 'trace_malloc',
    description: 'use uprobe to trace malloc and free in libc.so',
  },
  {
    name: 'trace_mount',
    description:
      'The trace_mount gadget emits events when mount and unmount system calls are made.',
  },
  {
    name: 'trace__oomkill',
    description: 'The trace_oomkill gadget is used to trace OOM kill events.',
  },
  {
    name: 'trace_open',
    description: 'The trace_open gadget emits events when files are opened.',
  },
  {
    name: 'trace_signal',
    description: 'Trace Signals',
  },
  {
    name: 'trace_sni',
    description: 'The trace_sni gadget tracks Server Name Indication (SNI) from TLS requests.',
  },
  {
    name: 'trace_ssl',
    description:
      'Captures data on read/recv or write/send functions of OpenSSL, GnuTLS, NSS and Libcrypto',
  },
  {
    name: 'trace_tcp',
    description: 'The trace_tcp gadget tracks tcp connect, accept and close.',
  },
  {
    name: 'trace_tcpconnect',
    description: 'trace tcp connections',
  },
  {
    name: 'trace_tcpdrop',
    description: 'The trace_tcpdrop gadget tracks TCP kernel-dropped packets/segments',
  },
  {
    name: 'trace_tcpretrans',
    description: 'The trace_tcpretrans gadget tracks TCP retransmissions.',
  },
  {
    name: 'snapshot_socket',
    description: 'The snapshot_socket shows existing sockets',
  },
  {
    name: 'snapshot_process',
    description: 'The snapshot_process shows running processes.',
  },
  {
    name: 'profile_tcprtt',
    description:
      'The profile_tcprtt gadget generates a histogram distribution of the TCP connections Round-Trip Time (RTT). The RTT values used to create the histogram are collected from the smoothed RTT information already provided by the Linux kernel for the TCP sockets.',
  },
  {
    name: 'profile_blockio',
    description:
      'The profile_blockio gadget gathers information about the usage of the block device I/O (disk I/O), generating a histogram distribution of I/O latency (time), when the gadget is stopped.',
  },
  {
    name: 'fsnotify',
    description:
      'The fsnotify gadget detects applications using inotify or fanotify and enriches the events with the process-related metadata.',
  },
  {
    name: 'deadlock',
    description:
      'Use uprobe to trace pthread_mutex_lock and pthread_mutex_unlock in libc.so and detect potential deadlocks.',
  },
  {
    name: 'top_blockio',
    description:
      'The top_blockio gadget provides a periodic list of input/output block device activity. This gadget requires Linux Kernel Version 6.5+.',
  },
  {
    name: 'top_file',
    description: 'The top_file gadget reports periodically the read/write activity by file.',
  },
  {
    name: 'top_tcp',
    description: 'The top_tcp gadget reports tcp send receive activity by connection.',
  },
];
