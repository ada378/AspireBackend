const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../data/catalog.json');

// GET all catalog categories & items
router.get('/', (req, res) => {
  try {
    const rawData = fs.readFileSync(catalogPath, 'utf-8');
    const catalog = JSON.parse(rawData);
    res.json({
      success: true,
      data: catalog
    });
  } catch (error) {
    console.error('Error reading catalog:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch catalog' });
  }
});

// GET specific category by id
router.get('/category/:id', (req, res) => {
  try {
    const rawData = fs.readFileSync(catalogPath, 'utf-8');
    const catalog = JSON.parse(rawData);
    const category = catalog.categories.find(c => c.id === req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

