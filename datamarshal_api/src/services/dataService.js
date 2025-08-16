const { getPool, sql, isTableAllowed } = require('../config/database');
const metadataService = require('./metadataService');

class DataService {

  /**
   * Get paginated data from a table with filtering and sorting
   */
  async getData(schema, table, options = {}) {
    try {
      // Security check
      if (!isTableAllowed(schema, table)) {
        throw new Error(`Table ${schema}.${table} is not allowed`);
      }

      const {
        page = 1,
        size = 50,
        sortBy = null,
        sortOrder = 'ASC',
        filters = {}
      } = options;

      const pool = getPool();
      const offset = (page - 1) * size;

      // Get table schema for column validation
      const tableSchema = await metadataService.getTableSchema(schema, table);
      const validColumns = tableSchema.columns.map(col => col.name);

      // Build WHERE clause for filters
      let whereClause = '';
      let filterParams = [];
      let paramIndex = 0;

      if (Object.keys(filters).length > 0) {
        const filterConditions = [];
        
        for (const [column, value] of Object.entries(filters)) {
          // Validate column exists
          if (!validColumns.includes(column)) {
            throw new Error(`Invalid filter column: ${column}`);
          }
          
          if (value !== null && value !== undefined && value !== '') {
            paramIndex++;
            filterConditions.push(`[${column}] LIKE @filter${paramIndex}`);
            filterParams.push({ name: `filter${paramIndex}`, value: `%${value}%` });
          }
        }
        
        if (filterConditions.length > 0) {
          whereClause = 'WHERE ' + filterConditions.join(' AND ');
        }
      }

      // Build ORDER BY clause
      let orderByClause = '';
      if (sortBy && validColumns.includes(sortBy)) {
        const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        orderByClause = `ORDER BY [${sortBy}] ${direction}`;
      } else if (tableSchema.primary_keys.length > 0) {
        orderByClause = `ORDER BY [${tableSchema.primary_keys[0]}]`;
      }

      // Build the main query
      const selectQuery = `
        SELECT *
        FROM [${schema}].[${table}]
        ${whereClause}
        ${orderByClause}
        OFFSET @offset ROWS
        FETCH NEXT @size ROWS ONLY
      `;

      // Build count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM [${schema}].[${table}]
        ${whereClause}
      `;

      // Execute queries
      const request = pool.request()
        .input('offset', sql.Int, offset)
        .input('size', sql.Int, size);

      // Add filter parameters
      filterParams.forEach(param => {
        request.input(param.name, sql.NVarChar, param.value);
      });

      const [dataResult, countResult] = await Promise.all([
        request.query(selectQuery),
        request.query(countQuery)
      ]);

      const total = countResult.recordset[0].total;
      const totalPages = Math.ceil(total / size);

      return {
        data: dataResult.recordset,
        pagination: {
          page,
          size,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        schema: tableSchema
      };
    } catch (error) {
      console.error(`Error getting data from ${schema}.${table}:`, error);
      throw error;
    }
  }

  /**
   * Insert a new record
   */
  async insertRecord(schema, table, data, user = 'system') {
    try {
      // Security check
      if (!isTableAllowed(schema, table)) {
        throw new Error(`Table ${schema}.${table} is not allowed`);
      }

      const pool = getPool();
      const tableSchema = await metadataService.getTableSchema(schema, table);
      
      // Filter out read-only columns
      const writableColumns = tableSchema.columns.filter(col => !col.is_readonly);
      const validData = {};
      
      writableColumns.forEach(col => {
        if (data.hasOwnProperty(col.name)) {
          validData[col.name] = data[col.name];
        }
      });

      if (Object.keys(validData).length === 0) {
        throw new Error('No valid data provided for insert');
      }

      // Build insert query
      const columns = Object.keys(validData);
      const values = columns.map((_, index) => `@param${index}`);
      
      const insertQuery = `
        INSERT INTO [${schema}].[${table}] ([${columns.join('], [')}])
        OUTPUT INSERTED.*
        VALUES (${values.join(', ')})
      `;

      const request = pool.request();
      
      // Add parameters
      columns.forEach((column, index) => {
        const columnSchema = tableSchema.columns.find(col => col.name === column);
        const sqlType = this.getSqlType(columnSchema);
        request.input(`param${index}`, sqlType, validData[column]);
      });

      const result = await request.query(insertQuery);
      
      // Log audit trail
      await this.logAuditTrail(schema, table, 'INSERT', null, result.recordset[0], user);
      
      return result.recordset[0];
    } catch (error) {
      console.error(`Error inserting record into ${schema}.${table}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing record with optimistic concurrency
   */
  async updateRecord(schema, table, primaryKeyValues, data, originalValues = null, user = 'system') {
    try {
      // Security check
      if (!isTableAllowed(schema, table)) {
        throw new Error(`Table ${schema}.${table} is not allowed`);
      }

      const pool = getPool();
      const tableSchema = await metadataService.getTableSchema(schema, table);
      
      // Validate primary key
      if (tableSchema.primary_keys.length === 0) {
        throw new Error('Table has no primary key - updates not supported');
      }

      // Filter out read-only columns
      const writableColumns = tableSchema.columns.filter(col => !col.is_readonly && !col.is_primary_key);
      const validData = {};
      
      writableColumns.forEach(col => {
        if (data.hasOwnProperty(col.name)) {
          validData[col.name] = data[col.name];
        }
      });

      if (Object.keys(validData).length === 0) {
        throw new Error('No valid data provided for update');
      }

      // Build WHERE clause for primary key
      const pkWhereClause = tableSchema.primary_keys.map((pk, index) => 
        `[${pk}] = @pk${index}`
      ).join(' AND ');

      // Add optimistic concurrency check
      let concurrencyCheck = '';
      if (tableSchema.has_rowversion && originalValues) {
        concurrencyCheck = ` AND [${tableSchema.rowversion_column}] = @original_rowversion`;
      }

      // Build update query
      const setClause = Object.keys(validData).map((column, index) => 
        `[${column}] = @param${index}`
      ).join(', ');
      
      const updateQuery = `
        UPDATE [${schema}].[${table}]
        SET ${setClause}
        OUTPUT DELETED.*, INSERTED.*
        WHERE ${pkWhereClause}${concurrencyCheck}
      `;

      const request = pool.request();
      
      // Add primary key parameters
      tableSchema.primary_keys.forEach((pk, index) => {
        request.input(`pk${index}`, sql.NVarChar, primaryKeyValues[pk]);
      });

      // Add update parameters
      Object.keys(validData).forEach((column, index) => {
        const columnSchema = tableSchema.columns.find(col => col.name === column);
        const sqlType = this.getSqlType(columnSchema);
        request.input(`param${index}`, sqlType, validData[column]);
      });

      // Add rowversion for concurrency check
      if (tableSchema.has_rowversion && originalValues) {
        request.input('original_rowversion', sql.Binary, originalValues[tableSchema.rowversion_column]);
      }

      const result = await request.query(updateQuery);
      
      if (result.recordset.length === 0) {
        throw new Error('Record not found or has been modified by another user');
      }

      const [deletedRecord, insertedRecord] = [result.recordset[0], result.recordset[1] || result.recordset[0]];
      
      // Log audit trail
      await this.logAuditTrail(schema, table, 'UPDATE', deletedRecord, insertedRecord, user);
      
      return insertedRecord;
    } catch (error) {
      console.error(`Error updating record in ${schema}.${table}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(schema, table, primaryKeyValues, user = 'system') {
    try {
      // Security check
      if (!isTableAllowed(schema, table)) {
        throw new Error(`Table ${schema}.${table} is not allowed`);
      }

      const pool = getPool();
      const tableSchema = await metadataService.getTableSchema(schema, table);
      
      // Validate primary key
      if (tableSchema.primary_keys.length === 0) {
        throw new Error('Table has no primary key - deletes not supported');
      }

      // Build WHERE clause for primary key
      const pkWhereClause = tableSchema.primary_keys.map((pk, index) => 
        `[${pk}] = @pk${index}`
      ).join(' AND ');

      const deleteQuery = `
        DELETE FROM [${schema}].[${table}]
        OUTPUT DELETED.*
        WHERE ${pkWhereClause}
      `;

      const request = pool.request();
      
      // Add primary key parameters
      tableSchema.primary_keys.forEach((pk, index) => {
        request.input(`pk${index}`, sql.NVarChar, primaryKeyValues[pk]);
      });

      const result = await request.query(deleteQuery);
      
      if (result.recordset.length === 0) {
        throw new Error('Record not found');
      }

      const deletedRecord = result.recordset[0];
      
      // Log audit trail
      await this.logAuditTrail(schema, table, 'DELETE', deletedRecord, null, user);
      
      return deletedRecord;
    } catch (error) {
      console.error(`Error deleting record from ${schema}.${table}:`, error);
      throw error;
    }
  }

  /**
   * Get SQL type based on column schema
   */
  getSqlType(columnSchema) {
    switch (columnSchema.data_type.toLowerCase()) {
      case 'int': return sql.Int;
      case 'bigint': return sql.BigInt;
      case 'smallint': return sql.SmallInt;
      case 'tinyint': return sql.TinyInt;
      case 'bit': return sql.Bit;
      case 'decimal':
      case 'numeric': return sql.Decimal(columnSchema.precision, columnSchema.scale);
      case 'money': return sql.Money;
      case 'smallmoney': return sql.SmallMoney;
      case 'float': return sql.Float;
      case 'real': return sql.Real;
      case 'date': return sql.Date;
      case 'datetime': return sql.DateTime;
      case 'datetime2': return sql.DateTime2;
      case 'smalldatetime': return sql.SmallDateTime;
      case 'time': return sql.Time;
      case 'datetimeoffset': return sql.DateTimeOffset;
      case 'char': return sql.Char(columnSchema.max_length);
      case 'varchar': return sql.VarChar(columnSchema.max_length);
      case 'text': return sql.Text;
      case 'nchar': return sql.NChar(columnSchema.max_length);
      case 'nvarchar': return sql.NVarChar(columnSchema.max_length);
      case 'ntext': return sql.NText;
      case 'binary': return sql.Binary;
      case 'varbinary': return sql.VarBinary;
      case 'image': return sql.Image;
      case 'uniqueidentifier': return sql.UniqueIdentifier;
      default: return sql.NVarChar;
    }
  }

  /**
   * Log audit trail
   */
  async logAuditTrail(schema, table, operation, oldValues, newValues, user) {
    try {
      // This is a placeholder - implement based on your audit requirements
      console.log('Audit Log:', {
        timestamp: new Date().toISOString(),
        user,
        operation,
        table: `${schema}.${table}`,
        oldValues,
        newValues
      });
      
      // TODO: Implement actual audit logging to database table
      // You might want to create an audit table and insert records there
    } catch (error) {
      console.error('Error logging audit trail:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}

module.exports = new DataService();
