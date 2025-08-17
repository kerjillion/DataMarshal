# Complete SQL Server Connection Guide for DataMarshal

This comprehensive guide will help you connect your DataMarshal application to a SQL Server database. Follow these steps in order for a successful setup.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [SQL Server Configuration](#sql-server-configuration)
3. [Database Setup](#database-setup)
4. [API Configuration](#api-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Testing the Connection](#testing-the-connection)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## Prerequisites

### Required Software
- **SQL Server 2016** or later (Express, Standard, or Enterprise)
- **SQL Server Management Studio (SSMS)** 
- **Node.js** 18+ with npm
- **SQL Server Configuration Manager**

### Network Requirements
- SQL Server must be accessible from your Node.js application
- Default port 1433 (or your custom port) must be open
- SQL Server Browser service (for named instances)

## SQL Server Configuration

### 1. Enable Mixed Mode Authentication

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server instance
3. Right-click the server name in Object Explorer
4. Select **Properties**
5. Navigate to **Security** page
6. Select **SQL Server and Windows Authentication mode**
7. Click **OK**
8. **Restart SQL Server service** for changes to take effect

### 2. Enable TCP/IP Protocol

1. Open **SQL Server Configuration Manager**
   - Search for "SQL Server Configuration Manager" in Windows Start menu
2. Expand **SQL Server Network Configuration**
3. Click **Protocols for [YourInstanceName]**
4. Right-click **TCP/IP** and select **Enable**
5. Double-click **TCP/IP** to open properties
6. Go to **IP Addresses** tab
7. Scroll to **IPALL** section at the bottom
8. Set **TCP Port** to **1433** (or your preferred port)
9. Click **OK**
10. **Restart SQL Server service**

### 3. Configure SQL Server Browser (For Named Instances)

If using a named instance (e.g., `localhost\SQLEXPRESS`):

1. Open **Services** (Run → `services.msc`)
2. Find **SQL Server Browser**
3. Right-click → **Properties**
4. Set **Startup type** to **Automatic**
5. Click **Start** to start the service
6. Click **OK**

### 4. Configure Windows Firewall

1. Open **Windows Firewall with Advanced Security**
2. Click **Inbound Rules**
3. Click **New Rule...**
4. Select **Port** → **Next**
5. Select **TCP** and **Specific local ports**: `1433`
6. Select **Allow the connection** → **Next**
7. Apply to all profiles → **Next**
8. Name: "SQL Server Port 1433" → **Finish**

For SQL Server Browser (named instances):
- Repeat above steps for **UDP port 1434**

## Database Setup

### 1. Create Database and Login

Connect to SQL Server using SSMS and run these scripts:

```sql
-- Create the database
CREATE DATABASE DataMarshal
COLLATE SQL_Latin1_General_CP1_CI_AS;
GO

-- Use the new database
USE DataMarshal;
GO

-- Create a login for the API (SQL Server Authentication)
CREATE LOGIN datamarshal_api 
WITH PASSWORD = 'DataMarshal2025!SecurePass',
     CHECK_POLICY = ON,
     CHECK_EXPIRATION = OFF;
GO

-- Create a user in the database
CREATE USER datamarshal_api FOR LOGIN datamarshal_api;
GO

-- Grant necessary permissions for data editing
ALTER ROLE db_datareader ADD MEMBER datamarshal_api;
ALTER ROLE db_datawriter ADD MEMBER datamarshal_api;
ALTER ROLE db_ddladmin ADD MEMBER datamarshal_api;  -- For metadata queries
GO

-- Grant VIEW DEFINITION for schema information
GRANT VIEW DEFINITION TO datamarshal_api;
GRANT VIEW ANY DEFINITION TO datamarshal_api;
GO
```

### 2. Create Sample Tables (Optional)

```sql
USE DataMarshal;
GO

-- Create sample tables for testing
CREATE TABLE dbo.Users (
    UserID int IDENTITY(1,1) PRIMARY KEY,
    Username nvarchar(50) NOT NULL UNIQUE,
    Email nvarchar(100) NOT NULL,
    FirstName nvarchar(50),
    LastName nvarchar(50),
    IsActive bit DEFAULT 1,
    CreatedDate datetime2 DEFAULT GETDATE(),
    ModifiedDate datetime2 DEFAULT GETDATE(),
    RowVersion rowversion
);
GO

CREATE TABLE dbo.Products (
    ProductID int IDENTITY(1,1) PRIMARY KEY,
    ProductName nvarchar(100) NOT NULL,
    Description nvarchar(max),
    Price decimal(10,2),
    CategoryID int,
    IsActive bit DEFAULT 1,
    CreatedDate datetime2 DEFAULT GETDATE(),
    RowVersion rowversion
);
GO

CREATE TABLE dbo.Categories (
    CategoryID int IDENTITY(1,1) PRIMARY KEY,
    CategoryName nvarchar(50) NOT NULL,
    Description nvarchar(255),
    CreatedDate datetime2 DEFAULT GETDATE()
);
GO

-- Insert sample data
INSERT INTO dbo.Categories (CategoryName, Description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Books', 'Physical and digital books'),
('Clothing', 'Apparel and accessories');

INSERT INTO dbo.Users (Username, Email, FirstName, LastName) VALUES
('jdoe', 'john.doe@email.com', 'John', 'Doe'),
('asmith', 'alice.smith@email.com', 'Alice', 'Smith'),
('bwilson', 'bob.wilson@email.com', 'Bob', 'Wilson');

INSERT INTO dbo.Products (ProductName, Description, Price, CategoryID) VALUES
('Laptop', 'High-performance laptop computer', 999.99, 1),
('Programming Book', 'Complete guide to programming', 49.99, 2),
('T-Shirt', 'Comfortable cotton t-shirt', 19.99, 3);
GO
```

### 3. Configure Allowed Tables

Edit the API configuration to specify which tables can be edited:

```javascript
// In datamarshal_api/src/config/database.js
const ALLOWED_TABLES = [
  { schema: 'dbo', table: 'Users' },
  { schema: 'dbo', table: 'Products' },
  { schema: 'dbo', table: 'Categories' }
  // Add your tables here
];
```

## API Configuration

### 1. Update Environment Variables

Edit `datamarshal_api/.env`:

```properties
# Server Configuration
PORT=3001
NODE_ENV=development

# SQL Server Database Configuration
DB_SERVER=localhost\SQLEXPRESS
# For default instance use: DB_SERVER=localhost
# For remote server: DB_SERVER=your-server-name
# For specific port: DB_SERVER=localhost,1433

DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=DataMarshal2025!SecurePass

# Connection Options
DB_ENCRYPT=false
DB_TRUST_CERT=true

# For Windows Authentication (alternative to SQL auth)
# DB_TRUSTED_CONNECTION=true
# Leave DB_USER and DB_PASSWORD empty for Windows Auth
```

### 2. Connection String Examples

Different connection scenarios:

**Local SQL Server Express:**
```properties
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=your_password
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

**Local SQL Server Default Instance:**
```properties
DB_SERVER=localhost
DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=your_password
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

**Remote SQL Server:**
```properties
DB_SERVER=192.168.1.100
# or DB_SERVER=sql-server.company.com
DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=your_password
DB_ENCRYPT=true
DB_TRUST_CERT=false
```

**Windows Authentication:**
```properties
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=DataMarshal
DB_TRUSTED_CONNECTION=true
# Don't set DB_USER and DB_PASSWORD for Windows Auth
```

**Custom Port:**
```properties
DB_SERVER=localhost,1435
DB_DATABASE=DataMarshal
DB_USER=datamarshal_api
DB_PASSWORD=your_password
```

### 3. Install API Dependencies

```bash
cd datamarshal_api
npm install
```

### 4. Test API Connection

```bash
# Start the API server
npm run start

# Check if it's running
# Open browser to: http://localhost:3001/api/health
```

## Frontend Configuration

### 1. Update API URL

In `datamarshal_ui/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api'
};
```

### 2. Install UI Dependencies

```bash
cd datamarshal_ui
npm install
```

### 3. Start Frontend

```bash
npm run start
```

## Testing the Connection

### 1. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:3001/api/health
```

**List Tables:**
```bash
curl http://localhost:3001/api/metadata/tables
```

**Get Table Schema:**
```bash
curl http://localhost:3001/api/metadata/dbo.Users
```

**Get Data:**
```bash
curl http://localhost:3001/api/data/dbo.Users
```

### 2. Test Frontend

1. Open browser to `http://localhost:4200`
2. Navigate to Admin Data section
3. Select a table from the dropdown
4. Verify data loads correctly
5. Test CRUD operations:
   - Add a new record
   - Edit an existing record
   - Delete a record

## Troubleshooting

### Common Connection Issues

**Error: "Login failed for user"**
- Verify username and password in `.env`
- Check if SQL Server authentication is enabled
- Verify user exists: `SELECT name FROM sys.sql_logins WHERE name = 'datamarshal_api'`

**Error: "Cannot connect to server"**
- Check if SQL Server service is running
- Verify server name/instance name
- Check TCP/IP is enabled
- Verify port 1433 is open
- For named instances, check SQL Server Browser is running

**Error: "Database does not exist"**
- Verify database name in `.env`
- Check database exists: `SELECT name FROM sys.databases WHERE name = 'DataMarshal'`

**Error: "Invalid column name"**
- Check if tables have primary keys
- Verify column names match exactly (case-sensitive)
- Update ALLOWED_TABLES configuration

**Error: "Permission denied"**
- Verify user permissions: `SELECT * FROM sys.database_permissions WHERE grantee_principal_id = USER_ID('datamarshal_api')`
- Grant missing permissions as shown in database setup

### Network Troubleshooting

**Test SQL Server connectivity:**
```bash
# Test if port is open
telnet localhost 1433

# Test with sqlcmd
sqlcmd -S localhost\SQLEXPRESS -U datamarshal_api -P your_password -Q "SELECT @@VERSION"
```

**Check SQL Server logs:**
- Open SQL Server Management Studio
- Connect to server
- Management → SQL Server Logs → Current

### Debug API Connection

Add debug logging to `datamarshal_api/src/config/database.js`:

```javascript
const pool = new sql.ConnectionPool(config);

pool.on('connect', () => {
  console.log('✅ Connected to SQL Server successfully');
});

pool.on('error', (err) => {
  console.error('❌ SQL Server connection error:', err);
});
```

## Security Best Practices

### 1. Database Security

- Use strong passwords for SQL Server accounts
- Limit database permissions to minimum required
- Enable SSL/TLS encryption for production
- Regular security updates for SQL Server
- Use Windows Authentication when possible

### 2. API Security

- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement rate limiting
- Add authentication/authorization
- Validate all input data
- Use parameterized queries (already implemented)

### 3. Network Security

- Restrict SQL Server access to specific IP addresses
- Use VPN for remote connections
- Close unnecessary ports
- Monitor connection logs

### 4. Application Security

```javascript
// Add to .env for production
NODE_ENV=production
DB_ENCRYPT=true
DB_TRUST_CERT=false
JWT_SECRET=your_very_long_random_secret_key
API_KEY=your_api_key_for_external_access
```

## Production Deployment

### 1. Environment Variables

```properties
# Production .env
NODE_ENV=production
PORT=3001

# Use production database
DB_SERVER=prod-sql-server.company.com
DB_DATABASE=DataMarshal_Prod
DB_USER=datamarshal_prod
DB_PASSWORD=very_secure_production_password
DB_ENCRYPT=true
DB_TRUST_CERT=false

# Security
JWT_SECRET=very_long_random_jwt_secret_for_production
API_KEY=secure_api_key_for_external_access

# Logging
LOG_LEVEL=warn
```

### 2. SSL Certificate Configuration

For production with SSL:

```javascript
// In database.js config
options: {
  encrypt: true,
  trustServerCertificate: false, // Use valid SSL certificate
  enableArithAbort: true
}
```

### 3. Connection Pooling

Already configured in the application:

```javascript
pool: {
  max: 10,        // Maximum connections
  min: 0,         // Minimum connections
  idleTimeoutMillis: 30000  // 30 seconds
}
```

## Support and Resources

- **SQL Server Documentation**: https://docs.microsoft.com/en-us/sql/
- **Node.js mssql Package**: https://www.npmjs.com/package/mssql
- **Angular Documentation**: https://angular.io/docs
- **DataMarshal GitHub**: https://github.com/kerjillion/DataMarshal

---

**Next Steps:**
1. Follow the SQL Server configuration steps
2. Set up your database and user accounts
3. Configure the API environment variables
4. Test the connection
5. Start building your data management workflows!

For additional help, check the troubleshooting section or create an issue on the GitHub repository.
