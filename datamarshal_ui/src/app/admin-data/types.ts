export interface ColumnMeta {
  Ordinal: number;
  ColumnName: string;
  SqlType: string;
  MaxLength: number;
  IsNullable: boolean;
  IsIdentity: boolean;
  IsComputed: boolean;
  IsRowVersion: boolean;
  DefaultExpr: string | null;
}

export interface TableMeta {
  id: {
    schema: string;
    table: string;
  };
  columns: ColumnMeta[];
  primaryKey: string[];
}

export interface PageQuery {
  page: number;
  size: number;
  filter?: Record<string, any>;
  sort?: string;
  select?: string[];
}

export interface PageResult {
  rows: any[];
  total: number;
}

export interface ConflictError {
  kind: 'conflict';
  message?: string;
}

export interface EditDialogData {
  schemaTable: string;
  meta: TableMeta;
  row?: any;
}

export interface FilterCriteria {
  [columnName: string]: string | { op: 'like' | 'equals'; value: string };
}

export interface SortOption {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterOption {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'isNull' | 'isNotNull';
  value: any;
}

export interface DataGridFilter {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'isNull' | 'isNotNull';
  value: any;
}

// Alias for backwards compatibility
export type TableMetadata = TableMeta;
