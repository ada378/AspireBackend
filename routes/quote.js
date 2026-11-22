const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Quote = require('../models/Quote');

const quotesPath = path.join(__dirname, '../data/quotes.json');

function readQuotesFile() {
  if (!fs.existsSync(quotesPath)) return [];
  const data = fs.readFileSync(quotesPath, 'utf-8');
  return data ? JSON.parse(data) : [];
}

function writeQuotesFile(data) {
  fs.writeFileSync(quotesPath, JSON.stringify(data, null, 2), 'utf-8');
}

// POST quote estimate
router.post('/estimate', async (req, res) => {
  try {
    const { name, email, phone, selectedServices, projectDetails } = req.body;

    if (!selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one service to calculate an estimate.'
      });
    }

    const quoteId = 'QUOTE-' + Date.now().toString().slice(-6);
    const quoteData = {
      id: quoteId,
      name: name ? name.trim() : 'Valued Client',
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      selectedServices,
      projectDetails: projectDetails ? projectDetails.trim() : '',
      status: 'new',
      source: 'catalogue_quote',
      createdAt: new Date().toISOString()
    };

    // If MongoDB is connected, save to MongoDB
    if (mongoose.connection.readyState === 1) {
      const createdQuote = await Quote.create(quoteData);
      console.log(`[MongoDB Quote Saved] ${createdQuote.name} (Services: ${selectedServices.length})`);
      return res.status(200).json({
        success: true,
        quoteId: createdQuote.id,
        message: 'Quote estimate generated successfully.',
        data: createdQuote
      });
    }

    // Fallback to local JSON file
    const quotes = readQuotesFile();
    quotes.unshift(quoteData);
    writeQuotesFile(quotes);

    console.log(`[File Quote Saved] ${quoteData.name} (Services: ${selectedServices.length})`);
    return res.status(200).json({
      success: true,
      quoteId: quoteData.id,
      message: 'Quote estimate generated successfully.',
      data: quoteData
    });
  } catch (error) {
    console.error('Error generating quote estimate:', error);
    res.status(500).json({ success: false, message: 'Failed to generate estimate' });
  }
});

// GET all quotes
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quotes = await Quote.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: quotes.length, source: 'mongodb', data: quotes });
    }

    const quotes = readQuotesFile();
    res.json({ success: true, count: quotes.length, source: 'file', data: quotes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch quotes' });
  }
});

module.exports = router;
