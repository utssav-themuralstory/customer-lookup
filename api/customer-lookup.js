// In your existing api/customer-lookup.js file
// Find this section at the bottom (around line 150+):

    // Return result
    if (foundCustomer) {
      console.log('Customer found:', foundCustomer.name || foundCustomer.Name);
      
      // REPLACE THIS ENTIRE BLOCK:
      // return res.status(200).json({
      //   exists: true,
      //   customer: foundCustomer,
      //   searchValue: searchValue,
      //   searchType: isEmail ? 'email' : 'phone'
      // });
      
      // WITH THIS SIMPLE RESPONSE:
      const customerName = foundCustomer.name || foundCustomer.Name || foundCustomer.customer_name || 'valued customer';
      return res.status(200).send(`CUSTOMER_FOUND: Name is ${customerName}. This is a returning customer - greet them personally by name!`);
      
    } else {
      console.log('No customer found');
      
      // REPLACE THIS ENTIRE BLOCK:
      // return res.status(200).json({
      //   exists: false,
      //   customer: null,
      //   searchValue: searchValue,
      //   message: "No customer found with provided phone number or email"
      // });
      
      // WITH THIS SIMPLE RESPONSE:
      return res.status(200).send(`NEW_CUSTOMER: No existing customer found with phone ${searchValue}. This is a new customer - welcome them warmly and collect their information.`);
    }

  } catch (error) {
    console.error('Error:', error);
    
    // REPLACE THIS:
    // return res.status(500).json({
    //   error: 'Internal server error',
    //   details: error.message
    // });
    
    // WITH THIS:
    return res.status(200).send(`Error: Unable to lookup customer. Please proceed with manual assistance.`);
  }
