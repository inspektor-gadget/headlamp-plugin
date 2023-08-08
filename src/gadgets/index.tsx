import { useLocation, useParams } from 'react-router';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { useEffect, useState } from 'react';
import { JsonStreamParser, isIGPod, pubSub } from './helper';
import { SectionBox, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';


function GenericGadgetRenderer(props: {
    name: string,
    category: string,
    gadget: any,
    dataAccessKey: string,
    columns: {
        label: string,
        getter: (...args) => any
    }[],
    gadgetID: string,
    isDataAccessTypeObject?: boolean,
}) {
    const { name, category, gadget, dataAccessKey, columns, gadgetID, isDataAccessTypeObject } = props;
    const { params, operatorParamsCollection } = gadget;
    const decoder = new TextDecoder('utf-8');
    const [entries, setEntries] = useState(null);
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const [igPod, setIGPod] = useState(null);
    const execRef = React.useRef(null);

    console.log("params and operation params", params, operatorParamsCollection)
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

        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "start", {
            gadgetName: name,
            gadgetCategory: category,
            id: gadgetID
        }))

        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "stop", { gadgetName: name, gadgetCategory: category, id: gadgetID }))
            execRef.current.cancel()
        }
    }, [igPod])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: any) => {
            let dataToUse = data
            if (dataAccessKey) {
                dataToUse = data[dataAccessKey];
            }
            console.log(data)
            if (isDataAccessTypeObject) {
                setEntries((prev) => prev === null ? [dataToUse] : [...prev, dataToUse]);
            } else {
                setEntries((prev) => prev === null ? [...dataToUse] : [...prev, ...dataToUse]);
            }
        })
    }, [])

    return (
        <>
        <SectionBox title="Filters">
            
        </SectionBox>
        <SectionBox title={name} backLink={true}>
            <SimpleTable
                columns={columns}
                data={entries}  
            />
        </SectionBox>
        </>
    )
}

export default function Gadget() {
    const location = useLocation()
    const {gadget, category} = useParams<{gadget: string, category: string}>();
    const gadgetObj = location.state;
    
    if(gadget === "socket" && category === "snapshot") {
        return <GenericGadgetRenderer
            name={gadget}
            category={category}
            dataAccessKey={"payload"}
            gadgetID={"socket-snapshot-gadget"}
            gadget={gadgetObj}
            columns={[{
                label: 'Src',
                getter: e => `${e.src.addr}:${e.src.port}`
            },{
                label: 'Destination',
                getter: e => `${e.dst.addr}:${e.dst.port}`
            },{
                label: 'Node',
                getter: e => e.node
            },{
                label: 'Pod',
                getter: e => e.pod
            },{
                label: 'Protocol',
                getter: e => e.protocol
            }, {
                label: 'Status',
                getter: e => e.status
            }]}
        />
    }

    if (gadget === "process" && category === "snapshot") {
        return <GenericGadgetRenderer
            name={gadget}
            category={category}
            dataAccessKey='payload'
            gadgetID='process-snapshot-gadget'
            gadget={gadgetObj}
            columns={[{
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
            }]}
            />
    }

    if (gadget === "open" && category === "trace") {
        return <GenericGadgetRenderer
            name={gadget}
            category={category}
            dataAccessKey='payload'
            gadgetID='open-trace-gadget'
            isDataAccessTypeObject={true}
            gadget={gadgetObj}
            columns={[
                {
                    label: 'Command',
                    getter: e => e.comm,
                },
                {
                    label: 'Path',
                    getter: e => e.path,
                },
                {
                    label: 'fd',
                    getter: e => e.fd
                },
                {
                    label: 'Ret',
                    getter: e => e.ret
                }
            ]}
        />
    }

    return (
        <div>
            <h1>Gadget</h1>
            <p>
                This is the Gadget page.
            </p>
        </div>
    )
}