export interface Field {
  fullName: string;
  type: string;
  flags: number;
  tags: string[];
  annotations?: Record<string, string>;
}

export interface DataSource {
  name: string;
  id?: string;
  annotations?: Record<string, string>;
  fields: Field[];
}

export interface GadgetConfig {
  imageName: string;
  version: string;
  paramValues?: Record<string, any>;
  dataSources?: DataSource[];
}

export interface GadgetInstance {
  id: string;
  name: string;
  isHeadless: boolean;
  isEmbedded: boolean;
  kind: string;
  cluster: string;
  gadgetConfig: GadgetConfig;
}
