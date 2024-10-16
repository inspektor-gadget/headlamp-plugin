import {  TextField, Switch, Grid, Paper, Box, FormControlLabel, Button, MenuItem, Select, InputLabel, Accordion, AccordionDetails } from '@mui/material';
import { FILTERS_TYPE } from "./filter_types";
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import K8s  from '@kinvolk/headlamp-plugin/lib/K8s';
import { removeDuplicates } from './helper';
import React from 'react';

let FilterComponents = [];
export default function GadgetFilters(props: {config: any, setFilters: (func?: (val: any) => any) => void, isConnected: boolean, filters: any, onApplyFilters: () => void}) {
    const { config, setFilters, isConnected, filters } = props;
    if(!isConnected) {
        return null;
    }

    React.useMemo(() => {
        if(config && config.params) {
            const uniqueConfig = removeDuplicates(config.params);
            FilterComponents = uniqueConfig?.map((param, index) => {
                const filter = FILTERS_TYPE[param.typeHint];
                console.log(filter)
                if(param?.valueHint?.includes('pod')) {
                    return <PodsInputFilter setFilters={setFilters} key={param.key + index} param={param}/>
                }
    
                if(param?.valueHint?.includes('namespace')) {
                    return <NamespaceFilter setFilters={setFilters} key={param.key + index} param={param}/>
                }
    
                if(!filter) return null;
                
                 if(filter.type === 'checkbox') {
                    console.log(param.key)
                    console.log(param.defaultValue, Boolean(param.defaultValue))
    
                    return <Grid item md={3} key={param.key + index}> 
                    <FormControlLabel control={<Switch defaultChecked={param.defaultValue === 'true'} onChange={(e) => {
                        setFilters((prevVal) => {
                            return {
                                ...prevVal,
                                [param.prefix + param.key]: String(e.target.checked)
                            }
                        })
                    }}
                    />} label={param.title || param.key}/>
                    
                    </Grid>
                }
    
                if(filter.type === 'number') {
                    return <Grid item md={3} key={param.key + index}>
                    <TextField type={'number'} defaultValue={param.defaultValue} onChange={(e) => {
                        setFilters((prevVal) => {
                            return {
                                ...prevVal,
                                [param.prefix + param.key]: e.target.value
                            }
                        })
                    }}
                     min={filter.min}
                     max={filter.max}
                     label={param.title || param.key}
                     fullWidth
                     variant="outlined"
                    />
                    </Grid>
                }
    
                if(filter.type === 'string') {
                    return <Grid item md={3} key={param.key + index}>
                    <TextField defaultValue={param.defaultValue} onChange={(e) => {
                        setFilters((prevVal) => {
                            return {
                                ...prevVal,
                                [param.prefix + param.key]: e.target.value
                            }
                        })
                    }}
                     label={param.title || param.key}
                     fullWidth
                     variant="outlined"
                    />
                    </Grid>
                }
    
                return null
            })
        }
    }, [config, config?.params])
    
    return config && FilterComponents?.length > 0 && <SectionBox title={"Filters"}>
        <Accordion>
            <AccordionDetails>
         <Box p={2}>
        <Grid container spacing={2} alignItems="center">{FilterComponents}</Grid>
        <Box textAlign="right">
            <Button onClick={() => {
                 props.onApplyFilters();
            }}>
                Apply Filters
            </Button>
        </Box>
        </Box>
        </AccordionDetails>
        </Accordion>
        </SectionBox>;
}


function PodsInputFilter(props: {
    setFilters: (func?: (val: any) => any) => void,
    param: any,
    key: string
}) {
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const { param, setFilters, key } = props;
    if(error || !pods) {
        return null;
    }

    return <Grid item md={3} key={key}>
        <InputLabel id="pods-label">
            Pods
        </InputLabel>
        <Select
            labelId="pods-label"
            label="Pods"
            select
            fullWidth
            variant="outlined"
            onChange={(e) => {
                setFilters((prevVal) => {
                    return {
                        ...prevVal,
                        [param.prefix + param.key]: e.target.value
                    }
                })
            }}
        >
            {pods.map((pod) => {
                return <MenuItem key={pod.metadata.name} value={pod.metadata.name}>{pod.metadata.name}</MenuItem>
            })}
        </Select>
    </Grid>
}

function NamespaceFilter(props: {
    setFilters: (func?: (val: any) => any) => any,
    key: string,
    param: any
}) {
    const { param, setFilters, key } = props;
    const [namespaces, error] = K8s.ResourceClasses.Namespace.useList();
    if(error || !namespaces) {
        return null;
    }
    return <Grid item md={3}>
        <InputLabel id="namespace-label">
            Namespace
        </InputLabel>
        <Select
            labelId="namespace-label"
            label="Namespace"
            select
            fullWidth
            variant="outlined"
            onChange={(e) => {
                setFilters((prevVal) => {
                    return {
                        ...prevVal,
                        [param.prefix + param.key]: e.target.value
                    }
                })
            }}
        >
            {namespaces.map((namespace) => {
                return <MenuItem key={namespace.metadata.name} value={namespace.metadata.name}>{namespace.metadata.name}</MenuItem>
            })}
        </Select>
    </Grid>
}