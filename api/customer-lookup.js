// File: api/customer-lookup.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // DETAILED LOGGING - Log everything we receive
  console.log('=== INCOMING REQUEST DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body content:', JSON.stringify(req.body, null, 2));
  console.log('Query params:', JSON.stringify(req.query, null, 2));
  console.log('=== END DEBUG ===');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      method: req.method,
      allowedMethods: ['POST']
    });
  }

  try {
    let searchValue = null;

    // Try multiple ways to extract the phone number
    console.log('Attempting to extract phone number...');

    // Method 1: Direct body access
    if (req.body && typeof req.body === 'object') {
      console.log('Method 1: Body is object');
      searchValue = req.body.phone || req.body.email || req.body.input;
      console.log('Extracted from body object:', searchValue);
    }

    // Method 2: If body is string, parse it
    if (!searchValue && typeof req.body === 'string') {
      console.log('Method 2: Body is string, trying to parse');
      try {
        const parsed = JSON.parse(req.body);
        searchValue = parsed.phone || parsed.email || parsed.input;
        console.log('Extracted from parsed string:', searchValue);
      } catch (e) {
        console.log('Failed to parse body as JSON:', e.message);
      }
    }

    // Method 3: Query parameters
    if (!searchValue && req.query) {
      console.log('Method 3: Trying query parameters');
      searchValue = req.query.phone || req.query.email || req.query.input;
      console.log('Extracted from query:', searchValue);
    }

    // Method 4: Check if Vapi sends it differently
    if (!searchValue && req.body) {
      console.log('Method 4: Checking all body properties');
      const bodyKeys = Object.keys(req.body);
      console.log('Body keys:', bodyKeys);
      
      // Sometimes tools send parameters differently
      for (const key of bodyKeys) {
        if (key.toLowerCase().includes('phone') || key === 'input') {
          searchValue = req.body[key];
          console.log(`Found value in key "${key}":`, searchValue);
          break;
        }
      }
    }

    console.log('Final extracted search value:', searchValue);

    // If still no value, return detailed error
    if (!searchValue) {
      console.log('ERROR: No search value found');
      return res.status(400).json({
        error: 'Phone number or email is required',
        debug: {
          receivedMethod: req.method,
          receivedHeaders: req.headers,
          receivedBody: req.body,
          receivedQuery: req.query,
          bodyType: typeof req.body,
          bodyKeys: req.body ? Object.keys(req.body) : null
        }
      });
    }

    // For now, let's just return a success response to test
    console.log('SUCCESS: Found search value, returning test response');
    return res.status(200).json({
      success: true,
      message: 'API is working!',
      receivedValue: searchValue,
      debug: {
        method: req.method,
        bodyType: typeof req.body,
        extractedFrom: 'success'
      }
    });

    // TODO: Add Google Sheets lookup here later

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
}
