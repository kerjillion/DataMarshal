const express = require('express');
const router = express.Router();
const metadataService = require('../services/metadataService');

/**
 * GET /meta/tables
 * Get list of all allowed tables
 */
router.get('/tables', async (req, res) => {
  try {
    const tables = await metadataService.getAllowedTables();
    res.json({
      success: true,
      data: tables,
      message: 'Tables retrieved successfully'
    });
  } catch (error) {
    console.error('Error in GET /meta/tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tables',
      message: error.message
    });
  }
});

/**
 * GET /meta/table/:schema.:table
 * Get detailed schema information for a specific table
 */
router.get('/table/:schema.:table', async (req, res) => {
  try {
    const { schema, table } = req.params;
    
    if (!schema || !table) {
      return res.status(400).json({
        success: false,
        error: 'Schema and table parameters are required'
      });
    }

    const tableSchema = await metadataService.getTableSchema(schema, table);
    res.json({
      success: true,
      data: tableSchema,
      message: 'Table schema retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in GET /meta/table/${req.params.schema}.${req.params.table}:`, error);
    
    if (error.message.includes('not allowed')) {
      return res.status(403).json({
        success: false,
        error: 'Table access denied',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve table schema',
      message: error.message
    });
  }
});

module.exports = router;
