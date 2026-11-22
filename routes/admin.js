const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Lead = require('../models/Lead');
const Inquiry = require('../models/Inquiry');
const Quote = require('../models/Quote');

const leadsPath = path.join(__dirname, '../data/leads.json');
const inquiriesPath = path.join(__dirname, '../data/inquiries.json');
const quotesPath = path.join(__dirname, '../data/quotes.json');

function readFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return raw ? JSON.parse(raw) : [];
}

function writeFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// POST /api/admin/login - Authenticate Admin using .env credentials
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const configuredEmail = (process.env.ADMIN_EMAIL || 'aspiremediatechsolution@gmail.com').toLowerCase().trim();
    const configuredPass = (process.env.ADMIN_PASSWORD || 'aspire@2026').trim();

    const inputEmail = (email || '').toLowerCase().trim();
    const inputPass = (password || '').trim();

    // Check credentials (supports configured email, 'admin', or 'aspire')
    const isEmailValid = inputEmail === configuredEmail || inputEmail === 'admin' || inputEmail === 'admin@aspiremediatechsolution.in';
    const isPassValid = inputPass === configuredPass;

    if (isEmailValid && isPassValid) {
      console.log(`[Admin Login Success] ${inputEmail} authenticated at ${new Date().toISOString()}`);
      return res.json({
        success: true,
        message: 'Admin authentication successful',
        token: 'admin_session_' + Date.now(),
        adminEmail: configuredEmail
      });
    }

    console.warn(`[Admin Login Failed] Invalid attempt for ${inputEmail}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid Admin Email or Password. Please check .env credentials.'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
});

// GET /api/admin/overview - Unified dashboard stats and submissions
router.get('/overview', async (req, res) => {
  try {
    let normalizedLeads = [];
    let normalizedInquiries = [];
    let normalizedQuotes = [];
    let isDb = mongoose.connection.readyState === 1;

    if (isDb) {
      const leads = await Lead.find().sort({ createdAt: -1 });
      const inquiries = await Inquiry.find().sort({ createdAt: -1 });
      const quotes = await Quote.find().sort({ createdAt: -1 });

      normalizedLeads = leads.map(l => ({
        ...l.toObject(),
        id: l._id.toString(),
        entryType: 'lead',
        sourceLabel: 'Website Popup Lead',
        status: l.status || 'new'
      }));

      normalizedInquiries = inquiries.map(i => ({
        ...i.toObject(),
        id: i._id.toString(),
        entryType: 'inquiry',
        sourceLabel: 'Contact Form Inquiry',
        status: i.status || 'new'
      }));

      normalizedQuotes = quotes.map(q => ({
        ...q.toObject(),
        id: q.id || q._id.toString(),
        entryType: 'quote',
        sourceLabel: 'Catalogue Estimate Quote',
        status: q.status || 'new'
      }));
    } else {
      const leads = readFile(leadsPath);
      const inquiries = readFile(inquiriesPath);
      const quotes = readFile(quotesPath);

      normalizedLeads = leads.map(l => ({
        ...l,
        entryType: 'lead',
        sourceLabel: 'Website Popup Lead',
        status: l.status || 'new'
      }));

      normalizedInquiries = inquiries.map(i => ({
        ...i,
        entryType: 'inquiry',
        sourceLabel: 'Contact Form Inquiry',
        status: i.status || 'new'
      }));

      normalizedQuotes = quotes.map(q => ({
        ...q,
        entryType: 'quote',
        sourceLabel: 'Catalogue Estimate Quote',
        status: q.status || 'new'
      }));
    }

    const allRecords = [...normalizedLeads, ...normalizedInquiries, ...normalizedQuotes].sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    res.json({
      success: true,
      storageEngine: isDb ? 'MongoDB' : 'LocalJSONFallback',
      timestamp: new Date().toISOString(),
      counts: {
        totalLeads: normalizedLeads.length,
        totalInquiries: normalizedInquiries.length,
        totalQuotes: normalizedQuotes.length,
        totalCombined: allRecords.length
      },
      data: {
        all: allRecords,
        leads: normalizedLeads,
        inquiries: normalizedInquiries,
        quotes: normalizedQuotes
      }
    });
  } catch (error) {
    console.error('Error reading admin overview:', error);
    res.status(500).json({ success: false, message: 'Server error loading admin dashboard.' });
  }
});

// PATCH /api/admin/status - Update lead/inquiry/quote status
router.patch('/status', async (req, res) => {
  try {
    const { id, type, status } = req.body;

    if (!id || !type || !status) {
      return res.status(400).json({ success: false, message: 'id, type, and status are required' });
    }

    if (mongoose.connection.readyState === 1) {
      let Model;
      if (type === 'lead') Model = Lead;
      else if (type === 'inquiry') Model = Inquiry;
      else if (type === 'quote') Model = Quote;
      else return res.status(400).json({ success: false, message: 'Invalid type' });

      const updated = await Model.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { status, updatedAt: new Date() },
        { new: true }
      );

      return res.json({ success: true, message: `Status updated to "${status}" in MongoDB`, data: updated });
    }

    let filePath;
    if (type === 'lead') filePath = leadsPath;
    else if (type === 'inquiry') filePath = inquiriesPath;
    else if (type === 'quote') filePath = quotesPath;
    else return res.status(400).json({ success: false, message: 'Invalid type' });

    const items = readFile(filePath);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Entry not found' });

    items[index].status = status;
    items[index].updatedAt = new Date().toISOString();
    writeFile(filePath, items);

    return res.json({ success: true, message: `Status updated to "${status}"`, data: items[index] });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// DELETE /api/admin/entry/:type/:id - Delete an entry
router.delete('/entry/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    if (mongoose.connection.readyState === 1) {
      let Model;
      if (type === 'lead') Model = Lead;
      else if (type === 'inquiry') Model = Inquiry;
      else if (type === 'quote') Model = Quote;
      else return res.status(400).json({ success: false, message: 'Invalid type' });

      await Model.findOneAndDelete({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }]
      });

      return res.json({ success: true, message: 'Record deleted from MongoDB' });
    }

    let filePath;
    if (type === 'lead') filePath = leadsPath;
    else if (type === 'inquiry') filePath = inquiriesPath;
    else if (type === 'quote') filePath = quotesPath;
    else return res.status(400).json({ success: false, message: 'Invalid entry type' });

    let items = readFile(filePath);
    const initialLen = items.length;
    items = items.filter(item => item.id !== id);

    if (items.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    writeFile(filePath, items);

    return res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete record.' });
  }
});

module.exports = router;
