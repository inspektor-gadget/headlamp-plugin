import React, { useState, useEffect } from 'react';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { JsonStreamParser, isIGPod, pubSub } from './helper';
import { Grid, Typography, Button, Box, IconButton } from '@material-ui/core';
import { Icon } from '@iconify/react';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';

export enum GadgetStatus {
    Gadget_NOT_STARTED = -1,
    Gadget_STOPPED,
    Gadget_STARTED,
}

export function PersistentGadget(props: {
    gadgetID: string,
    gadgetName: string,
    gadgetCategory: string,
    title: string,
    GadgetResultComponent: (...props) => JSX.Element,
    startMessage: string,

}) {
    const [igPod, setIGPod] = useState(null);
    const { gadgetID, gadgetName, gadgetCategory, GadgetResultComponent, title, startMessage } = props;
    const execRef = React.useRef(null);
    const gadgetListID = "gadget-list";
    const decoder = new TextDecoder('utf-8');
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const [gadgetPayload, setGadgetPayload] = React.useState(null);
    const [entries, setEntries] = React.useState(null);
    const [gadgetStatus, setGadgetStatus] = React.useState(GadgetStatus.Gadget_NOT_STARTED);
    function runGadgetWithActionAndPayload(socket, action, payload, extraParams={}) {
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

        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "list"
    , {}, {
        id: gadgetListID
    }))
        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "stop", { gadgetName: "block-io", gadgetCategory: "profile", id: gadgetID }))
            execRef.current.cancel()
        }
    }, [igPod])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: any) => {
            
            const  { persistentGadget } = data.payload;
            setGadgetPayload(persistentGadget);
            setGadgetStatus(GadgetStatus.Gadget_STARTED)
            
        })

        pubSub.subscribe(gadgetListID, (data: any) => {
            const  { persistentGadgets } = data.payload;
            persistentGadgets?.forEach((item) => {
                {
                    const {tags} = item;
                    if(tags.includes(gadgetID)) {
                        setGadgetPayload(item);
                        setGadgetStatus(GadgetStatus.Gadget_STARTED)
                    }
                }
            })
        })
        
        
    }, [])


    
    React.useEffect(() => {
            pubSub.subscribe((gadgetPayload && gadgetPayload.id) || gadgetID, (data: any) => {
                setGadgetPayload(null)
                setGadgetStatus(GadgetStatus.Gadget_STOPPED);
                let dataToUse = data
                console.log("entries data",dataToUse)
            if (dataToUse.payload) {
                dataToUse = data["payload"];
            }
            if (!Array.isArray(dataToUse)) {
                setEntries((prev) => prev === null ? [dataToUse] : [...prev, dataToUse]);
            } else {
                setEntries((prev) => prev === null ? [...dataToUse] : [...prev, ...dataToUse]);
            }
            })
    }, [gadgetPayload])

    function startGadgetHandler() {
        const socket = execRef.current.getSocket()
        socket.send(runGadgetWithActionAndPayload(socket, "start", {
            gadgetName,
            gadgetCategory,
            id: gadgetID,
            // background: true
        }))

    }

    function GadgetNotRunningComponent() {
        return (
        <Box py={2}>
      <Grid container direction="column" justify="center" alignItems="center" spacing={2}>
        <Grid item>
          <Typography variant="h6">
            {startMessage}
          </Typography>
        </Grid>
        <Grid item>
          <IconButton onClick={startGadgetHandler}>
            <Icon icon={"mdi:play"} width="80" height="80" />
          </IconButton>
        </Grid>
      </Grid>
    </Box>)
    }

    function GadgetRunningComponent(props: { gadgetPayload: null | any}) {
        const { gadgetPayload } = props;
        const [timePassed, setTimePassed] = React.useState("");
        const [countDownHandlerID, setCountDownHandlerID] = React.useState();
        React.useEffect(() => {
            const countDownDate = new Date().getTime();
            const countDownHandler = setInterval(function () {
              const now = new Date().getTime();
              let difference: number;
              const timeCreated = gadgetPayload?.timeCreated;
              
              if (timeCreated) {
                difference = now - parseInt(timeCreated) * 1000;
              } else {
                // Get today's date and time
                difference = now - countDownDate;
              }
              // Time calculations for days, hours, minutes and seconds
              const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((difference % (1000 * 60)) / 1000);
              setTimePassed(`${hours}h${minutes}m${seconds}s`);
            }, 1000);
            setCountDownHandlerID(countDownHandler);
            //prevent memory leak
            return () => {
              clearInterval(countDownHandlerID);
            };
          }, []);
        return (
            <Box py={2}>
            <Grid container direction="column" justify="center" alignItems="center" spacing={2}>
              <Grid item>
                <Typography variant="h6">{`Gathering data for ${timePassed}`}</Typography>
                <Loader title="latency check loader" color={'inherit'} />
              </Grid>
              <Grid item>
                <Typography variant="h6">Press stop to see the results.</Typography>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={stopGadgetHandler}>
                  <Icon icon={"mdi:stop"} width="40" height="40" />
                  <Typography variant="h6">Stop</Typography>
                </Button>
              </Grid>
            </Grid>
          </Box>
        )
    }

    function stopGadgetHandler() {
        const socket = execRef.current.getSocket()
        
        socket.send(runGadgetWithActionAndPayload(socket, "stop", {
            gadgetName,
            gadgetCategory,
            id: gadgetPayload ? gadgetPayload.id : gadgetID,
            // background: true
        }))
        
        socket.send(runGadgetWithActionAndPayload(socket, "delete", {
                gadgetName,
                gadgetCategory,
                id: gadgetPayload ? gadgetPayload.id : gadgetID,
                // background: true
        }))
    }

    console.log("entries",entries)
    if(gadgetStatus === GadgetStatus.Gadget_NOT_STARTED) {
        return <SectionBox title={title} backLink={true}><GadgetNotRunningComponent/></SectionBox> 
    } else if(gadgetStatus === GadgetStatus.Gadget_STARTED) {
        return <SectionBox title={title} backLink={true}>
          <GadgetRunningComponent gadgetPayload={gadgetPayload}/>
        { entries && <GadgetResultComponent entries={entries}/>}
        </SectionBox>
    } else if(gadgetStatus === GadgetStatus.Gadget_STOPPED) {
        return entries && <GadgetResultComponent restartFunc={startGadgetHandler} entries={entries}/>
}
    return null
}
