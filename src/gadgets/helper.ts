export const IG_CONTAINER_KEY = 'k8s-app';
export const IG_CONTAINER_VALUE = 'gadget';

export function isIGPod(podResource) {
  return podResource.metadata.labels[IG_CONTAINER_KEY] === IG_CONTAINER_VALUE;
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
