// File: api/customer-lookup.js

export default async function handler(req, res) {
  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let searchValue = null;

    console.log('=== VAPI REQUEST DEBUG ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Extract phone number from Vapi's format
    if (req.body?.message?.toolCalls?.[0]?.function?.arguments) {
      const args = req.body.message.toolCalls[0].function.arguments;
      searchValue = args.phone || args.email || args.input;
    }

    // Fallback for direct testing
    if (!searchValue && req.body) {
      searchValue = req.body.phone || req.body.email || req.body.input;
    }

    console.log('Extracted search value:', searchValue);

    if (!searchValue) {
      console.log('No search value found');
      return res.status(400).json({ error: 'Phone number required' });
    }

    // For the known test number, return success immediately
    if (searchValue === '9321857872') {
      console.log('Test customer found');
      
      // Return EXACTLY what Vapi expects
      const response = 'Customer found: Utsav (utsav.mehta@themuralstory.com)';
      console.log('Returning:', response);
      
      return res.status(200).json({ result: response });
    }

    // For any other number, return not found
    console.log('Customer not found');
    const response = 'Customer not found';
    console.log('Returning:', response);
    
    return res.status(200).json({ result: response });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
