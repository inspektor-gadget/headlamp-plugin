import {DetailsViewSectionProps, K8s, registerDetailsViewSection} from '@kinvolk/headlamp-plugin/lib';
import SectionBox from "@kinvolk/headlamp-plugin/lib/CommonComponents/SectionBox";
import React, { useState, useEffect } from 'react';
import SimpleTable from "@kinvolk/headlamp-plugin/lib/CommonComponents/SimpleTable";

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

function parseJsonFromText(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('error parsing JSON', e);
    }

    return null;
}

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
    if (!resource || resource.kind !== 'Pod') return null;

    const decoder = new TextDecoder('utf-8');
    const [entries, setEntries] = useState([]);
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const gadgetID = "socket-gadget-snapshot"
    const [igPod, setIGPod] = useState(null);
    const execRef = React.useRef(null);
    const [textStream, setTextStream] = useState("");
   
    function runGadgetWithActionAndPayload(socket, action, payload) {
        if(!action) {
            socket.send('\0'+JSON.stringify({ payload }) + "\n")
            return
        }
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
        execRef.current = igPod.exec('gadget', (items) => {
          const text = decoder.decode(items.slice(1));

          if (new Uint8Array(items)[0] !== 1) {
            return;
          }

          const textSplitBasedOnNewLine = text.split('\n')
            if(textSplitBasedOnNewLine.length > 1) {
                textSplitBasedOnNewLine.forEach((textPart, index) => {
                    if(index === 0) {
                        setTextStream(oldTextStream => {
                            // if the last parsed ended with \n start fresh
                            if(oldTextStream.endsWith('\n')) {
                                return textPart
                            }
                            return oldTextStream + textPart
                        })
                    } else {
                        setTextStream(textPart)
                    }
                })
            } else if(text.endsWith('\n')) {
              const updatedText = text.slice(0, -1)
              setTextStream(oldTextStream => {
                // if the last parsed ended with \n start fresh
                if(oldTextStream.endsWith('\n')) {
                    return updatedText
                }
                return oldTextStream + updatedText
            })
            } else {
              setTextStream(oldTextStream => oldTextStream + text)
            }
        }, {
            command: ["/usr/bin/socat", "/run/gadgetstreamingservice.socket", "-"],
            tty: false,
            stdin: true,
            stdout: true,
            stderr: false,
        })

        const socket = execRef.current.getSocket()

        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, 'start', { gadgetName: 'socket', gadgetCategory: "snapshot", id: gadgetID }))

        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, 'start', { gadgetName: 'socket', gadgetCategory: 'snapshot', id: gadgetID }))
            execRef.current.cancel()
        }
    }, [resource, igPod])

    useEffect(() => {
        const jsonParts = parseJsonFromText(textStream)
        if(jsonParts) {
                if(Array.isArray(jsonParts) && jsonParts.length > 0 && jsonParts[0].id === gadgetID) {
                    const payloadMap = jsonParts.map((part) => part.payload)
                    setEntries(entries => [...entries, ...payloadMap])    
                } else {
                    const payloads = jsonParts.payload
                    setEntries([...payloads])
                }
        }
    }, [textStream])

    return (
        <SectionBox title="Sockets">
            <SimpleTable
                columns={[
                    {
                        label: 'Local',
                        getter: e => `${e.localAddress}:${e.localPort}`,
                    },
                    {
                        label: 'Remote',
                        getter: e => `${e.remoteAddress}:${e.remotePort}`,
                    },
                    {
                        label: 'Protocol',
                        getter: e => e.protocol
                    },
                    {
                        label: 'Status',
                        getter: e => e.status
                    }
                ]}
                data={entries}
                reflectInURL="sockets"
            />
        </SectionBox>
    );
});

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
    if (!resource || resource.kind !== 'Pod') return null;
    
    const decoder = new TextDecoder('utf-8');
    const [entries, setEntries] = useState([]);
    const [pods, error] = K8s.ResourceClasses.Pod.useList();
    const gadgetID = "trace-gadget-open-sockets"
    const [igPod, setIGPod] = useState(null);
    const execRef = React.useRef(null);
    const [textStream, setTextStream] = useState("");

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
        execRef.current = igPod.exec('gadget', (items) => {
            const text = decoder.decode(items.slice(1));

            if (new Uint8Array(items)[0] !== 1) {
              return;
            }
            const textSplitBasedOnNewLine = text.split('\n')
            if(textSplitBasedOnNewLine.length > 1) {
                textSplitBasedOnNewLine.forEach((textPart, index) => {
                    if(index === 0) {
                        setTextStream(oldTextStream => {
                            // if the last parsed ended with \n start fresh
                            if(oldTextStream.endsWith('\n')) {
                                return textPart
                            }
                            return oldTextStream + textPart
                        })
                    } else {
                        setTextStream(textPart)
                    }
                })
            } else if(text.endsWith('\n')) {
              const updatedText = text.slice(0, -1)
              setTextStream(oldTextStream => {
                // if the last parsed ended with \n start fresh
                if(oldTextStream.endsWith('\n')) {
                    return updatedText
                }
                return oldTextStream + updatedText
            })
            } else {
              setTextStream(oldTextStream => oldTextStream + text)
            }
        }, {
            command: ["/usr/bin/socat", "/run/gadgetstreamingservice.socket", "-"],
            tty: false,
            stdin: true,
            stdout: true,
            stderr: false,
        })

        const socket = execRef.current.getSocket()

        socket.addEventListener('open', () => runGadgetWithActionAndPayload(socket, "start", { gadgetName: 'open', gadgetCategory: 'trace', id: gadgetID }))

        return () => {
            socket.removeEventListener('open', () => runGadgetWithActionAndPayload(socket, "stop", { gadgetName: 'open', gadgetCategory: 'trace', id: gadgetID }))
            execRef.current.cancel()
        }
    }, [resource, igPod])

    useEffect(() => {
        const jsonParts = parseJsonFromText(textStream)
        if(jsonParts) {
                if(Array.isArray(jsonParts) && jsonParts.length > 0 && jsonParts[0].id === gadgetID) {
                    const payloadMap = jsonParts.map((part) => part.payload)
                    setEntries(entries => [...entries, ...payloadMap])    
                } else {
                    const payloads = jsonParts.payload
                    if(Array.isArray(payloads) && payloads.length > 0) {
                        setEntries(entries => [...entries, ...payloads])
                    } else {
                        setEntries([...entries, payloads])
                    }
                }
        }
    }, [textStream])


    return (
        <SectionBox title="Open File Events">
            <SimpleTable
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
                data={pods === null ? null : entries}
                reflectInURL="files"
            />
        </SectionBox>
    );
});
