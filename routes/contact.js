const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');

const inquiriesPath = path.join(__dirname, '../data/inquiries.json');

function readInquiriesFile() {
  if (!fs.existsSync(inquiriesPath)) return [];
  const data = fs.readFileSync(inquiriesPath, 'utf-8');
  return data ? JSON.parse(data) : [];
}

function writeInquiriesFile(data) {
  fs.writeFileSync(inquiriesPath, JSON.stringify(data, null, 2), 'utf-8');
}

// POST new contact inquiry
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, service, budget, message } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone number are required.'
      });
    }

    const inquiryData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      service: service || 'Website Development',
      budget: budget || 'Not specified',
      message: message ? message.trim() : '',
      status: 'new',
      createdAt: new Date().toISOString()
    };

    // If MongoDB is connected, save to MongoDB
    if (mongoose.connection.readyState === 1) {
      const createdInquiry = await Inquiry.create(inquiryData);
      console.log(`[MongoDB Inquiry Saved] ${createdInquiry.name} (${createdInquiry.phone})`);
      return res.status(201).json({
        success: true,
        message: 'Thank you for reaching out to Aspire MediaTech Solutions! Our team will contact you within 2 hours.',
        inquiryId: createdInquiry._id.toString(),
        data: createdInquiry
      });
    }

    // Fallback to local JSON file
    const inquiries = readInquiriesFile();
    const newInquiry = { id: Date.now().toString(), ...inquiryData };
    inquiries.unshift(newInquiry);
    writeInquiriesFile(inquiries);

    console.log(`[File Inquiry Saved] ${newInquiry.name} (${newInquiry.phone})`);
    return res.status(201).json({
      success: true,
      message: 'Thank you for reaching out to Aspire MediaTech Solutions! Our team will contact you within 2 hours.',
      inquiryId: newInquiry.id,
      data: newInquiry
    });
  } catch (error) {
    console.error('Error saving contact inquiry:', error);
    res.status(500).json({ success: false, message: 'Server error occurred while saving inquiry.' });
  }
});

// GET all inquiries
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const inquiries = await Inquiry.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: inquiries.length, source: 'mongodb', data: inquiries });
    }

    const inquiries = readInquiriesFile();
    res.json({ success: true, count: inquiries.length, source: 'file', data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
  }
});

module.exports = router;
