import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TableMeta, PageQuery, PageResult, ConflictError, SortOption, FilterOption } from './types';
import { parseSchemaTable } from './utils';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  private readonly baseUrl = '/api/admin';

  constructor(private http: HttpClient) {}

  /**
   * Get list of allowed tables
   */
  tables(): Observable<string[]> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/meta/tables`)
      .pipe(
        map(response => response.data.map(table => `${table.schema_name}.${table.table_name}`)),
        catchError(this.handleError)
      );
  }

  /**
   * Get table metadata
   */
  meta(schemaTable: string): Observable<TableMeta> {
    const { schema, table } = parseSchemaTable(schemaTable);
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/meta/table/${schema}.${table}`)
      .pipe(
        map(response => this.mapTableMeta(response.data)),
        catchError(this.handleError)
      );
  }

  /**
   * Get paginated data
   */
  page(schemaTable: string, query: PageQuery): Observable<PageResult> {
    const { schema, table } = parseSchemaTable(schemaTable);
    const params: any = {
      page: query.page.toString(),
      size: query.size.toString()
    };

    if (query.sort) {
      const [column, direction] = query.sort.split(' ');
      params.sortBy = column;
      params.sortOrder = direction || 'ASC';
    }

    if (query.filter) {
      Object.keys(query.filter).forEach(key => {
        const value = query.filter![key];
        if (typeof value === 'string') {
          params[key] = value;
        } else if (value && typeof value === 'object' && 'value' in value) {
          params[key] = value.value;
        }
      });
    }

    return this.http.get<{ success: boolean; data: any[]; pagination: any }>(
      `${this.baseUrl}/data/${schema}.${table}`, { params }
    ).pipe(
      map(response => ({
        rows: response.data,
        total: response.pagination.total
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Insert new record
   */
  insert(schemaTable: string, values: any): Observable<{ ok: true }> {
    const { schema, table } = parseSchemaTable(schemaTable);
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/data/${schema}.${table}/insert`, values)
      .pipe(
        map(() => ({ ok: true as const })),
        catchError(this.handleError)
      );
  }

  /**
   * Update existing record
   */
  update(
    schemaTable: string, 
    key: any, 
    changes: any, 
    originalRowVersion?: ArrayBuffer
  ): Observable<{ ok: true }> {
    const { schema, table } = parseSchemaTable(schemaTable);
    const body: any = {
      primaryKey: key,
      data: changes
    };

    if (originalRowVersion) {
      body.originalValues = { rowversion: originalRowVersion };
    }

    return this.http.post<{ success: boolean }>(`${this.baseUrl}/data/${schema}.${table}/update`, body)
      .pipe(
        map(() => ({ ok: true as const })),
        catchError(this.handleError)
      );
  }

  /**
   * Delete record
   */
  remove(schemaTable: string, key: any, originalRowVersion?: ArrayBuffer): Observable<{ ok: true }> {
    const { schema, table } = parseSchemaTable(schemaTable);
    const body: any = {
      primaryKey: key
    };

    if (originalRowVersion) {
      body.originalRowVersion = originalRowVersion;
    }

    return this.http.post<{ success: boolean }>(`${this.baseUrl}/data/${schema}.${table}/delete`, body)
      .pipe(
        map(() => ({ ok: true as const })),
        catchError(this.handleError)
      );
  }

  /**
   * Get lookup data for foreign keys
   */
  lookup(schemaTable: string): Observable<Array<{ value: any; display: string }>> {
    const { schema, table } = parseSchemaTable(schemaTable);
    return this.http.get<{ success: boolean; data: Array<{ value: any; display: string }> }>(
      `${this.baseUrl}/lookup/${schema}.${table}`
    ).pipe(
      map(response => response.data),
      catchError(() => []) // Return empty array if lookup fails
    );
  }

  /**
   * Get all table metadata
   */
  getAllTableMetadata(): Observable<TableMeta[]> {
    return this.tables().pipe(
      map(tableNames => {
        return tableNames.map(tableName => {
          // We'll need to get metadata for each table
          // For now, return basic metadata - this would need optimization in production
          const { schema, table } = parseSchemaTable(tableName);
          return {
            id: { schema, table },
            columns: [],
            primaryKey: []
          } as TableMeta;
        });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get data with modern filtering and sorting
   */
  getData(
    schemaTable: string,
    offset: number,
    limit: number,
    sorts: SortOption[] = [],
    filters: FilterOption[] = []
  ): Observable<{ data: any[]; total: number }> {
    const query: PageQuery = {
      page: Math.floor(offset / limit),
      size: limit
    };

    // Convert sorts to legacy format
    if (sorts.length > 0) {
      const sort = sorts[0]; // Take first sort for now
      query.sort = `${sort.column} ${sort.direction.toUpperCase()}`;
    }

    // Convert filters to legacy format
    if (filters.length > 0) {
      query.filter = {};
      filters.forEach(filter => {
        if (filter.operator === 'equals') {
          query.filter![filter.column] = filter.value;
        } else if (filter.operator === 'contains') {
          query.filter![filter.column] = { op: 'like', value: `%${filter.value}%` };
        }
        // Add more operators as needed
      });
    }

    return this.page(schemaTable, query).pipe(
      map(result => ({
        data: result.rows,
        total: result.total
      }))
    );
  }

  /**
   * Delete record (alias for remove)
   */
  delete(schemaTable: string, key: any, originalRowVersion?: ArrayBuffer): Observable<{ ok: true }> {
    return this.remove(schemaTable, key, originalRowVersion);
  }

  private mapTableMeta(data: any): TableMeta {
    return {
      id: {
        schema: data.schema,
        table: data.table
      },
      columns: data.columns.map((col: any) => ({
        Ordinal: col.ordinal_position,
        ColumnName: col.name,
        SqlType: col.data_type,
        MaxLength: col.max_length || 0,
        IsNullable: col.is_nullable === 'YES' || col.is_nullable === true,
        IsIdentity: col.is_identity === 1 || col.is_identity === true,
        IsComputed: col.is_computed === 1 || col.is_computed === true,
        IsRowVersion: col.data_type === 'timestamp' || col.data_type === 'rowversion',
        DefaultExpr: col.default_value
      })),
      primaryKey: data.primary_keys || []
    };
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    if (error.status === 409) {
      const conflictError: ConflictError = {
        kind: 'conflict',
        message: error.error?.message || 'Concurrency conflict occurred'
      };
      return throwError(() => conflictError);
    }
    return throwError(() => error);
  };
}
