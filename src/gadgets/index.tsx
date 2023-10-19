import { useLocation, useParams } from 'react-router';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { useEffect, useState } from 'react';
import { JsonStreamParser, isIGPod, pubSub } from './helper';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import { Button, Paper, Grid, Select } from '@material-ui/core';
import { SectionBox, SectionHeader, SimpleTable, Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Icon } from '@iconify/react';
import _ from 'lodash';
import { prepareFilters } from './filters';
import { BarChart } from './barChart';


function GenericGadgetRenderer(props: {
    name: string,
    category: string,
    gadget: any,
    columns: {
        label: string,
        getter: (...args) => any
    }[],
    gadgetID: string,
    isDataAccessTypeObject?: boolean,
}) {
    const { name, category, gadget, columns, gadgetID } = props;
    console.log("columns are ",columns)
    const { params, operatorParamsCollection } = gadget;
    const decoder = new TextDecoder('utf-8');
    const [entries, setEntries] = useState([]);
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const [nodes, nodesError] = K8s.ResourceClasses.Node.useList();
    const [namespaces, namespaceError] = K8s.ResourceClasses.Namespace.useList();
    const [igPod, setIGPod] = useState(null);
    const [loading, setLoading] = React.useState(false);
    const execRef = React.useRef(null);
    const [filters, setFilters] = React.useState({});
    const [applyFilters, setApplyFilters] = React.useState(false);
    const [gadgetRunningStatus, setGadgetRunningStatus] = React.useState(false);
    const [gadgetPayload, setGadgetPayload] = React.useState(null);
    const [isBackgroundRunning, setIsBackgroundRunning] = React.useState(gadgetPayload);
    const gadgetListID = "gadget-list";
    const handleChange = (event) => {
      setIsBackgroundRunning(event.target.checked);
    };

    function runGadgetWithActionAndPayload(socket, action, payload, extraParams={}) {
        console.log("action and payload",action, payload)
        socket.send('\0'+JSON.stringify({ action, payload, ...extraParams }) + "\n");
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

        socket.addEventListener("open", () => runGadgetWithActionAndPayload(socket, "list"
        ,{}, {id: gadgetListID}))
        

        return () => {
            execRef.current.cancel()
        }
    }, [igPod])

    React.useEffect(() => {
        if(!igPod) {
            return
        }        
        const socket = execRef.current.getSocket()
        

        if(gadgetPayload && !isBackgroundRunning) {
            socket.send(runGadgetWithActionAndPayload(socket, "stop", {
                gadgetName: name,
                gadgetCategory: category,
                id: gadgetPayload? gadgetPayload.id : gadgetID,
            }))

            socket.send(runGadgetWithActionAndPayload(socket, "delete", {
                name,
                category,
                id: gadgetPayload ? gadgetPayload.id : gadgetID,
        }))
        }
    
        let massagedFilters = {};
        
        Object.keys(filters).forEach((key) => {
            massagedFilters[key] = filters[key].value;
        })

        socket.send(runGadgetWithActionAndPayload(socket, "start", {
            gadgetName: name,
            gadgetCategory: category,
            id: gadgetPayload ? gadgetPayload.id : gadgetID,
            params: {...massagedFilters},
            background: isBackgroundRunning
        }))
        
        setEntries(null);
    }, [applyFilters, isBackgroundRunning])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: any) => {
            setLoading(false)
            setGadgetRunningStatus(true);

            if (name === 'block-io' && category === "profile") {
                const unit = data.payload.unit || ''
            const intervals = data.payload?.intervals;
            const labels = intervals.map((interval) => `${interval.start}-${interval.end} ${unit}`)
            setEntries(
                {
                    'labels': labels,
                    datasets: [{  
                      label: 'count',
                      data: intervals.map((interval) => interval.count),
                      borderColor: 'rgb(53, 162, 235)',
                      backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    }]
                }
            )
            } else if(name === "tcprtt" && category === "profile") {
                const intervals = data.payload?.histograms[0]?.intervals;
            const unit = data.payload?.histograms[0]?.unit || ''
            console.log(entries)
            const labels = intervals.map((interval) => `${interval.start}-${interval.end} ${unit}`)
            setEntries(
                {
                    'labels': labels,
                    datasets: [{  
                      label: 'count',
                      data: intervals.map((interval) => interval.count),
                      borderColor: 'rgb(255, 99, 132)',
                      backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    }]
                }
            )
            } else {
                let dataToUse = data
                if (dataToUse.payload) {
                    dataToUse = data["payload"];
                }
                if (!Array.isArray(dataToUse)) {
                    setEntries((prev) => prev === null ? [dataToUse] : [...prev, dataToUse]);
                } else {
                    setEntries((prev) => prev === null ? [...dataToUse] : [...prev, ...dataToUse]);
                }
            }
        })

        pubSub.subscribe(gadgetListID, (data: any) => {
            const  { persistentGadgets } = data.payload;
            persistentGadgets?.forEach((item) => {
                {
                    const {tags} = item;
                    if(tags.includes(gadgetID)) {
                        setGadgetPayload(item); 
                        setIsBackgroundRunning(true)
                    }
                }
            })
        })
    }, [])

    React.useEffect(() => {
        if(gadgetPayload) {
            pubSub.subscribe(gadgetPayload.id, (data) => {
                setLoading(false)
            setGadgetRunningStatus(true);

            if (name === 'block-io' && category === "profile") {
                const unit = data.payload.unit || ''
                const intervals = data.payload?.intervals;
                const labels = intervals.map((interval) => `${interval.start}-${interval.end} ${unit}`)
            setEntries(
                {
                    'labels': labels,
                    datasets: [{  
                      label: 'count',
                      data: intervals.map((interval) => interval.count),
                      borderColor: 'rgb(53, 162, 235)',
                      backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    }]
                }
            )
            } else if(name === "tcprtt" && category === "profile") {
                const intervals = data.payload?.histograms[0]?.intervals;
                const unit = data.payload?.histograms[0]?.unit || ''
                const labels = intervals.map((interval) => `${interval.start}-${interval.end} ${unit}`)
            setEntries(
                {
                    'labels': labels,
                    datasets: [{  
                      label: 'count',
                      data: intervals.map((interval) => interval.count),
                      borderColor: 'rgb(255, 99, 132)',
                      backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    }]
                }
            )
            } else {
                let dataToUse = data
                if (dataToUse.payload) {
                    dataToUse = data["payload"];
                }
                if (!Array.isArray(dataToUse)) {
                    setEntries((prev) => prev === null ? [dataToUse] : [...prev, dataToUse]);
                } else {
                    setEntries((prev) => prev === null ? [...dataToUse] : [...prev, ...dataToUse]);
                }
            }
            })
        }
    }, [gadgetPayload])
    
    useEffect(() => {
        const preparedFilters = prepareFilters(params,operatorParamsCollection, pods, namespaces);
        setFilters({...preparedFilters})
    }, [operatorParamsCollection, pods, namespaces])

    useEffect(() => {
        
    }, [isBackgroundRunning])

    function gadgetStartStopHandler() {
        if(!gadgetRunningStatus) {
            setLoading(true);
        }
        const socket = execRef.current.getSocket();
        if(!gadgetRunningStatus) {
            // stop the gadget 

            let massagedFilters = {};
            
            Object.keys(filters).forEach((key) => {
                massagedFilters[key] = filters[key].value;
            })
            socket.send(runGadgetWithActionAndPayload(socket, "start", {
                gadgetName: name,
                gadgetCategory: category,
                id: gadgetPayload ? gadgetPayload.id : gadgetID,
                params: {...massagedFilters},
                background: isBackgroundRunning
            }))
            setGadgetRunningStatus(true)
        } else {
            socket.send(runGadgetWithActionAndPayload(socket, "stop", {
                gadgetName: name,
                id: gadgetPayload ? gadgetPayload.id : gadgetID,
                gadgetCategory: category
            }))
            setGadgetRunningStatus(false)
        }
    }
    
    console.log("columns and entries are ",columns, entries)
    return (
        <SectionBox title={name} backLink={true} style={{
            margin: "1rem 0rem"
        }}>
        <Accordion square component={Paper} style={{
            margin: '1rem 0rem'
        }}>
            <AccordionSummary
            expandIcon={<Icon icon={"mdi:chevron-down"} />}
            aria-controls=""
            id="gadget-filters">
             <SectionHeader title="Filters" />
            </AccordionSummary>

            <AccordionDetails>
                {
                    <Grid container spacing="2">
                        <Select>
                        </Select>
                        {
                    Object.keys(filters)?.map((key) => {
                        const FilterComponent = filters[key].component;
                        return <Grid item md={12}>
                            <FilterComponent key={Math.random() + key} />
                            </Grid>
                    })}
                    </Grid>
                }
            </AccordionDetails>
        </Accordion>
        <Grid container justifyContent="space-between" spacing="2">
            <Grid item>
                Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}
                <Button onClick={gadgetStartStopHandler}>
                    { !gadgetRunningStatus ? 'Start' : 'Stop' }
                </Button>
            </Grid>
            {/* <Grid item>
                Run In the Background
                <Checkbox
                    checked={isBackgroundRunning}
                    onChange={handleChange}
                />
            </Grid> */}
                <Grid item>
                <Button  onClick={() => {
                    setLoading(true);
                    setApplyFilters((prevFilterVal) => !prevFilterVal);
                    setGadgetRunningStatus(true)
                }}>
                    Run With Filter
                </Button>
                </Grid>
        </Grid>
        { 
        !loading ? ((name === "block-io" && category === "profile") || (name === "tcprtt" && category === "profile") ? 
            <BarChart
            data={entries}
            title={name === "block-io" ? "Block I/O distribution" : name === "tcprtt" ? "tcp round trip time" :  ""}
            /> :
            <SimpleTable
                columns={columns}
                data={entries}  
            />) : <Loader/>
        }
            
        </SectionBox>
    )
}

export default function Gadget() {
    const location = useLocation()
    const {gadget, category} = useParams<{gadget: string, category: string}>();
    const gadgetObj = location.state;
    let columns = [];
    console.log("column definition is", gadgetObj.columnsDefinition)
    if(gadgetObj.columnsDefinition) {
        let gadgetColumnKeys = Object.keys(gadgetObj.columnsDefinition)
        for(let i=0;i < Object.keys(gadgetObj.columnsDefinition).length;i++) {
            const col = gadgetObj.columnsDefinition[gadgetColumnKeys[i]];
               if(col.name.includes(".")) {
                    continue;
               }
                columns.push({
                    label: col.name,
                    getter: e => {
                        console.log("e is",e)
                        if(_.isObject(e[col.name])) {
                            return JSON.stringify(e[col.name])
                        }
                        return e[col.name]
                    },
                    hide: !col.visible
                    
                })
                        
            
        }
    }

        return <GenericGadgetRenderer
        name={gadget}
        category={category}
        gadgetID={`ig-gadget-${gadget}-${category}`}
        isDataAccessTypeObject={true}
        gadget={gadgetObj}
        columns={columns}/>

}