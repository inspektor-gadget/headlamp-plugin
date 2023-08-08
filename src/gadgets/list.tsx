import React from "react";
import { JsonStreamParser, isIGPod, pubSub } from "./helper";
import { useState } from "react";
import { useEffect } from "react";
import { K8s } from "@kinvolk/headlamp-plugin/lib";
import { SectionBox, SimpleTable, Link } from "@kinvolk/headlamp-plugin/lib/CommonComponents";

export default function GadgetList() {
    const decoder = new TextDecoder('utf-8');
    const [gadgets, setGadgets] = useState(null);
    const [operators, setOperators] = useState(null);
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
    }, [igPod])

    React.useEffect(() => {
        pubSub.subscribe(gadgetID, (data: {payload: any}) => {
            setGadgets(data.payload.Gadgets)
            setOperators(data.payload.Operators)
            console.log("gadgets data ", data)
        })
    }, [])
    return <>
        <SectionBox title="Gadgets">
            <SimpleTable
                columns={[
                    {
                        label: "Name",
                        getter: (gadget) => gadget.category == "" ? <Link routeName="/gadgets/:gadget" params={{
                            gadget: gadget.name,
                        }} state={gadget}>{gadget.name}</Link> : 
                        <Link routeName="/gadgets/:gadget/:category" params={{
                            gadget: gadget.name,
                            category: gadget.category,
                        }}
                        state={gadget}>{gadget.name}</Link>,
                    },
                    {
                        label: 'Type',
                        getter: (gadget) => gadget.type,
                    },
                    {
                        label: 'Category',
                        getter: (gadget) => gadget.category,
                    },
                    {
                        label: "Description",
                        getter: (gadget) => gadget.description,
                    },
                ]}
                data={gadgets}
            />
        </SectionBox>
    </>
}