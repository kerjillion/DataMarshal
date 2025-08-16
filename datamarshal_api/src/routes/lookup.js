const express = require('express');
const router = express.Router();
const metadataService = require('../services/metadataService');

/**
 * GET /lookup/:schema.:table
 * Get lookup data for foreign key dropdowns
 * Query parameters:
 * - valueColumn: column to use as value (defaults to primary key)
 * - displayColumn: column to use as display text (defaults to name/title column or primary key)
 * - limit: maximum number of records to return (default 100, max 1000)
 */
router.get('/:schema.:table', async (req, res) => {
  try {
    const { schema, table } = req.params;
    const {
      valueColumn,
      displayColumn,
      limit = 100
    } = req.query;

    // Validate limit
    const maxRecords = Math.min(parseInt(limit) || 100, 1000);

    const lookupData = await metadataService.getLookupData(
      schema, 
      table, 
      valueColumn, 
      displayColumn, 
      maxRecords
    );
    
    res.json({
      success: true,
      data: lookupData,
      message: 'Lookup data retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in GET /lookup/${req.params.schema}.${req.params.table}:`, error);
    
    if (error.message.includes('not allowed')) {
      return res.status(403).json({
        success: false,
        error: 'Table access denied for lookups',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve lookup data',
      message: error.message
    });
  }
});

module.exports = router;
