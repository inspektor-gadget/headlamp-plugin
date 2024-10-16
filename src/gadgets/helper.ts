export const IG_CONTAINER_KEY = 'k8s-app';
export const IG_CONTAINER_VALUE = 'gadget';
const decoder = new TextDecoder('utf-8');
  
export function isIGPod(podResource) {
  return podResource.metadata.labels[IG_CONTAINER_KEY] === IG_CONTAINER_VALUE;
}

export function removeDuplicates(array) {
  const uniqueObjects = array.reduce((acc, obj) => {
    const existingObj = acc.find(item => item.key === obj.key);
    if (!existingObj) {
      acc.push(obj);
    }
    return acc;
  }, []);
  
  return uniqueObjects;
}

export function gadgetConnectionMessageHandler(event) {
  const items = new Uint8Array(event.data);
      if (items.length === 3) {
        console.log('channel:', items[0])
        console.log('port:', items[1] + items[2] * 256)
        return;
    }
      const text = decoder.decode(items.slice(1));

      const parser = new JsonStreamParser();
      console.log("text is ", text)
      parser.feed(text);
}

interface EventListeners {
  [key: string]: ((data: any) => void)[];
}

export class PubSub {
  private listeners: EventListeners = {};

  subscribe(id: string, fn: (data: any) => void) {
    if (!this.listeners[id]) {
      this.listeners[id] = [];
    }
    this.listeners[id].push(fn);
  }

  publish(id: string, data: any) {
    if (this.listeners[id]) {
      for (let fn of this.listeners[id]) {
        fn(data);
      }
    }
  }
}

let buffer = '';
export const pubSub = new PubSub();
let processedStreams = new Map<number, number>();

export class JsonStreamParser {
  constructor() {
    // clear expired entries every minute
    setInterval(() => this.clearExpiredEntries(), 60 * 1000);
  }

  subscribe(id: string, fn: (data: any) => void) {
    pubSub.subscribe(id, fn);
  }

  feed(stream: string) {
    const streamHash = this.hashString(stream);

    if (processedStreams.has(streamHash)) {
      return;
    }


    processedStreams.set(streamHash, Date.now());
    buffer += stream;
    const lastNewLineIndex = buffer.lastIndexOf('}');
    if (lastNewLineIndex === -1) return;
    const jsonString = buffer.slice(0, lastNewLineIndex + 1);
      try {
        const data = JSON.parse(jsonString);
        pubSub.publish(data.id, data);
        // we have published the stream so it makes we delete the hash now
        for (let [key] of processedStreams.entries()) {
          processedStreams.delete(key);
        }
      } catch (e) {
        console.error('Invalid JSON:', e);
      }
    buffer = '';
  }

  private clearExpiredEntries() {
    const oneSecondAgo = Date.now() - 1000;
    const keysToDelete = [];

    for (let [key, timestamp] of processedStreams.entries()) {
      if (timestamp < oneSecondAgo) {
        keysToDelete.push(key);
      }
    }

    // Delete entries over multiple ticks
    keysToDelete.forEach((key, index) => {
      setTimeout(() => {
        processedStreams.delete(key);
      }, 0);
    });
  }

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
    }
    return hash;
  }
}


export function getProperty(obj, key) {
  const keys = key.split('.');
  return keys.reduce((acc, curr) => acc && acc[curr], obj);
}