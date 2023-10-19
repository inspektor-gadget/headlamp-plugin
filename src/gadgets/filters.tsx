import React from "react";
import { TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch } from '@material-ui/core';
import { Utils } from "@kinvolk/headlamp-plugin/lib";

export function prepareFilters(params, operatorParamsCollection, pods, namespaces) {
    const filters = {}
    const allowedNamespaces = (JSON.parse(localStorage.getItem(`clusters_settings.${Utils.getCluster()}`)) || {}).allowedNamespaces;
    if (params) {
        for (const item of params) {
            if(item.type === "bool") {
                filters[`${item.key}`] = {
                    value: item.defaultValue,
                    component: (props: {}) => {
                        const [value, setValue] = React.useState(JSON.parse(filters[`${item.key}`].value));
                        return <FormControlLabel
                        control={
                        <Switch checked={value} 
                        color="primary"
                                defaultValue={item.defaultValue}
                                onChange={(event) => {
                                    console.log("onChange",event.target)
                                    setValue(event.target.checked)
                                    filters[`${item.key}`].value = String(event.target.checked);
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
                        const [value, setValue] = React.useState(filters[`${item.key}`].value)
                        return (
                            <FormControl variant="filled" fullWidth label={item.title}>
                    <InputLabel htmlFor={`${item.title}`}>
                        {item.title}
                    </InputLabel>
                    <Select value={value} 
                    onChange={(event) => {
                        setValue(event.target.value);
                                filters[`${item.key}`].value = event.target.value;
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
                operatorParamsCollection[key]?.forEach((param) => {
                    if(namespaces && param.valueHint.split(":")[1] === "namespace") {
                        console.log("inside namespace component")
                        filters[`operator.${key}.${param.key}`] = {
                            value: "",
                            component: () => {
                                const filterVal = filters[`operator.${key}.${param.key}`].value 
                                const [value, setValue] = React.useState(filterVal);
                                return <FormControl fullWidth variant="filled">
                                    <InputLabel htmlFor="namespace-select">
                                        Namespace
                                    </InputLabel>
                                <Select 
                                defaultValue="All"
                                value={value} onChange={(event) => {
                                    setValue(event.target.value);
                                    if(event.target.value === "All") {
                                        filters[`operator.${key}.${param.key}`].value = "";
                                        
                                    } else {
                                        filters[`operator.${key}.${param.key}`].value = event.target.value;
                                    
                                    }
                                }}
                                inputProps={
                                    {
                                        id: "namespace-select"
                                    }
                                }
                                >
                                <MenuItem value="">
                                    All
                                </MenuItem>
                                {(allowedNamespaces || namespaces).map((namespace) => {
                                    if(allowedNamespaces) {
                                        return <MenuItem value={namespace}>
                                            { namespace }
                                        </MenuItem>
                                    }
                                    return (
                                        <MenuItem value={namespace.metadata.name}>
                                            {namespace.metadata.name}
                                        </MenuItem>
                                    )
                                })
        
                                }</Select>
                                </FormControl>
                            }
                        }
                        return
                    } else if(pods && param.valueHint.split(":")[1] === "pod") {
                        filters[`operator.${key}.${param.key}`] = {
                            value: "",
                            component: () => {
                                const filterVal = filters[`operator.${key}.${param.key}`].value;
                                const [value, setValue] = React.useState(filterVal);
                        return <FormControl fullWidth variant="filled">
                            <InputLabel htmlFor="podname-select">
                                Podname
                            </InputLabel>
                        <Select 
                        defaultValue="All"
                        value={value} onChange={(event) => {
                            setValue(event.target.value);
                            if(event.target.value === "All") {
                                filters[`operator.${key}.${param.key}`].value = "";
                                
                            } else {
                                filters[`operator.${key}.${param.key}`].value = event.target.value;
                            
                            }

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
                            filters[`operator.${key}.${param.key}`] = {
                                value: param.defaultValue,
                                component: (props: {}) => {
                                const [value, setValue] = React.useState(filters[`operator.${key}.${param.key}`].value || "");
                                return <TextField variant="outlined" label={param.key} fullWidth
                                value={value}
                                onChange={(event) => {
                                    setValue(event.target.value);
                                    filters[`operator.${key}.${param.key}`].value = event.target.value;
                                    
                                }}/>
                                }
                            }
                            break;
                        case "bool": 
                            filters[`operator.${key}.${param.key}`] = {
                                value: param.defaultValue,
                                component: (props: {}) => {
                                    const [value, setValue] = React.useState(JSON.parse(filters[`operator.${key}.${param.key}`].value));
                                    return <FormControlLabel
                                    control={
                                    <Switch checked={value} 
                                            color="primary"
                                            defaultValue={param.defaultValue}
                                            onChange={(event) => {
                                   
                                                setValue(event.target.checked)
                                                filters[`operator.${key}.${param.key}`].value = String(event.target.checked);
                                            
                                    }} />}
                                    label={param.key}
                                  />
                            
                                }
                            }
                    }
                
        })
    }

    return filters;
    
}
