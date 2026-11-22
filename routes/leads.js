const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

const leadsPath = path.join(__dirname, '../data/leads.json');

function readLeadsFile() {
  if (!fs.existsSync(leadsPath)) return [];
  const data = fs.readFileSync(leadsPath, 'utf-8');
  return data ? JSON.parse(data) : [];
}

function writeLeadsFile(data) {
  fs.writeFileSync(leadsPath, JSON.stringify(data, null, 2), 'utf-8');
}

// POST new popup lead
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, service, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required.'
      });
    }

    const leadData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      service: service || 'General Inquiry',
      message: message ? message.trim() : '',
      source: 'website_popup',
      status: 'new',
      createdAt: new Date().toISOString()
    };

    // If MongoDB is connected, save to MongoDB
    if (mongoose.connection.readyState === 1) {
      const createdLead = await Lead.create(leadData);
      console.log(`[MongoDB Lead Saved] ${createdLead.name} (${createdLead.phone})`);
      return res.status(201).json({
        success: true,
        leadId: createdLead._id.toString(),
        message: 'Consultation request received! Our Lucknow team will call you within 2 hours.',
        data: createdLead
      });
    }

    // Fallback to local JSON file
    const leads = readLeadsFile();
    const newLead = { id: 'LEAD-' + Date.now().toString(), ...leadData };
    leads.unshift(newLead);
    writeLeadsFile(leads);

    console.log(`[File Lead Saved] ${newLead.name} (${newLead.phone})`);
    return res.status(201).json({
      success: true,
      leadId: newLead.id,
      message: 'Consultation request received! Our Lucknow team will call you within 2 hours.',
      data: newLead
    });
  } catch (error) {
    console.error('Error saving popup lead:', error);
    res.status(500).json({ success: false, message: 'Server error saving lead.' });
  }
});

// GET all popup leads
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const leads = await Lead.find().sort({ createdAt: -1 });
      return res.json({
        success: true,
        count: leads.length,
        source: 'mongodb',
        data: leads
      });
    }

    const leads = readLeadsFile();
    res.json({
      success: true,
      count: leads.length,
      source: 'file',
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch popup leads.' });
  }
});

module.exports = router;
