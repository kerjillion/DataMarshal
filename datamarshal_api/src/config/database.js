const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Use encryption
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true', // For self-signed certs
    enableArithAbort: true, // Required for SQL Server 2016+
    instanceName: process.env.DB_INSTANCE_NAME || undefined
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 60000, // 60 seconds
  requestTimeout: 60000, // 60 seconds
  parseJSON: true
};

// Configure authentication based on environment variables
if (process.env.DB_USER && process.env.DB_PASSWORD) {
  // SQL Server Authentication
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
  config.options.trustedConnection = false;
} else if (process.env.DB_TRUSTED_CONNECTION === 'true') {
  // Windows Authentication
  config.options.trustedConnection = true;
} else {
  console.warn('Warning: No authentication method configured. Please set DB_USER/DB_PASSWORD or DB_TRUSTED_CONNECTION=true');
}

// Allow list of tables that can be edited
// This is the security layer - only these tables can be accessed
const ALLOWED_TABLES = [
  // Add your allowed tables here, e.g.:
  // { schema: 'dbo', table: 'users' },
  // { schema: 'dbo', table: 'products' },
  // { schema: 'hr', table: 'employees' }
];

// Columns that should always be read-only
const READ_ONLY_COLUMN_TYPES = [
  'timestamp',
  'rowversion',
  'uniqueidentifier', // if it's an identity
  'computed'
];

// Column names that are typically read-only
const READ_ONLY_COLUMN_NAMES = [
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'rowversion',
  'timestamp'
];

let pool;

const connectDB = async () => {
  try {
    if (!pool) {
      console.log(`Connecting to SQL Server: ${config.server}`);
      console.log(`Database: ${config.database}`);
      console.log(`Authentication: ${config.user ? 'SQL Server' : 'Windows'}`);
      
      pool = await sql.connect(config);
      console.log('✅ Connected to SQL Server successfully');
      
      // Test the connection
      const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as database_name');
      console.log(`📊 SQL Server Version: ${result.recordset[0].version.split('\n')[0]}`);
      console.log(`📁 Connected to database: ${result.recordset[0].database_name}`);
    }
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    
    // Provide helpful error messages for common issues
    if (err.code === 'ESOCKET') {
      console.error(`
🔧 Connection Tips:
   1. Check if SQL Server is running: services.msc → SQL Server (MSSQLSERVER)
   2. Verify server name: ${config.server}
   3. Check if TCP/IP is enabled in SQL Server Configuration Manager
   4. Verify port 1433 is open (or your custom port)
   5. For named instances, ensure SQL Server Browser service is running
      `);
    } else if (err.code === 'ELOGIN') {
      console.error(`
🔐 Authentication Tips:
   1. Verify username/password in .env file
   2. Check if SQL Server Authentication is enabled (Mixed Mode)
   3. For Windows Auth, ensure your Node.js process runs with correct permissions
      `);
    }
    
    throw err;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return pool;
};

const checkDatabaseHealth = async () => {
  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT 1 as healthy, GETDATE() as timestamp');
    return {
      healthy: true,
      timestamp: result.recordset[0].timestamp,
      message: 'Database connection is healthy'
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      message: 'Database connection failed'
    };
  }
};

const isTableAllowed = (schema, table) => {
  return ALLOWED_TABLES.some(allowed => 
    allowed.schema.toLowerCase() === schema.toLowerCase() && 
    allowed.table.toLowerCase() === table.toLowerCase()
  );
};

const isColumnReadOnly = (column) => {
  // Check by column name
  if (READ_ONLY_COLUMN_NAMES.some(name => 
    column.name.toLowerCase().includes(name.toLowerCase()))) {
    return true;
  }
  
  // Check by data type
  if (READ_ONLY_COLUMN_TYPES.includes(column.type.toLowerCase())) {
    return true;
  }
  
  // Check if it's an identity column
  if (column.is_identity) {
    return true;
  }
  
  // Check if it's computed
  if (column.is_computed) {
    return true;
  }
  
  return false;
};

module.exports = {
  sql,
  connectDB,
  getPool,
  checkDatabaseHealth,
  isTableAllowed,
  isColumnReadOnly,
  ALLOWED_TABLES,
  READ_ONLY_COLUMN_TYPES,
  READ_ONLY_COLUMN_NAMES
};
