const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Golf Course API configuration
const GOLF_API_BASE = 'https://api.golfcourseapi.com';
const API_KEY = '3OUTPX2MOI533VS4JYEDNTVYCY';

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', async (req, res) => {
  console.log('Backend test endpoint called');
  res.json({ message: 'Backend server is working!' });
});

// Golf Course API proxy endpoints
app.get('/api/golf/test', async (req, res) => {
  try {
    console.log('=== Golf Course API Test Started ===');
    console.log('Testing Golf Course API connection...');
    
    const url = `${GOLF_API_BASE}/v1/healthcheck`;
    console.log(`Making request to: ${url}`);
    console.log(`Using API Key: ${API_KEY.substring(0, 10)}...`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ API connection successful!');
      console.log('Response data:', data);
      return res.json({ 
        success: true, 
        message: 'API connection successful!',
        data: data
      });
    } else {
      const errorText = await response.text();
      console.log(`✗ API failed with status ${response.status}`);
      console.log('Error response:', errorText);
      return res.status(500).json({ 
        success: false, 
        message: `API returned ${response.status}: ${errorText}` 
      });
    }
    
  } catch (error) {
    console.error('Golf API test error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Search golf courses
app.get('/api/golf/search', async (req, res) => {
  try {
    console.log('=== Golf Course Search Started ===');
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    console.log(`Searching for: ${q}`);
    const url = `${GOLF_API_BASE}/v1/search?search_query=${encodeURIComponent(q)}`;
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Search response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Search error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Search results:', data);
    res.json(data);
  } catch (error) {
    console.error('Golf course search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get course by ID
app.get('/api/golf/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Getting course by ID: ${id}`);
    
    const response = await fetch(`${GOLF_API_BASE}/v1/courses/${id}`, {
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Golf course fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('Golf Course API proxy endpoints:');
  console.log(`  Test: http://localhost:${PORT}/api/golf/test`);
  console.log(`  Search: http://localhost:${PORT}/api/golf/search?q=pebble`);
  console.log('Ready to receive requests!');
});

module.exports = app;