import { IGConnection } from './igSocket';

export interface GadgetInstanceStatus {
  id: string;
  imageName: string;
  isConnected: boolean;
  isRunning: boolean;
  error?: Error;
  stop?: () => void;
}

class GadgetRegistry {
  private static instance: GadgetRegistry;
  private instances: Map<string, GadgetInstanceStatus> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() { }

  public static getInstance(): GadgetRegistry {
    if (!GadgetRegistry.instance) {
      GadgetRegistry.instance = new GadgetRegistry();
    }
    return GadgetRegistry.instance;
  }

  public register(id: string, imageName: string) {
    if (!this.instances.has(id)) {
      this.instances.set(id, {
        id,
        imageName,
        isConnected: false,
        isRunning: false,
      });
      this.notify();
    }
  }

  public updateStatus(id: string, status: Partial<GadgetInstanceStatus>) {
    const current = this.instances.get(id);
    if (current) {
      this.instances.set(id, { ...current, ...status });
      this.notify();
    }
  }

  public getStatus(id: string): GadgetInstanceStatus | undefined {
    return this.instances.get(id);
  }

  public getAllStatuses(): GadgetInstanceStatus[] {
    return Array.from(this.instances.values());
  }

  public unregister(id: string) {
    const current = this.instances.get(id);
    if (current?.stop) {
      current.stop();
    }
    this.instances.delete(id);
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  public async runGadget(
    ig: IGConnection,
    id: string,
    params: any,
    callbacks: any
  ): Promise<() => void> {
    const stopHandle = ig.runGadget(params, callbacks, err => {
      this.updateStatus(id, { error: err as Error, isRunning: false });
    });

    this.updateStatus(id, { isRunning: true, stop: (stopHandle as any)?.stop });

    return () => {
      if ((stopHandle as any)?.stop) {
        (stopHandle as any).stop();
      }
      this.updateStatus(id, { isRunning: false, stop: undefined });
    };
  }

  public async attachGadget(
    ig: IGConnection,
    id: string,
    params: any,
    callbacks: any
  ): Promise<() => void> {
    const stopHandle = ig.attachGadgetInstance(params, callbacks);

    this.updateStatus(id, { isRunning: true, stop: (stopHandle as any)?.stop });

    return () => {
      if ((stopHandle as any)?.stop) {
        (stopHandle as any).stop();
      }
      this.updateStatus(id, { isRunning: false, stop: undefined });
    };
  }
}

export const gadgetRegistry = GadgetRegistry.getInstance();
