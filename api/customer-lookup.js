// File: api/customer-lookup.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json'); // Change back to JSON

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed');
    return;
  }

  try {
    let searchValue = null;

    console.log('Processing Vapi request...');

    // Extract phone number from Vapi's nested structure
    if (req.body && req.body.message && req.body.message.toolCalls) {
      const toolCalls = req.body.message.toolCalls;
      if (toolCalls.length > 0 && toolCalls[0].function && toolCalls[0].function.arguments) {
        const args = toolCalls[0].function.arguments;
        searchValue = args.phone || args.email || args.input;
        console.log('Extracted from Vapi toolCalls:', searchValue);
      }
    }

    // Fallback: Standard direct body format
    if (!searchValue && req.body) {
      searchValue = req.body.phone || req.body.email || req.body.input;
      console.log('Extracted from direct body:', searchValue);
    }

    if (!searchValue) {
      console.log('ERROR: No search value found');
      res.status(400).json({
        status: "error",
        message: "Phone number or email is required"
      });
      return;
    }

    console.log('Searching for:', searchValue);

    // Your Google Sheet as CSV (public)
    const SPREADSHEET_ID = '1n05jETHk3hVMI59J4I7HtMd8OdstkHyT3fUP1xxbges';
    const SHEET_NAME = 'users';
    
    // Use CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

    // Fetch CSV data
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log('CSV fetched, length:', csvText.length);
    
    // Simple CSV parsing
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('No data in sheet');
      res.status(200).json({
        status: "not_found",
        message: "CUSTOMER_NOT_FOUND"
      });
      return;
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

    console.log('Headers:', headers);
    console.log('Processing', rows.length, 'rows');

    // Find column indices
    const phoneIndex = headers.findIndex(h => h.toLowerCase().includes('phone'));
    const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'));

    console.log('Phone column index:', phoneIndex);
    console.log('Email column index:', emailIndex);
    console.log('Name column index:', nameIndex);

    // Search for customer
    let foundCustomer = null;
    const isEmail = searchValue.includes('@');

    for (const row of rows) {
      let match = false;

      // Try phone search
      if (!isEmail && phoneIndex !== -1 && row[phoneIndex]) {
        // Clean both phone numbers for comparison (remove all non-digits)
        const cleanRowPhone = row[phoneIndex].toString().replace(/\D/g, '');
        const cleanSearchPhone = searchValue.replace(/\D/g, '');
        
        console.log('Comparing phones:', cleanRowPhone, 'vs', cleanSearchPhone);
        
        if (cleanRowPhone === cleanSearchPhone) {
          match = true;
          console.log('Phone match found!');
        }
      }

      // Try email search
      if (isEmail && emailIndex !== -1 && row[emailIndex]) {
        if (row[emailIndex].toLowerCase() === searchValue.toLowerCase()) {
          match = true;
          console.log('Email match found!');
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

    // Return result as simple text that Vapi can understand
    if (foundCustomer) {
      const customerName = foundCustomer.Name || foundCustomer.name || 'Customer';
      const customerEmail = foundCustomer.email || foundCustomer.Email || '';
      
      console.log('Customer found:', customerName);
      
      // Return a simple JSON response that Vapi can understand
      const result = {
        status: "success",
        message: `CUSTOMER_FOUND|${customerName}|${customerEmail}|${searchValue}`
      };
      console.log('Returning result:', JSON.stringify(result));
      
      res.status(200).json(result);
      return;
    } else {
      console.log('No customer found');
      res.status(200).json({
        status: "not_found",
        message: "CUSTOMER_NOT_FOUND"
      });
      return;
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      status: "error",
      message: "SYSTEM_ERROR"
    });
    return;
  }
}
