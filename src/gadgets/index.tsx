import { useLocation, useParams } from 'react-router';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { useEffect, useState } from 'react';
import { JsonStreamParser, isIGPod, pubSub } from './helper';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionActions from "@material-ui/core/AccordionActions";
import { TextField, Box, Button, Paper, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch, Grid, Typography, IconButton } from '@material-ui/core';
import { SectionBox, SectionHeader, SimpleTable, Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Icon } from '@iconify/react';
import { BlockIOChart } from './block-io';
import { GadgetStatus, PersistentGadget } from './persistent';
import { TcprttChart } from './tcprtt';


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
        
        Object.keys(filters).forEach((key) => {
            console.log(key)
            massagedFilters[key] = filters[key].value;
        })
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
    }, [igPod])

    React.useEffect(() => {
        if(!igPod) {
            return
        }
        const socket = execRef.current.getSocket()
        socket.send(runGadgetWithActionAndPayload(socket, "stop", {
            gadgetName: name,
            gadgetCategory: category,
            id: gadgetID,
        }))
        let massagedFilters = {};
        
        Object.keys(filters).forEach((key) => {
            console.log(key)
            massagedFilters[key] = filters[key].value;
        })

        socket.send(runGadgetWithActionAndPayload(socket, "start", {
            gadgetName: name,
            gadgetCategory: category,
            id: gadgetID,
            params: {...massagedFilters}
        }))
        setEntries(null);
    }, [applyFilters])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: any) => {
            let dataToUse = data
            
            if (dataAccessKey) {
                dataToUse = data[dataAccessKey];
            }
            
            if (isDataAccessTypeObject) {
                setEntries((prev) => prev === null ? [dataToUse] : [...prev, dataToUse]);
            } else {
                setEntries((prev) => prev === null ? [...dataToUse] : [...prev, ...dataToUse]);
            }
        })
    }, [])
    
    function prepareFilters(params, operatorParamsCollection) {
        const filters = {};
        if (params) {
            for (const item of params) {
                if(item.type === "bool") {
                    filters[`${item.key}`] = {
                        value: item.defaultValue,
                        component: (props: {}) => {
                            const [value, setValue] = React.useState(false);
                            return <FormControlLabel
                            control={
                            <Switch checked={value} 
                                    defaultValue={item.defaultValue}
                                    onChange={(event) => {
                                        setValue(event.target.checked)
                                        filters[`${item.key}`].value = String(event.target.checked);
                                        setFilters({...filters})
                            }} />}
                            label={item.title}
                          />
                    
                        }
                    }
                }
                if(item.possibleValues) {
                    filters[`${item.key}`] = {
                        value: item.defaultValue,
                        component: () => {
                            const [value, setValue] = React.useState(item.defaultValue)
                            return (
                                <FormControl variant="outlined" fullWidth>
                        <InputLabel htmlFor={`${item.title}`}>
                            {item.title}
                        </InputLabel>
                        <Select value={value} 
                        onChange={(event) => {
                            setValue(event.target.value);
                                    filters[`${item.key}`].value = event.target.value;
                                    setFilters({...filters})
                        }}
                        inputProps={
                            {
                                id: `${item.title}`
                            }
                        }
                        >
                            {item.possibleValues.map((val) => {
                                return <MenuItem value={val}>
                                    {val}
                                </MenuItem>
                            })}
                            </Select>
                    </FormControl>
                            )
                        }
                    }
                    
                }
            }
        }
        

        for(const key in operatorParamsCollection) {
            switch(key) {
                case "KubeManager":
                    operatorParamsCollection[key].forEach((param) => {
                        if(pods && param.valueHint.split(":")[1] === "pod") {
                            filters[`operator.KubeManager.${param.key}`] = {
                                value: "",
                                component: () => {
                                    const [value, setValue] = React.useState("All");
                            return <FormControl variant="outlined" fullWidth>
                                <InputLabel htmlFor="podname-select">
                                    Podname
                                </InputLabel>
                            <Select v
                            defaultValue="All"
                            alue={value} onChange={(event) => {
                                setValue(event.target.value);
                                if(event.target.value === "All") {
                                    filters[`operator.KubeManager.${param.key}`].value = "";
                                    
                                } else {
                                    filters[`operator.KubeManager.${param.key}`].value = event.target.value;
                                
                                }
                                setFilters({...filters})

                            }}
                            inputProps={
                                {
                                    id: "podname-select"
                                }
                            }
                            >
                            <MenuItem value="">
                                All
                            </MenuItem>
                            {pods.map((pod) => {
                                return (
                                    <MenuItem value={pod.metadata.name}>
                                        {pod.metadata.name}
                                    </MenuItem>
                                )
                            })

                            }</Select>
                            </FormControl>
                                }
                            }
                            return;
                        }
                        switch(param.type) {
                            case "":
                                filters[`operator.KubeManager.${param.key}`] = {
                                    value: param.defaultValue,
                                    component: (props: {}) => {
                                    const [value, setValue] = React.useState(param.defaultValue);
                                    return <TextField variant="outlined" label={param.key} onChange={(event) => {
                                        setValue(event.target.value);
                                        filters[`operator.KubeManager.${param.key}`].value = event.target.value;
                                        setFilters({...filters})
                                    }}/>
                                    }
                                }
                                break;
                            case "bool": 
                                filters[`operator.KubeManager.${param.key}`] = {
                                    value: param.defaultValue,
                                    component: (props: {}) => {
                                        const [value, setValue] = React.useState(false);
                                        console.log("bool default value", param.defaultValue)
                                        console.log("all namespace value", value)
                                        return <FormControlLabel
                                        control={
                                        <Switch checked={value} 
                                                defaultValue={param.defaultValue}
                                                onChange={(event) => {
                                                    setValue(event.target.checked)
                                                    filters[`operator.KubeManager.${param.key}`].value = String(event.target.checked);
                                                    setFilters({...filters})
                                        }} />}
                                        label={param.key}
                                      />
                                
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
    }, [operatorParamsCollection, pods])

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
    
    if (gadget === 'block-io' && category === "profile") {
        return <PersistentGadget 
            gadgetID='block-io-profile' 
            gadgetName={gadget}
            gadgetCategory={category}
            GadgetResultComponent={BlockIOChart}
            title="Biolatency"
            startMessage={'Start recording the block I/O latency data and then stop at any time to see the results'}
        />
    }
    if (gadget === "tcprtt" && category === "profile") {
        return <PersistentGadget
                gadgetID='tcprtt-profile'
                gadgetName={gadget}
                gadgetCategory={category}
                GadgetResultComponent={TcprttChart}
                title="Tcp round trip time"
                startMessage={'Start recording the TCP round trip time data and then stop at any time to see the results'}
                />
    }

    if(gadget === "dns" && category === "trace") {
        return <GenericGadgetRenderer
        name={gadget}
        category={category}
        dataAccessKey='payload'
        gadgetID='open-trace-gadget'
        isDataAccessTypeObject={true}
        gadget={gadgetObj}
        columns={[{
            label: 'Node',
            getter: e => e.node
        }, {
            label: 'Namespace',
            getter: e => e.namespace
        }, {
            label: 'PID',
            getter: e => e.pid
        }, {
            label: 'TID',
            getter: e => e.tid
        }, {
            label: 'COMM',
            getter: e => e.comm
        }, {
            label: 'QR',
            getter: e => e.qr
        }, {
            label: 'Type',
            getter: e => e.type
        }, {
            label: 'Qtype',
            getter: e => e.qtype
        }, {
            label: 'Name',
            getter: e => e.name
        }, {
            label: 'Rcode',
            getter: e => e.rcode
        }]}/>

    }

    if(gadget === 'network' && category === "trace") {
        return <GenericGadgetRenderer
                name={gadget}
                category={category}
                dataAccessKey='payload'
                gadgetID='open-trace-gadget'
                isDataAccessTypeObject={true}
                gadget={gadgetObj}
                columns={[{
                    label: 'node',
                    getter: e => e.node
                }, {
                    label: 'namespace',
                    getter: e => e.namespace
                }, {
                    label: 'pod',
                    getter: e => e.pod
                }, {
                    label: 'pid',
                    getter: e => e.pid
                }, {
                    label: 'tid',
                    getter: e => e.tid
                }, {
                    label: 'comm',
                    getter: e => e.comm
                }, {
                    label: 'Type',
                    getter: e => e.type
                }, {
                    label: 'Proto',
                    getter: e => e.proto
                }, {
                    label: 'Port',
                    getter: e => e.port
                }, {
                    label: 'podHostIP',
                    getter: e => e.podHostIP
                }, {
                    label: 'podIP',
                    getter: e => e.podIP
                }]}
                />

    }

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
                },
                {
                    label: 'Podname',
                    getter: e => e.pod
                }, {
                    label: 'Namespace',
                    getter: e => e.namespace
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