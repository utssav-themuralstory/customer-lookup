// File: api/customer-lookup.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, email, input } = req.body;
    const searchValue = input || phone || email;

    if (!searchValue) {
      return res.status(400).json({
        error: 'Phone number or email is required'
      });
    }

    // Your Google Sheet as CSV (public)
    const SPREADSHEET_ID = '1n05jETHk3hVMI59J4I7HtMd8OdstkHyT3fUP1xxbges';
    const SHEET_NAME = 'users';
    
    // Use CSV export URL (no API key needed if sheet is public)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

    // Fetch CSV data
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    const csvText = await response.text();
    
    // Simple CSV parsing
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return res.status(200).json({
        exists: false,
        message: 'No data found'
      });
    }

    // Parse CSV
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    }

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));

    // Find column indices
    const phoneIndex = headers.findIndex(h => h.toLowerCase().includes('phone'));
    const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));

    // Search for customer
    let foundCustomer = null;
    const isEmail = searchValue.includes('@');

    for (const row of rows) {
      let match = false;

      // Try phone search
      if (!isEmail && phoneIndex !== -1 && row[phoneIndex]) {
        if (row[phoneIndex].toString().replace(/\D/g, '') === searchValue.replace(/\D/g, '')) {
          match = true;
        }
      }

      // Try email search
      if (isEmail && emailIndex !== -1 && row[emailIndex]) {
        if (row[emailIndex].toLowerCase() === searchValue.toLowerCase()) {
          match = true;
        }
      }

      if (match) {
        foundCustomer = {};
        headers.forEach((header, index) => {
          foundCustomer[header] = row[index] || '';
        });
        break;
      }
    }

    if (foundCustomer) {
      return res.status(200).json({
        exists: true,
        customer: foundCustomer,
        searchValue: searchValue
      });
    } else {
      return res.status(200).json({
        exists: false,
        customer: null,
        searchValue: searchValue,
        message: "No customer found"
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}