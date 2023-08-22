import { useLocation, useParams } from 'react-router';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { useEffect, useState } from 'react';
import { JsonStreamParser, isIGPod, pubSub } from './helper';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionActions from "@material-ui/core/AccordionActions";
import { TextField, Box, Button, Paper } from '@material-ui/core';
import { SectionBox, SectionHeader, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Icon } from '@iconify/react';

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
    const [filters, setFilters] = React.useState({});
    const [applyFilters, setApplyFilters] = React.useState(false);
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
    console.log("apply filters", applyFilters)
    
    useEffect(() => {
        if (!igPod) {
            return
        }

        if(execRef.current) {
            return
        }
        console.log("inside apply filters")
        if(applyFilters) {
            execRef.current.close();
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

        let massagedFilters = {};
        console.log(Object.keys(filters))
        
        console.log(massagedFilters)
        Object.keys(filters).forEach((key) => {
            console.log(key)
            massagedFilters[key] = filters[key].value;
        })
        console.log(massagedFilters)
        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "start", {
            gadgetName: name,
            gadgetCategory: category,
            id: gadgetID,
            params: {...massagedFilters}
        }))

        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "stop", { gadgetName: name, gadgetCategory: category, id: gadgetID }))
            execRef.current.cancel()
        }
    }, [igPod, applyFilters])

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
    
    function prepareFilters(params, operatorParamsCollection) {
        const filters = {};

        for(const key in operatorParamsCollection) {
            switch(key) {
                case "KubeManager":
                    operatorParamsCollection[key].forEach((param) => {
                        switch(param.type) {
                            case "":
                                filters[`operator.KubeManager.${param.key}`] = {
                                    value: param.defaultValue,
                                    component: (props: {}) => {
                                    const [value, setValue] = React.useState(param.defaultValue);
                                    return <TextField variant="outlined" label={param.key} onChange={() => {
                                        setValue(value);
                                        filters[`operator.KubeManager.${param.key}`].value = value;
                                    }}/>
                                    }
                                }
                        }
                    })
            }
        }

        return filters;
        
    }

    useEffect(() => {
        setFilters(prepareFilters(params,operatorParamsCollection))
    }, [operatorParamsCollection])

    return (
        <>
        <Accordion square component={Paper}>
            <AccordionSummary
            expandIcon={<Icon icon={"mdi:chevron-down"} />}
            aria-controls=""
            id="gadget-filters">
             <SectionHeader title="Filters" />
            </AccordionSummary>

            <AccordionDetails>
                {
                    <Box display="flex">
                        {
                    Object.keys(filters)?.map((key) => {
                        const FilterComponent = filters[key].component;
                        return <Box m={1} width="100%">
                            <FilterComponent key={key} />
                            </Box>
                    })}
                    </Box>
                }
            </AccordionDetails>
            <AccordionActions>
                <Button variant="contained" onClick={() => {
                    setApplyFilters((prevFilterVal) => !prevFilterVal);
                }}>
                    Apply
                </Button>
            </AccordionActions>
        </Accordion>
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