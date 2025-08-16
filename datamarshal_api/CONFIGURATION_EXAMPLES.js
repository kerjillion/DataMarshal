/**
 * DataMarshal API Configuration Example
 * 
 * This file shows how to configure your database tables and security settings.
 * Copy the relevant sections to your actual configuration files.
 */

// Example: Update src/config/database.js ALLOWED_TABLES array
const EXAMPLE_ALLOWED_TABLES = [
  // HR Tables
  { schema: 'hr', table: 'employees' },
  { schema: 'hr', table: 'departments' },
  { schema: 'hr', table: 'positions' },
  
  // Product Tables
  { schema: 'dbo', table: 'products' },
  { schema: 'dbo', table: 'categories' },
  { schema: 'dbo', table: 'suppliers' },
  
  // User Management
  { schema: 'auth', table: 'users' },
  { schema: 'auth', table: 'roles' },
  
  // Configuration Tables
  { schema: 'config', table: 'settings' },
  { schema: 'config', table: 'lookup_values' }
];

// Example .env file for local development
const EXAMPLE_ENV = `
# DataMarshal API Environment Variables

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=YourDatabaseName
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_ENCRYPT=false
DB_TRUST_CERT=true

# For Azure SQL Database
# DB_SERVER=your-server.database.windows.net
# DB_DATABASE=YourDatabaseName
# DB_USER=your_azure_username
# DB_PASSWORD=your_azure_password
# DB_ENCRYPT=true
# DB_TRUST_CERT=false
`;

// Example SQL to create an audit table (optional)
const EXAMPLE_AUDIT_TABLE_SQL = `
CREATE TABLE [audit].[data_changes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [timestamp] DATETIME2 DEFAULT GETUTCDATE(),
    [user_name] NVARCHAR(255) NOT NULL,
    [operation] NVARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    [table_schema] NVARCHAR(128) NOT NULL,
    [table_name] NVARCHAR(128) NOT NULL,
    [primary_key_values] NVARCHAR(MAX) NULL,
    [old_values] NVARCHAR(MAX) NULL,
    [new_values] NVARCHAR(MAX) NULL
);

CREATE INDEX IX_audit_data_changes_timestamp ON [audit].[data_changes] ([timestamp]);
CREATE INDEX IX_audit_data_changes_table ON [audit].[data_changes] ([table_schema], [table_name]);
CREATE INDEX IX_audit_data_changes_user ON [audit].[data_changes] ([user_name]);
`;

// Example table with rowversion for optimistic concurrency
const EXAMPLE_TABLE_WITH_ROWVERSION = `
CREATE TABLE [dbo].[example_table] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX) NULL,
    [category_id] INT NULL,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 DEFAULT GETUTCDATE(),
    [rowversion] ROWVERSION, -- This enables optimistic concurrency
    
    CONSTRAINT FK_example_table_category 
        FOREIGN KEY ([category_id]) 
        REFERENCES [dbo].[categories]([id])
);
`;

module.exports = {
  EXAMPLE_ALLOWED_TABLES,
  EXAMPLE_ENV,
  EXAMPLE_AUDIT_TABLE_SQL,
  EXAMPLE_TABLE_WITH_ROWVERSION
};
