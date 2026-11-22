const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');

const portfolioPath = path.join(__dirname, '../data/portfolio.json');

function readPortfolioFile() {
  if (!fs.existsSync(portfolioPath)) return [];
  const raw = fs.readFileSync(portfolioPath, 'utf-8');
  return raw ? JSON.parse(raw) : [];
}

function writePortfolioFile(data) {
  fs.writeFileSync(portfolioPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Seed initial projects into MongoDB if collection is empty
async function seedPortfolioIfEmpty() {
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await Portfolio.countDocuments();
      if (count === 0) {
        const initial = readPortfolioFile();
        if (initial.length > 0) {
          await Portfolio.insertMany(initial);
          console.log(`[MongoDB] Initialized portfolio with ${initial.length} projects`);
        }
      }
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
}

// GET all portfolio projects
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await seedPortfolioIfEmpty();
      const projects = await Portfolio.find().sort({ createdAt: -1 });
      return res.json({
        success: true,
        count: projects.length,
        source: 'mongodb',
        data: projects
      });
    }

    const projects = readPortfolioFile();
    res.json({
      success: true,
      count: projects.length,
      source: 'file',
      data: projects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch portfolio projects' });
  }
});

// POST add new portfolio project
router.post('/', async (req, res) => {
  try {
    const { title, category, industry, priceTier, description, image, metrics, tags } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and category are required' });
    }

    const newProject = {
      id: 'proj-' + Date.now().toString(),
      title: title.trim(),
      category: category.trim(),
      industry: industry || 'Tech & Enterprise',
      priceTier: priceTier || 'Custom Quote',
      description: description || '',
      image: image || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      metrics: Array.isArray(metrics) && metrics.length > 0 ? metrics : [
        { label: 'Client Growth', value: '+100%' },
        { label: 'Uptime / Speed', value: '99.9%' }
      ],
      tags: Array.isArray(tags) ? tags : ['Full-Stack', 'Cloud'],
      createdAt: new Date().toISOString()
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Portfolio.create(newProject);
      return res.status(201).json({
        success: true,
        message: 'Portfolio project added to MongoDB',
        data: created
      });
    }

    const projects = readPortfolioFile();
    projects.unshift(newProject);
    writePortfolioFile(projects);

    res.status(201).json({
      success: true,
      message: 'Portfolio project added successfully',
      data: newProject
    });
  } catch (error) {
    console.error('Error adding portfolio project:', error);
    res.status(500).json({ success: false, message: 'Failed to save portfolio project' });
  }
});

// PUT update portfolio project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (mongoose.connection.readyState === 1) {
      const updated = await Portfolio.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: 'Project not found' });
      return res.json({ success: true, message: 'Project updated in MongoDB', data: updated });
    }

    const projects = readPortfolioFile();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Project not found' });

    projects[index] = { ...projects[index], ...updates, id, updatedAt: new Date().toISOString() };
    writePortfolioFile(projects);

    res.json({ success: true, message: 'Project updated successfully', data: projects[index] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update project' });
  }
});

// DELETE portfolio project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      await Portfolio.findOneAndDelete({ $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] });
      return res.json({ success: true, message: 'Project deleted from MongoDB' });
    }

    let projects = readPortfolioFile();
    const initialLen = projects.length;
    projects = projects.filter(p => p.id !== id);
    if (projects.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    writePortfolioFile(projects);

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
});

module.exports = router;
