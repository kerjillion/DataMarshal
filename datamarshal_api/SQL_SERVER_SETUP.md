# SQL Server 2016 Setup Guide for DataMarshal API

This guide helps you configure your SQL Server 2016 database to work with the DataMarshal API.

## 1. SQL Server Configuration

### Enable SQL Server Authentication (Mixed Mode)
1. Open **SQL Server Management Studio (SSMS)**
2. Right-click your SQL Server instance → **Properties**
3. Go to **Security** tab
4. Select **SQL Server and Windows Authentication mode**
5. Click **OK** and restart SQL Server service

### Enable TCP/IP Protocol
1. Open **SQL Server Configuration Manager**
2. Navigate to **SQL Server Network Configuration** → **Protocols for [YourInstance]**
3. Right-click **TCP/IP** → **Enable**
4. Double-click **TCP/IP** → **IP Addresses** tab
5. Scroll to **IPALL** section
6. Set **TCP Port** to **1433** (or note your custom port)
7. Restart **SQL Server** service

### Start SQL Server Browser (for Named Instances)
1. Open **Services** (services.msc)
2. Find **SQL Server Browser**
3. Set startup type to **Automatic**
4. Start the service

## 2. Database Setup

### Create Database and User
```sql
-- Create the database
CREATE DATABASE DataMarshal;
GO

-- Use the database
USE DataMarshal;
GO

-- Create a login for the API
CREATE LOGIN datamarshal_api WITH PASSWORD = 'YourSecurePassword123!';
GO

-- Create a user in the database
CREATE USER datamarshal_api FOR LOGIN datamarshal_api;
GO

-- Grant necessary permissions
ALTER ROLE db_datareader ADD MEMBER datamarshal_api;
ALTER ROLE db_datawriter ADD MEMBER datamarshal_api;
ALTER ROLE db_ddladmin ADD MEMBER datamarshal_api;  -- For schema discovery
GO
```

### Create Sample Tables for Testing
```sql
-- Create sample tables to test the API
CREATE TABLE [dbo].[categories] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX) NULL,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETUTCDATE(),
    [rowversion] ROWVERSION
);

CREATE TABLE [dbo].[products] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX) NULL,
    [price] DECIMAL(10,2) NULL,
    [category_id] INT NULL,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 DEFAULT GETUTCDATE(),
    [rowversion] ROWVERSION,
    
    CONSTRAINT FK_products_category 
        FOREIGN KEY ([category_id]) 
        REFERENCES [dbo].[categories]([id])
);

CREATE TABLE [dbo].[users] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [username] NVARCHAR(255) NOT NULL UNIQUE,
    [email] NVARCHAR(255) NOT NULL,
    [first_name] NVARCHAR(255) NULL,
    [last_name] NVARCHAR(255) NULL,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 DEFAULT GETUTCDATE(),
    [rowversion] ROWVERSION
);

-- Insert sample data
INSERT INTO [dbo].[categories] ([name], [description]) VALUES
('Electronics', 'Electronic devices and components'),
('Books', 'Books and educational materials'),
('Clothing', 'Apparel and accessories');

INSERT INTO [dbo].[products] ([name], [description], [price], [category_id]) VALUES
('Laptop', 'High-performance laptop computer', 999.99, 1),
('Programming Book', 'Learn advanced programming concepts', 49.99, 2),
('T-Shirt', 'Comfortable cotton t-shirt', 19.99, 3);

INSERT INTO [dbo].[users] ([username], [email], [first_name], [last_name]) VALUES
('admin', 'admin@datamarshal.com', 'System', 'Administrator'),
('jdoe', 'john.doe@example.com', 'John', 'Doe'),
('jsmith', 'jane.smith@example.com', 'Jane', 'Smith');
```

### Create Audit Table (Optional)
```sql
-- Create audit schema
CREATE SCHEMA [audit];
GO

-- Create audit table for tracking changes
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

-- Create indexes for performance
CREATE INDEX IX_audit_data_changes_timestamp ON [audit].[data_changes] ([timestamp]);
CREATE INDEX IX_audit_data_changes_table ON [audit].[data_changes] ([table_schema], [table_name]);
CREATE INDEX IX_audit_data_changes_user ON [audit].[data_changes] ([user_name]);
```

## 3. Update Your .env File

Choose one of these configurations:

### Option A: SQL Server Authentication (Recommended for Development)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# SQL Server 2016 Database Configuration
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=YourSecurePassword123!
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

### Option B: Windows Authentication
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# SQL Server 2016 Database Configuration
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=DataMarshal
DB_TRUSTED_CONNECTION=true
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

### Option C: Remote SQL Server
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Remote SQL Server Configuration
DB_SERVER=your-server-name
DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=YourSecurePassword123!
DB_ENCRYPT=true
DB_TRUST_CERT=false
```

## 4. Update Allowed Tables Configuration

Edit `src/config/database.js` and update the `ALLOWED_TABLES` array:

```javascript
const ALLOWED_TABLES = [
  // Sample tables for testing
  { schema: 'dbo', table: 'categories' },
  { schema: 'dbo', table: 'products' },
  { schema: 'dbo', table: 'users' },
  
  // Add your own tables here
  // { schema: 'hr', table: 'employees' },
  // { schema: 'sales', table: 'orders' },
];
```

## 5. Test the Connection

1. Save your `.env` file with the correct settings
2. Restart your API server: `npm run dev`
3. Check the console for connection messages
4. Visit `http://localhost:3001/api/health` to verify database connectivity
5. Visit `http://localhost:3001/meta/tables` to see your allowed tables

## 6. Common Connection Issues

### Error: "Failed to connect to localhost:1433"
- SQL Server service is not running
- TCP/IP protocol is disabled
- Firewall blocking port 1433
- Incorrect server name

### Error: "Login failed for user"
- Incorrect username/password
- SQL Server Authentication not enabled
- User doesn't have database permissions

### Error: "Named Pipes Provider: Could not open a connection"
- SQL Server Browser service not running (for named instances)
- Instance name incorrect in connection string

## 7. Security Recommendations

- Use strong passwords for SQL Server authentication
- Limit database permissions to only what's needed
- Consider using Windows Authentication in production
- Enable SSL/TLS encryption for remote connections
- Regularly audit the allowed tables list
- Monitor the audit trail for suspicious activity

## 8. Performance Tips

- Create indexes on frequently queried columns
- Use rowversion columns for optimistic concurrency
- Limit the number of allowed tables
- Set appropriate connection pool sizes
- Monitor query performance and optimize as needed
