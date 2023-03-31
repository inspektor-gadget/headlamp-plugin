import {DetailsViewSectionProps, registerAppBarAction, registerDetailsViewSection} from '@kinvolk/headlamp-plugin/lib';
import SectionBox from "@kinvolk/headlamp-plugin/lib/CommonComponents/SectionBox";
import React, { useState, useEffect } from 'react';
import SimpleTable from "@kinvolk/headlamp-plugin/lib/CommonComponents/SimpleTable";

// Below are some imports you may want to use.
//   See README.md for links to plugin development documentation.
// import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
// import { K8s } from '@kinvolk/headlamp-plugin/lib/K8s';
// import { Typography } from '@material-ui/core';

let websocket = null;
let gadgets = {};
const listeners = new Map();
let id = 0;

function publish(gadgetID, data) {
    if (listeners.has(gadgetID)) {
        listeners.get(gadgetID).forEach(callback => callback(data));
    }
}

function addListener(gadgetID, callback) {
    console.log('new listener for', gadgetID);
    if (!listeners.has(gadgetID)) {
        listeners.set(gadgetID, []);
    }
    listeners.get(gadgetID).push(callback);
}

function removeListener(gadgetID, callback) {
    console.log('remove listener for', gadgetID);
    if (listeners.has(gadgetID)) {
        const channelListeners = listeners.get(gadgetID);
        const index = channelListeners.indexOf(callback);
        if (index !== -1) {
            channelListeners.splice(index, 1);
        }
        if (channelListeners.length === 0) {
            let gadget = gadgets[gadgetID];
            if (gadget) {
                websocket.send(JSON.stringify({ action: 'stop', payload: { id: gadget.id } }));
                delete(gadgets[gadgetID]);
            }
            listeners.delete(gadgetID);
        }
    }
}

function createWebSocketURL() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = 4466 || window.location.port;
    const path = '/proxy/ws?proxyInfo=' + encodeURIComponent('ws://gadget.gadget-rfwlb.gadget.pod.minikube-docker/cmd/?cmd=%5B%22%2Fusr%2Fbin%2Fsocat%22%2C%22%2Frun%2Fgadgetwebservice.socket%22%2C%22-%22%5D');
    return `${protocol}//${hostname}${port ? `:${port}` : ''}${path}`;
}

function initWebSocket() {
    if (!websocket) {
        const url = createWebSocketURL();
        console.log('connecting to', url);
        websocket = new WebSocket(url);

        websocket.addEventListener('open', () => {
            console.log('WebSocket connection opened');
        });

        websocket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            console.log('event', data.id, data.payload);
            publish(data.id, data.payload);
        });

        websocket.addEventListener('close', () => {
            console.log('WebSocket connection closed');
            websocket = null; // Set to null to allow re-initialization if needed
        });

        websocket.addEventListener('error', error => {
            console.error('WebSocket error:', error);
        });
    }
}

function runGadget(gadget) {
    console.log('running gadget', gadget);

    gadget.id = ''+(++id);

    initWebSocket();

    if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ action: 'start', payload: gadget }));
    } else {
        websocket.addEventListener('open', () => {
            websocket.send(JSON.stringify({ action: 'start', payload: gadget }));
        }, { once: true }); // Automatically remove the event listener after it's called once
    }

    gadgets[gadget.id] = gadget;
    return gadget.id;
}

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
    if (!resource || resource.kind !== 'Pod') return null;

    const [entries, setEntries] = useState([]);

    useEffect(() => {
        const id = runGadget({ gadgetName: 'socket', gadgetCategory: 'snapshot' });

        const listenerCallback = (data) => {
            console.log('got data', data);
            setEntries(data);
        };

        addListener(id, listenerCallback);

        // Clean up the listener when the component is unmounted
        return () => {
            removeListener(id, listenerCallback);
        };
    }, [resource])


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

    const [entries, setEntries] = useState([]);

    useEffect(() => {
        const id = runGadget({ gadgetName: 'open', gadgetCategory: 'trace' });

        const listenerCallback = (data) => {
            console.log('trace open', data);
            setEntries((prev) => [data, ...prev.slice(0,99)]);
        };
        addListener(id, listenerCallback);

        // Clean up the listener when the component is unmounted
        return () => {
            removeListener(id, listenerCallback);
        };
    }, [resource])


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
                data={entries}
                reflectInURL="files"
            />
        </SectionBox>
    );
});
