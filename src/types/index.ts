/**
 * Represents the display and metadata hints for a field.
 */
interface FieldAnnotations {
  'columns.alignment'?: 'left' | 'right' | 'center';
  'columns.ellipsis'?: 'start' | 'end' | 'middle';
  'columns.minwidth'?: string;
  'columns.width'?: string;
  'columns.maxwidth'?: string;
  'columns.hidden'?: string | boolean;
  'columns.fixed'?: string | boolean;
  description?: string;
  template?: string;
}

/**
 * Metadata for a single field within a datasource.
 */
export interface DataSourceField {
  name: string;
  fullName: string;
  kind: 'Uint32' | 'Uint64' | 'String' | 'Bool' | 'Int64';
  index?: number;
  payloadIndex?: number;
  flags?: number;
  order?: number;
  parent?: number;
  tags?: string[];
  annotations?: FieldAnnotations;
}

export interface DataSourceAnnotations {
  description?: string;
  [key: string]: any;
}

/**
 * The primary interface for a Datasource definition.
 */
export interface DataSource {
  name: string;
  type: number;
  fields: DataSourceField[];
  annotations?: DataSourceAnnotations;
}
