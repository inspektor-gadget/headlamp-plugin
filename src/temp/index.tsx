import {DetailsViewSectionProps, K8s, registerDetailsViewSection} from '@kinvolk/headlamp-plugin/lib';
import SectionBox from "@kinvolk/headlamp-plugin/lib/CommonComponents/SectionBox";
import React, { useState, useEffect } from 'react';
import SimpleTable from "@kinvolk/headlamp-plugin/lib/CommonComponents/SimpleTable";
import { JsonStreamParser, PubSub, pubSub } from '../gadgets/helper';

// Below are some imports you may want to use.
//   See README.md for links to plugin development documentation.
// import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
// import { K8s } from '@kinvolk/headlamp-plugin/lib/K8s';
// import { Typography } from '@material-ui/core';


const IG_CONTAINER_KEY = 'k8s-app';
const IG_CONTAINER_VALUE = 'gadget';



function isIGPod(podResource) {
    return podResource.metadata.labels[IG_CONTAINER_KEY] === IG_CONTAINER_VALUE;
}

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
    if (!resource || resource.kind !== 'Pod') return null;

    
});

// registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
//     if (!resource || resource.kind !== 'Pod') return null;
    
//     const decoder = new TextDecoder('utf-8');
//     const [entries, setEntries] = useState([]);
//     const [pods, error] = K8s.ResourceClasses.Pod.useList();
//     const gadgetID = "trace-gadget-open-sockets"
//     const [igPod, setIGPod] = useState(null);
//     const execRef = React.useRef(null);
            
//     function runGadgetWithActionAndPayload(socket, action, payload) {
//         socket.send('\0'+JSON.stringify({ action, payload }) + "\n");
//     }

//     useEffect(() => {
//         if (!pods) {
//             return
//         }
//         const igPod = pods?.find(isIGPod);
//         if (!igPod) {
//             return
//         }
//         setIGPod(igPod)
//     }, [pods])
    
    
//     useEffect(() => {
//         if (!igPod) {
//             return
//         }

//         if(execRef.current) {
//             return
//         }
//         execRef.current = igPod.exec('gadget', () => {}, {
//             command: ["/usr/bin/socat", "/run/gadgetstreamingservice.socket", "-"],
//             tty: false,
//             stdin: true,
//             stdout: true,
//             stderr: false,
//         })

//         const socket = execRef.current.getSocket()

//         socket.addEventListener('message', (event) => {
//             const items = new Uint8Array(event.data);
//             const text = decoder.decode(items.slice(1));

//             if (new Uint8Array(items)[0] !== 1) {
//               return;
//             }

//             const parser = new JsonStreamParser();
//             parser.feed(text);
//         })

//         socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "start", { gadgetName: 'open', gadgetCategory: 'trace', id: gadgetID }))

//         return () => {
//             socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "stop", { gadgetName: 'open', gadgetCategory: 'trace', id: gadgetID }))
//             execRef.current.cancel()
//         }
//     }, [resource, igPod])

//     React.useEffect(() => {
//         pubSub.subscribe(gadgetID, (data: {payload: any}) => {
//             const payload = data.payload
//             setEntries((prev) => [payload, ...prev.slice(0, 49)]);
//         })
//     }, [])

//     return (
//         <SectionBox title="Open File Events">
//             <SimpleTable
                // columns={[
                //     {
                //         label: 'Command',
                //         getter: e => e.comm,
                //     },
                //     {
                //         label: 'Path',
                //         getter: e => e.path,
                //     },
                //     {
                //         label: 'fd',
                //         getter: e => e.fd
                //     },
                //     {
                //         label: 'Ret',
                //         getter: e => e.ret
                //     }
                // ]}
//                 data={pods === null ? null : entries}
//                 reflectInURL="files"
//             />
//         </SectionBox>
//     );
// });


registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
    if (!resource || resource.kind !== 'Pod') return null;
    
    const decoder = new TextDecoder('utf-8');
    const [entries, setEntries] = useState([]);
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const gadgetID = "snapshot-gadget-process";
    const [igPod, setIGPod] = useState(null);
    const execRef = React.useRef(null);

    function runGadgetWithActionAndPayload(socket, action, payload) {
        socket.send('\0'+JSON.stringify({ action, payload }) + "\n");
    }

    useEffect(() => {
        if (!pods) {
            return
        }
        const igPod = pods?.find(isIGPod);
        if (!igPod) {
            return
        }
        setIGPod(igPod)
    }, [pods])
    
    
    useEffect(() => {
        if (!igPod) {
            return
        }

        if(execRef.current) {
            return
        }
        execRef.current = igPod.exec('gadget', () => {}, {
            command: ["/usr/bin/socat", "/run/gadgetstreamingservice.socket", "-"],
            tty: false,
            stdin: true,
            stdout: true,
            stderr: false,
        })

        const socket = execRef.current.getSocket()

        socket.addEventListener('message', (event) => {
            const items = new Uint8Array(event.data);
            const text = decoder.decode(items.slice(1));

            if (new Uint8Array(items)[0] !== 1) {
              return;
            }

            const parser = new JsonStreamParser();
            parser.feed(text);
        })
        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "start", { gadgetName: 'process', gadgetCategory: 'snapshot', id: gadgetID,
        params:{"max-rows": "50","operator.KubeManager.all-namespaces": "true"} }))

        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "start", { gadgetName: 'process', gadgetCategory: 'snapshot', id: gadgetID,
            params:{"max-rows":"50","operator.KubeManager.all-namespaces":"true"} }))
            execRef.current.cancel()
        }
    }, [resource, igPod])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: {payload: any}) => {
            const payload = data.payload
            setEntries((prev) => [...prev, ...payload]);
        })
    }, [])

    return (
        <SectionBox title="Processes">
            <SimpleTable
                columns={[
                    {
                        label: 'Command',
                        getter: e => e.comm,
                    },
                    {
                        label: 'Container',
                        getter: e => e.container,
                    },
                    {
                        label: 'mntns',
                        getter: e => e.mountnsid
                    },
                    {
                        label: 'Namespace',
                        getter: e => e.namespace
                    },
                    {
                        label: 'Node',
                        getter: e => e.node
                    },
                    {
                        label: 'Pid',
                        getter: e => e.pid
                    },
                    {
                        label: 'Pod',
                        getter: e => e.pod
                    },
                    {
                        label: 'ppid',
                        getter: e => e.ppid
                    },
                    {
                        label: 'tid',
                        getter: e => e.tid
                    }
                ]}
                data={pods === null ? null : entries}
                reflectInURL="processes"
            />
        </SectionBox>
    );
});

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
    if (!resource || resource.kind !== 'Pod') return null;
    
    const decoder = new TextDecoder('utf-8');
    const [entries, setEntries] = useState([]);

    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const gadgetID = "app-catalog";
    const [igPod, setIGPod] = useState(null);
    const execRef = React.useRef(null);

    function runGadgetWithActionAndPayload(socket, action, payload, other) {
        socket.send('\0'+JSON.stringify({ action, payload, ...other }) + "\n");
    }

    useEffect(() => {
        if (!pods) {
            return
        }
        const igPod = pods?.find(isIGPod);
        if (!igPod) {
            return
        }
        setIGPod(igPod)
    }, [pods])


    useEffect(() => {
        if (!igPod) {
            return
        }

        if(execRef.current) {
            return
        }
        execRef.current = igPod.exec('gadget', () => {}, {
            command: ["/usr/bin/socat", "/run/gadgetstreamingservice.socket", "-"],
            tty: false,
            stdin: true,
            stdout: true,
            stderr: false,
        })

        const socket = execRef.current.getSocket()

        socket.addEventListener('message', (event) => {
            const items = new Uint8Array(event.data);
            const text = decoder.decode(items.slice(1));

            if (new Uint8Array(items)[0] !== 1) {
              return;
            }

            const parser = new JsonStreamParser();
            parser.feed(text);
        })
        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "catalog", {}, {
            id: gadgetID
        }))

        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "catalog", {}, {
                id: gadgetID
            } ))
            execRef.current.cancel()
        }
    }, [resource, igPod])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: {payload: any}) => {
            console.log("app-catalog is ",data)
        })
    }, [])

    return <></>
})