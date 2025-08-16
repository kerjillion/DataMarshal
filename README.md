# DataMarshal

A comprehensive data management system consisting of a secure Angular 20 frontend and Node.js backend API for SQL Server 2016 administration.

## Overview

DataMarshal implements a secure, generic data editor following enterprise-grade patterns with allow-lists, optimistic concurrency control, and comprehensive audit trails. The system provides a complete data administration interface for SQL Server 2016 databases.

## Architecture

### Frontend (`datamarshal_ui`)
- **Angular 20** with standalone components
- **Angular Material** UI framework with Azure/Blue theme
- **TypeScript** strict mode with signals and reactive forms
- **Production-ready** data editor with comprehensive validation

### Backend (`datamarshal_api`)
- **Node.js** with Express 4.x framework
- **SQL Server 2016** native driver with optimistic concurrency
- **Enterprise security** with helmet, CORS, and parameterized queries
- **RESTful API** following ChatGPT's safe data editor specification

## Features

### Security & Data Integrity
- ✅ **Allow-list based table access** - Only pre-approved tables can be accessed
- ✅ **Optimistic concurrency control** - Prevents conflicting simultaneous edits
- ✅ **Parameterized queries** - Complete SQL injection protection
- ✅ **Audit trail support** - Row-level change tracking with timestamps
- ✅ **Input validation** - Comprehensive client and server-side validation

### User Interface
- ✅ **Dynamic table discovery** - Automatic schema and metadata detection
- ✅ **Advanced filtering** - Multi-column filtering with various operators
- ✅ **Sorting and pagination** - High-performance data browsing
- ✅ **Responsive design** - Works on desktop and mobile devices
- ✅ **Real-time validation** - Immediate feedback on data entry

### Data Management
- ✅ **CRUD operations** - Create, Read, Update, Delete with validation
- ✅ **Foreign key lookups** - Dropdown lists for referenced data
- ✅ **Data type handling** - Proper handling of dates, numbers, and text
- ✅ **Bulk operations** - Efficient handling of large datasets

## Quick Start

### Prerequisites
- Node.js 18+ 
- Angular CLI 20+
- SQL Server 2016 or later
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/kerjillion/DataMarshal.git
cd DataMarshal
```

### 2. Setup Backend API
```bash
cd datamarshal_api
npm install
```

Create `.env` file:
```env
# SQL Server Configuration
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=YourDatabase
DB_USER=your_username
DB_PASSWORD=your_password
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration  
PORT=3001
NODE_ENV=development

# Security
HELMET_ENABLED=true
CORS_ORIGIN=http://localhost:4200
```

Start the API server:
```bash
npm start
```

### 3. Setup Frontend UI
```bash
cd ../datamarshal_ui
npm install
ng serve --port 4200
```

### 4. Access the Application
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/admin

## SQL Server Setup

### Database Configuration
The system requires SQL Server 2016 or later with these minimum configurations:

```sql
-- Enable SQL Server Authentication if needed
ALTER SERVER ROLE sysadmin ADD MEMBER [your_username];

-- Create application database
CREATE DATABASE YourDatabase;
USE YourDatabase;

-- Example table with optimistic concurrency
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2 DEFAULT GETDATE(),
    row_version ROWVERSION
);
```

### Allow-List Configuration
Edit `datamarshal_api/src/config/allowedTables.js` to specify which tables can be accessed:

```javascript
module.exports = [
    'dbo.users',
    'dbo.products', 
    'inventory.items',
    // Add your tables here
];
```

## API Endpoints

### Metadata Endpoints
- `GET /api/admin/meta/tables` - List allowed tables
- `GET /api/admin/meta/table/{schema}.{table}` - Get table metadata

### Data Endpoints  
- `GET /api/admin/data/{schema}.{table}` - Get paginated data
- `POST /api/admin/data/{schema}.{table}/insert` - Insert new record
- `POST /api/admin/data/{schema}.{table}/update` - Update existing record
- `POST /api/admin/data/{schema}.{table}/delete` - Delete record

### Lookup Endpoints
- `GET /api/admin/lookup/{schema}.{table}` - Get foreign key lookup data

## Development

### Project Structure
```
DataMarshal/
├── datamarshal_api/          # Node.js Backend
│   ├── src/
│   │   ├── config/           # Database and app configuration
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Express middleware
│   ├── server.js             # Application entry point
│   └── package.json
├── datamarshal_ui/           # Angular Frontend  
│   ├── src/app/
│   │   ├── admin-data/       # Main feature module
│   │   │   ├── components/   # UI components
│   │   │   ├── services/     # HTTP services
│   │   │   └── types/        # TypeScript interfaces
│   │   └── app.config.ts     # Angular configuration
│   └── package.json
└── README.md
```

### Component Architecture
The Angular frontend follows a modular architecture:

- **AdminShellComponent** - Main container with navigation
- **DataGridComponent** - Table display with sorting/filtering
- **EditDialogComponent** - Create/edit forms with validation
- **FilterBarComponent** - Advanced filtering interface
- **ConfirmDeleteDialogComponent** - Deletion confirmation

### Backend Services
- **MetadataService** - Database schema discovery
- **DataService** - CRUD operations with concurrency control
- **ValidationService** - Input validation and sanitization

## Configuration

### Security Headers
The API includes comprehensive security headers via Helmet.js:
- Content Security Policy
- Cross-Origin Resource Sharing (CORS)
- HTTP Strict Transport Security
- X-Frame-Options protection

### Database Connection
Supports both Windows Authentication and SQL Server Authentication:

```javascript
// Windows Authentication
const config = {
    server: 'localhost\\SQLEXPRESS',
    database: 'YourDatabase',
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

// SQL Server Authentication  
const config = {
    server: 'localhost\\SQLEXPRESS',
    database: 'YourDatabase',
    user: 'username',
    password: 'password',
    options: {
        trustServerCertificate: true
    }
};
```

## Deployment

### Production Build
```bash
# Build frontend
cd datamarshal_ui
ng build --configuration production

# The built files will be in dist/datamarshal_ui/
```

### Environment Variables
Set these environment variables for production:

```env
NODE_ENV=production
DB_SERVER=your-production-server
DB_DATABASE=your-production-database
DB_USER=your-production-user
DB_PASSWORD=your-production-password
CORS_ORIGIN=https://your-production-domain.com
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the [Wiki](https://github.com/kerjillion/DataMarshal/wiki) for documentation
- Review the API documentation at `/api/admin` when running locally

## Acknowledgments

- Built following ChatGPT's secure data editor architecture recommendations
- Uses Angular Material Design components
- Implements Microsoft SQL Server best practices
- Follows Node.js security guidelines
