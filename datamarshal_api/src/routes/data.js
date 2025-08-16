const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const metadataService = require('../services/metadataService');
const Joi = require('joi');

/**
 * GET /data/:schema.:table
 * Get paginated data from a table with optional filtering and sorting
 */
router.get('/:schema.:table', async (req, res) => {
  try {
    const { schema, table } = req.params;
    const {
      page = 1,
      size = 50,
      sortBy,
      sortOrder = 'ASC',
      ...filters
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(size), 1000); // Max 1000 records per page

    if (pageNum < 1 || pageSize < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

    const options = {
      page: pageNum,
      size: pageSize,
      sortBy,
      sortOrder,
      filters
    };

    const result = await dataService.getData(schema, table, options);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      schema: result.schema,
      message: 'Data retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in GET /data/${req.params.schema}.${req.params.table}:`, error);
    
    if (error.message.includes('not allowed')) {
      return res.status(403).json({
        success: false,
        error: 'Table access denied',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve data',
      message: error.message
    });
  }
});

/**
 * POST /data/:schema.:table/insert
 * Insert a new record
 */
router.post('/:schema.:table/insert', async (req, res) => {
  try {
    const { schema, table } = req.params;
    const data = req.body;
    const user = req.user?.username || req.headers['x-user'] || 'anonymous';

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided for insert'
      });
    }

    const result = await dataService.insertRecord(schema, table, data, user);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Record created successfully'
    });
  } catch (error) {
    console.error(`Error in POST /data/${req.params.schema}.${req.params.table}/insert:`, error);
    
    if (error.message.includes('not allowed')) {
      return res.status(403).json({
        success: false,
        error: 'Table access denied',
        message: error.message
      });
    }
    
    // Handle SQL constraint violations
    if (error.message.includes('FOREIGN KEY') || error.message.includes('PRIMARY KEY')) {
      return res.status(400).json({
        success: false,
        error: 'Data constraint violation',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to insert record',
      message: error.message
    });
  }
});

/**
 * POST /data/:schema.:table/update
 * Update an existing record
 */
router.post('/:schema.:table/update', async (req, res) => {
  try {
    const { schema, table } = req.params;
    const { primaryKey, data, originalValues } = req.body;
    const user = req.user?.username || req.headers['x-user'] || 'anonymous';

    if (!primaryKey || !data) {
      return res.status(400).json({
        success: false,
        error: 'Primary key and data are required for update'
      });
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided for update'
      });
    }

    const result = await dataService.updateRecord(schema, table, primaryKey, data, originalValues, user);
    
    res.json({
      success: true,
      data: result,
      message: 'Record updated successfully'
    });
  } catch (error) {
    console.error(`Error in POST /data/${req.params.schema}.${req.params.table}/update:`, error);
    
    if (error.message.includes('not allowed')) {
      return res.status(403).json({
        success: false,
        error: 'Table access denied',
        message: error.message
      });
    }
    
    if (error.message.includes('modified by another user')) {
      return res.status(409).json({
        success: false,
        error: 'Concurrency conflict',
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        message: error.message
      });
    }
    
    // Handle SQL constraint violations
    if (error.message.includes('FOREIGN KEY') || error.message.includes('CHECK')) {
      return res.status(400).json({
        success: false,
        error: 'Data constraint violation',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update record',
      message: error.message
    });
  }
});

/**
 * POST /data/:schema.:table/delete
 * Delete a record
 */
router.post('/:schema.:table/delete', async (req, res) => {
  try {
    const { schema, table } = req.params;
    const { primaryKey } = req.body;
    const user = req.user?.username || req.headers['x-user'] || 'anonymous';

    if (!primaryKey) {
      return res.status(400).json({
        success: false,
        error: 'Primary key is required for delete'
      });
    }

    const result = await dataService.deleteRecord(schema, table, primaryKey, user);
    
    res.json({
      success: true,
      data: result,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error(`Error in POST /data/${req.params.schema}.${req.params.table}/delete:`, error);
    
    if (error.message.includes('not allowed')) {
      return res.status(403).json({
        success: false,
        error: 'Table access denied',
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        message: error.message
      });
    }
    
    // Handle SQL constraint violations (e.g., foreign key references)
    if (error.message.includes('FOREIGN KEY') || error.message.includes('REFERENCE')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete: record is referenced by other data',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete record',
      message: error.message
    });
  }
});

module.exports = router;
