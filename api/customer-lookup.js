// Alternative API handler for VAPI Functions (instead of Tools)
// File: api/customer-lookup.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      method: req.method
    });
  }

  try {
    let searchValue = null;

    console.log('Processing request...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Handle VAPI Function calls (different structure than Tools)
    if (req.body.message && req.body.message.functionCall) {
      const functionCall = req.body.message.functionCall;
      if (functionCall.parameters) {
        searchValue = functionCall.parameters.phone;
        console.log('Extracted from VAPI function call:', searchValue);
      }
    }
    // Handle VAPI Tool calls
    else if (req.body.message && req.body.message.toolCalls) {
      const toolCalls = req.body.message.toolCalls;
      if (toolCalls.length > 0 && toolCalls[0].function && toolCalls[0].function.arguments) {
        const args = toolCalls[0].function.arguments;
        searchValue = args.phone || args.email || args.input;
        console.log('Extracted from VAPI tool call:', searchValue);
      }
    }
    // Direct call (for testing)
    else if (req.body.phone) {
      searchValue = req.body.phone;
      console.log('Direct phone parameter:', searchValue);
    }

    if (!searchValue) {
      console.log('ERROR: No search value found');
      
      // Return appropriate format based on call type
      if (req.body.message && req.body.message.functionCall) {
        // Function response format
        return res.json({
          result: "Error: Phone number is required"
        });
      } else {
        // Tool response format
        return res.status(200).send('Error: Phone number is required');
      }
    }

    console.log('Searching for:', searchValue);

    // Your Google Sheet configuration
    const SPREADSHEET_ID = '1n05jETHk3hVMI59J4I7HtMd8OdstkHyT3fUP1xxbges';
    const SHEET_NAME = 'users';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

    // Fetch and parse CSV
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      const errorMsg = 'No customer data found in system';
      return req.body.message && req.body.message.functionCall 
        ? res.json({ result: errorMsg })
        : res.status(200).send(errorMsg);
    }

    // Parse CSV (your existing logic)
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

    // Find customer
    const phoneIndex = headers.findIndex(h => h.toLowerCase().includes('phone'));
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'));
    
    let foundCustomer = null;
    const cleanSearchPhone = searchValue.replace(/\D/g, '');

    for (const row of rows) {
      if (phoneIndex !== -1 && row[phoneIndex]) {
        const cleanRowPhone = row[phoneIndex].toString().replace(/\D/g, '');
        if (cleanRowPhone === cleanSearchPhone) {
          foundCustomer = {};
          headers.forEach((header, index) => {
            foundCustomer[header] = row[index] || '';
          });
          break;
        }
      }
    }

    // Return result in appropriate format
    const isFunction = req.body.message && req.body.message.functionCall;
    
    if (foundCustomer) {
      const customerName = foundCustomer.name || foundCustomer.Name || 'valued customer';
      const resultMessage = `Customer found: ${customerName}. This is a returning customer - greet them personally by name!`;
      
      console.log('Customer found:', customerName);
      
      return isFunction 
        ? res.json({ result: resultMessage })
        : res.status(200).send(resultMessage);
    } else {
      const resultMessage = `New customer with phone ${searchValue}. Welcome them warmly and collect their information.`;
      
      console.log('New customer');
      
      return isFunction 
        ? res.json({ result: resultMessage })
        : res.status(200).send(resultMessage);
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMsg = `Error: Unable to lookup customer. Please proceed manually.`;
    
    const isFunction = req.body.message && req.body.message.functionCall;
    return isFunction 
      ? res.json({ result: errorMsg })
      : res.status(200).send(errorMsg);
  }
}
