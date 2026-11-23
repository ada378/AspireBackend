const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from backend public (PDF catalog, logo, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
const catalogRouter = require('./routes/catalog');
const contactRouter = require('./routes/contact');
const quoteRouter = require('./routes/quote');
const leadsRouter = require('./routes/leads');
const adminRouter = require('./routes/admin');
const portfolioRouter = require('./routes/portfolio');

app.use('/api/catalog', catalogRouter);
app.use('/api/contact', contactRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/portfolio', portfolioRouter);

// Endpoint for direct PDF download
app.get('/api/download-catalog', (req, res) => {
  const filePath = path.join(__dirname, 'public/catalog.pdf');
  res.download(filePath, 'Aspire_MediaTech_Solutions_Catalog.pdf', (err) => {
    if (err) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).send('Could not download catalog PDF');
      }
    }
  });
});

// Health check with DB status
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'online',
    database: dbStatus,
    company: 'Aspire MediaTech Solutions',
    tagline: 'INNOVATE OPTIMIZE GROW',
    headquarters: '1st Floor, 203 A, Felix Square, Sushant Golf City, Ansal API, Near Lulu Mall, Lucknow, Uttar Pradesh 226030',
    timestamp: new Date().toISOString()
  });
});

// Root greeting
app.get('/', (req, res) => {
  res.json({
    message: 'Aspire MediaTech Solutions Backend API is running.',
    database: 'MongoDB (Mongoose)',
    endpoints: [
      'GET /api/health',
      'GET /api/catalog',
      'POST /api/contact',
      'POST /api/quote/estimate',
      'POST /api/leads',
      'GET /api/portfolio',
      'GET /api/admin/overview',
      'GET /api/download-catalog'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Aspire MediaTech Solutions Backend Server Running!`);
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/api/health`);
  console.log(` Admin API: http://localhost:${PORT}/api/admin/overview`);
  console.log(` Portfolio: http://localhost:${PORT}/api/portfolio`);
  console.log(`=======================================================`);
});
