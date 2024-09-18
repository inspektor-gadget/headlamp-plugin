export const DefaultGadgets = [
    {
        name: 'snapshot_process',
        type: 'snapshot',
        category: 'process',
        description: 'The snapshot process gadget gathers information about processes running inside the pods'

    },
    {
        name: 'trace_open',
        type: 'trace',
        category: 'open',
        description: 'The trace open gadget streams events related to files opened inside pods',
    },{
        name: 'top_file',
        type: 'top',
        category: 'file',
        description: 'Track reads and writes by file, with container details'
    }, {
        name: 'trace_dns',
        type: 'trace',
        category: 'dns',
        description: 'The trace dns gadget prints information about DNS queries and responses sent and received by the different pods'
    }, {
        name: 'snapshot_socket',
        type: 'snapshot',
        category: 'socket',
        description: 'The snapshot socket gadget gathers information about TCP and UDP sockets'
    }, {
        name: 'trace_exec',
        type: 'trace',
        category: 'exec',
        description: 'The trace exec gadget streams new processes creation events'
    }, {
        name: 'trace_signal',
        type: 'trace',
        category: 'signal',
        description: 'The trace signal gadget is used to trace system signals received by the pods'
    }, {
        name: 'trace_tcpdrop',
        type: 'trace',
        category: 'tcpdrop',
        description: 'The trace tcpdrop gadget traces TCP packets dropped by the kernel'
    }, {
        name: 'trace_sni',
        type: 'trace',
        category: 'sni',
        description: 'The trace sni gadget is used to trace the Server Name Indication (SNI) requests sent as part of TLS handshakes'
    }, {
        name: 'trace_mount',
        type: 'trace',
        category: 'mount',
        description: 'The trace mount gadget is used to monitor mount and umount syscalls'
    },{
        name: 'profile_blockio',
        type: 'profile',
        category: 'blockio',
        description: 'The profile blockio gadget is used to profile block IO operations'
    },{
        name:'trace_oomkill',
        type: 'trace',
        category: 'oomkill',
        description: 'The trace oomkill gadget traces out of memory kills'
    }
]