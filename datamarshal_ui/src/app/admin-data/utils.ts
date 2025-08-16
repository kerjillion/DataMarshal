import { ColumnMeta } from './types';

/**
 * Maps SQL types to HTML input types
 */
export function sqlTypeToInput(sqlType: string): 'text' | 'number' | 'date' {
  const type = sqlType.toLowerCase();
  
  if (isNumericType(type)) {
    return 'number';
  }
  
  if (isDateType(type)) {
    return 'date';
  }
  
  return 'text';
}

/**
 * Checks if SQL type is numeric
 */
export function isNumericType(sqlType: string): boolean {
  const type = sqlType.toLowerCase();
  return ['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'money', 'smallmoney'].includes(type);
}

/**
 * Checks if SQL type is date/time
 */
export function isDateType(sqlType: string): boolean {
  const type = sqlType.toLowerCase();
  return ['date', 'datetime', 'datetime2', 'smalldatetime', 'time', 'datetimeoffset'].includes(type);
}

/**
 * Checks if SQL type is binary
 */
export function isBinaryType(sqlType: string): boolean {
  const type = sqlType.toLowerCase();
  return ['binary', 'varbinary', 'image', 'timestamp', 'rowversion'].includes(type);
}

/**
 * Checks if column should use textarea instead of input
 */
export function isLongText(column: ColumnMeta): boolean {
  const type = column.SqlType.toLowerCase();
  return type.includes('text') || (type.includes('varchar') && column.MaxLength > 255);
}

/**
 * Gets editable columns from table metadata
 */
export function getEditableColumns(meta: { columns: ColumnMeta[] }): ColumnMeta[] {
  return meta.columns.filter(col => 
    !col.IsIdentity && 
    !col.IsComputed && 
    !col.IsRowVersion &&
    !isBinaryType(col.SqlType)
  );
}

/**
 * Gets displayable columns from table metadata
 */
export function getDisplayableColumns(meta: { columns: ColumnMeta[] }): ColumnMeta[] {
  return meta.columns.filter(col => !col.IsRowVersion);
}

/**
 * Computes changes between original and current values
 */
export function diffChanges(
  original: any, 
  current: any, 
  editableCols: Set<string>
): Record<string, any> {
  const changes: Record<string, any> = {};
  
  for (const col of editableCols) {
    const originalVal = original?.[col];
    const currentVal = current?.[col];
    
    // Handle null/undefined comparison
    if (originalVal !== currentVal) {
      changes[col] = currentVal;
    }
  }
  
  return changes;
}

/**
 * Safely splits schema.table string
 */
export function parseSchemaTable(schemaTable: string): { schema: string; table: string } {
  const parts = schemaTable.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid schema.table format: ${schemaTable}`);
  }
  return { schema: parts[0], table: parts[1] };
}

/**
 * Formats schema.table for display
 */
export function formatSchemaTable(schema: string, table: string): string {
  return `${schema}.${table}`;
}

/**
 * Gets primary key values from a row
 */
export function getPrimaryKeyValues(row: any, primaryKeys: string[]): Record<string, any> {
  const keyValues: Record<string, any> = {};
  for (const key of primaryKeys) {
    keyValues[key] = row[key];
  }
  return keyValues;
}

/**
 * Gets row version value if present
 */
export function getRowVersion(row: any, columns: ColumnMeta[]): ArrayBuffer | undefined {
  const rowVersionCol = columns.find(col => col.IsRowVersion);
  return rowVersionCol ? row[rowVersionCol.ColumnName] : undefined;
}

/**
 * Gets columns suitable for display in data grid
 */
export function getDisplayColumns(meta: { columns: ColumnMeta[] }): string[] {
  return getDisplayableColumns(meta).map(col => col.ColumnName);
}

/**
 * Formats cell value for display
 */
export function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 47) + '...';
  }
  
  return String(value);
}
