# DataMarshal API

A secure, generic Node.js REST API for managing SQL Server data through a web interface. Built with safety-first principles and enterprise-grade features.

## 🚀 Features

### Core Capabilities
- **Generic Data Editor** - Modify any allowed table through Angular UI
- **Schema Discovery** - Automatic SQL Server metadata detection
- **Security First** - Allow-list based table and column access control
- **Optimistic Concurrency** - Row-level locking with rowversion support
- **Audit Trail** - Complete who/when/before/after logging
- **Foreign Key Lookups** - Dynamic dropdown support
- **Server-side Validation** - Nullability, length, numeric ranges, FK constraints

### Security Features
- ✅ **Allow-list** at table and column level
- ✅ **Read-only** for computed, identity, timestamp columns
- ✅ **Parameter-safe** queries (no SQL injection)
- ✅ **Constraint validation** with friendly error messages
- ✅ **Transaction support** for multi-column edits

## 📋 Prerequisites

- Node.js (v16 or higher)
- SQL Server (2016+) or Azure SQL Database
- npm or yarn

## 🛠 Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure your database:**
   - Copy `.env` file and update database connection settings
   - Update `src/config/database.js` with your allowed tables
   - See `CONFIGURATION_EXAMPLES.js` for guidance

3. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🔧 Configuration

### Database Connection (.env)
```env
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=YourDatabaseName
DB_USER=your_username
DB_PASSWORD=your_password
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

### Allowed Tables (src/config/database.js)
```javascript
const ALLOWED_TABLES = [
  { schema: 'dbo', table: 'users' },
  { schema: 'dbo', table: 'products' },
  { schema: 'hr', table: 'employees' }
];
```

## 📊 API Endpoints

### Metadata Discovery
- **GET** `/meta/tables` - Get all allowed tables
- **GET** `/meta/table/:schema.:table` - Get table schema details

### Data Operations
- **GET** `/data/:schema.:table` - Get paginated data with filtering/sorting
- **POST** `/data/:schema.:table/insert` - Create new record
- **POST** `/data/:schema.:table/update` - Update existing record
- **POST** `/data/:schema.:table/delete` - Delete record

### Lookup Support
- **GET** `/lookup/:schema.:table` - Get foreign key lookup data

### System
- **GET** `/` - API information and endpoints
- **GET** `/api/health` - Health check

## 🔍 Example Requests

### Get Table List
```bash
curl http://localhost:3000/meta/tables
```

### Get Table Schema
```bash
curl http://localhost:3000/meta/table/dbo.users
```

### Get Data with Pagination and Filtering
```bash
curl "http://localhost:3000/data/dbo.users?page=1&size=25&sortBy=name&name=john"
```

### Create New Record
```bash
curl -X POST http://localhost:3000/data/dbo.users/insert \
  -H "Content-Type: application/json" \
  -H "x-user: admin" \
  -d '{"name": "John Doe", "email": "john@example.com", "is_active": true}'
```

### Update Record with Concurrency Check
```bash
curl -X POST http://localhost:3000/data/dbo.users/update \
  -H "Content-Type: application/json" \
  -H "x-user: admin" \
  -d '{
    "primaryKey": {"id": 123},
    "data": {"name": "John Smith", "email": "johnsmith@example.com"},
    "originalValues": {"rowversion": "0x00000000000007D0"}
  }'
```

### Delete Record
```bash
curl -X POST http://localhost:3000/data/dbo.users/delete \
  -H "Content-Type: application/json" \
  -H "x-user: admin" \
  -d '{"primaryKey": {"id": 123}}'
```

### Get Foreign Key Lookup Data
```bash
curl "http://localhost:3000/lookup/dbo.categories?limit=50"
```

## 🏗 Project Structure

```
datamarshal_api/
├── src/
│   ├── config/
│   │   └── database.js          # DB config & security settings
│   ├── services/
│   │   ├── metadataService.js   # Schema discovery
│   │   └── dataService.js       # CRUD operations
│   └── routes/
│       ├── metadata.js          # /meta/* endpoints
│       ├── data.js              # /data/* endpoints
│       └── lookup.js            # /lookup/* endpoints
├── .env                         # Environment variables
├── server.js                    # Main server file
├── CONFIGURATION_EXAMPLES.js    # Setup examples
└── README.md                    # This file
```

## 🔒 Security Model

### Table Access Control
- Only tables in `ALLOWED_TABLES` can be accessed
- No wildcard access - explicit allow-list only
- Schema and table names are validated

### Column Protection
- Identity columns are automatically read-only
- Computed columns are automatically read-only
- Timestamp/rowversion columns are read-only
- Configurable read-only column patterns

### Concurrency Control
- Optimistic locking with rowversion columns
- Conflict detection and user-friendly error messages
- Automatic retry suggestions

### Audit Trail
- Complete before/after value logging
- User identification tracking
- Operation timestamping
- Configurable audit table storage

## 🧪 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests (to be implemented)

## 🚨 Error Handling

The API provides detailed error responses with appropriate HTTP status codes:

- **400** - Bad Request (validation errors, missing fields)
- **403** - Forbidden (table not in allow-list)
- **404** - Not Found (record not found)
- **409** - Conflict (concurrency violation)
- **500** - Internal Server Error

## 📈 Performance Considerations

- Pagination limits (max 1000 records per request)
- Connection pooling for database efficiency
- Parameter-safe queries for optimal SQL execution plans
- Configurable lookup data limits

## 🤝 Contributing

1. Follow the security-first approach
2. Add comprehensive error handling
3. Include parameter validation
4. Update documentation for new features

## 📄 License

ISC
