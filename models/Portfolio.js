const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Project title is required']
  },
  category: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    default: 'Tech & Enterprise'
  },
  priceTier: {
    type: String,
    default: 'Custom Quote'
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'
  },
  metrics: {
    type: Array,
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);

