const { getPool, sql, isTableAllowed, isColumnReadOnly } = require('../config/database');

class MetadataService {
  
  /**
   * Get list of allowed tables with basic info
   */
  async getAllowedTables() {
    try {
      const pool = getPool();
      
      // Get table information for allowed tables only
      const result = await pool.request().query(`
        SELECT 
          t.TABLE_SCHEMA as schema_name,
          t.TABLE_NAME as table_name,
          t.TABLE_TYPE as table_type,
          ISNULL(ep.value, '') as table_description
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
        LEFT JOIN sys.extended_properties ep ON ep.major_id = st.object_id 
          AND ep.minor_id = 0 
          AND ep.name = 'MS_Description'
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
      `);

      // Filter to only allowed tables
      const allowedTables = result.recordset.filter(table => 
        isTableAllowed(table.schema_name, table.table_name)
      );

      return allowedTables;
    } catch (error) {
      console.error('Error getting allowed tables:', error);
      throw new Error('Failed to retrieve table metadata');
    }
  }

  /**
   * Get detailed schema information for a specific table
   */
  async getTableSchema(schema, table) {
    try {
      // Security check
      if (!isTableAllowed(schema, table)) {
        throw new Error(`Table ${schema}.${table} is not allowed`);
      }

      const pool = getPool();
      
      // Get column information
      const columnResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, table)
        .query(`
          SELECT 
            c.COLUMN_NAME as name,
            c.DATA_TYPE as data_type,
            c.IS_NULLABLE as is_nullable,
            c.COLUMN_DEFAULT as default_value,
            c.CHARACTER_MAXIMUM_LENGTH as max_length,
            c.NUMERIC_PRECISION as precision,
            c.NUMERIC_SCALE as scale,
            c.ORDINAL_POSITION as ordinal_position,
            CASE WHEN ic.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_identity,
            CASE WHEN cc.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_computed,
            ISNULL(ep.value, '') as description
          FROM INFORMATION_SCHEMA.COLUMNS c
          LEFT JOIN INFORMATION_SCHEMA.IDENTITY_COLUMNS ic 
            ON ic.TABLE_SCHEMA = c.TABLE_SCHEMA 
            AND ic.TABLE_NAME = c.TABLE_NAME 
            AND ic.COLUMN_NAME = c.COLUMN_NAME
          LEFT JOIN INFORMATION_SCHEMA.COMPUTED_COLUMNS cc 
            ON cc.TABLE_SCHEMA = c.TABLE_SCHEMA 
            AND cc.TABLE_NAME = c.TABLE_NAME 
            AND cc.COLUMN_NAME = c.COLUMN_NAME
          LEFT JOIN sys.columns sc ON sc.object_id = OBJECT_ID(@schema + '.' + @table) 
            AND sc.name = c.COLUMN_NAME
          LEFT JOIN sys.extended_properties ep ON ep.major_id = sc.object_id 
            AND ep.minor_id = sc.column_id 
            AND ep.name = 'MS_Description'
          WHERE c.TABLE_SCHEMA = @schema 
            AND c.TABLE_NAME = @table
          ORDER BY c.ORDINAL_POSITION
        `);

      // Get primary key information
      const pkResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, table)
        .query(`
          SELECT 
            kcu.COLUMN_NAME as column_name
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
            ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
          WHERE tc.TABLE_SCHEMA = @schema 
            AND tc.TABLE_NAME = @table
            AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          ORDER BY kcu.ORDINAL_POSITION
        `);

      // Get foreign key information
      const fkResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, table)
        .query(`
          SELECT 
            kcu1.COLUMN_NAME as column_name,
            kcu2.TABLE_SCHEMA as referenced_schema,
            kcu2.TABLE_NAME as referenced_table,
            kcu2.COLUMN_NAME as referenced_column
          FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu1 
            ON kcu1.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu2 
            ON kcu2.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
          WHERE kcu1.TABLE_SCHEMA = @schema 
            AND kcu1.TABLE_NAME = @table
        `);

      // Check for rowversion column for optimistic concurrency
      const rowversionColumn = columnResult.recordset.find(col => 
        col.data_type === 'timestamp' || col.data_type === 'rowversion'
      );

      // Process columns and mark read-only status
      const columns = columnResult.recordset.map(column => ({
        ...column,
        is_readonly: isColumnReadOnly(column),
        is_primary_key: pkResult.recordset.some(pk => pk.column_name === column.name)
      }));

      // Group foreign keys by column
      const foreignKeys = {};
      fkResult.recordset.forEach(fk => {
        foreignKeys[fk.column_name] = {
          referenced_schema: fk.referenced_schema,
          referenced_table: fk.referenced_table,
          referenced_column: fk.referenced_column
        };
      });

      return {
        schema,
        table,
        columns,
        primary_keys: pkResult.recordset.map(pk => pk.column_name),
        foreign_keys: foreignKeys,
        has_rowversion: !!rowversionColumn,
        rowversion_column: rowversionColumn?.name || null
      };
    } catch (error) {
      console.error(`Error getting schema for ${schema}.${table}:`, error);
      throw error;
    }
  }

  /**
   * Get lookup data for foreign key dropdowns
   */
  async getLookupData(schema, table, valueColumn = null, displayColumn = null, limit = 100) {
    try {
      // Security check
      if (!isTableAllowed(schema, table)) {
        throw new Error(`Table ${schema}.${table} is not allowed for lookups`);
      }

      const pool = getPool();
      
      // If no columns specified, try to guess reasonable defaults
      if (!valueColumn || !displayColumn) {
        const tableSchema = await this.getTableSchema(schema, table);
        const primaryKey = tableSchema.primary_keys[0];
        
        valueColumn = valueColumn || primaryKey;
        displayColumn = displayColumn || tableSchema.columns.find(col => 
          col.name.toLowerCase().includes('name') || 
          col.name.toLowerCase().includes('title') ||
          col.name.toLowerCase().includes('description')
        )?.name || primaryKey;
      }

      const result = await pool.request()
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit)
            [${valueColumn}] as value,
            [${displayColumn}] as display
          FROM [${schema}].[${table}]
          ORDER BY [${displayColumn}]
        `);

      return result.recordset;
    } catch (error) {
      console.error(`Error getting lookup data for ${schema}.${table}:`, error);
      throw error;
    }
  }
}

module.exports = new MetadataService();
