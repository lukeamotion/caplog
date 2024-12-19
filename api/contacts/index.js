import { handleErrors } from '../../vercel/errorHandler'; // Error handling middleware
import authenticate from '../../vercel/auth'; // Authentication middleware
import supabase from '../../utils/supabaseClient'; // Supabase client

export default handleErrors(async function handler(req, res) {
  authenticate(req, res, async () => {
    const { method } = req;

    // Section 1: Method Handling
    switch (method) {
      case 'GET':
        // Section 1.1: Handle GET Request (Fetch Contacts)
        return await handleGetRequest(req, res);
      case 'POST':
        // Section 1.2: Handle POST Request (Create Contact)
        return await handlePostRequest(req, res);
      default:
        // Section 1.3: Unsupported Method
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed.` });
    }
  });
});

// Section 2: GET Request Logic
async function handleGetRequest(req, res) {
  const { name, email, phone } = req.query;

  // Section 2.1: Build Query
  let query = supabase.from('contacts').select('*');

  if (name) query = query.ilike('fullname', `%${name}%`); // Filter by contact name
  if (email) query = query.eq('email', email); // Filter by email
  if (phone) query = query.eq('phone', phone); // Filter by phone

  // Section 2.2: Execute Query
  const { data: contacts, error } = await query;

  if (error) {
    throw new Error(`Error fetching contacts: ${error.message}`);
  }

  // Section 2.3: Return Response
  return res.status(200).json({
    status: 'success',
    data: contacts,
  });
}

// Section 3: POST Request Logic
async function handlePostRequest(req, res) {
  const { firstname, lastname, email, phone, jobtitle, notes, companyid } = req.body;

  // Section 3.1: Validate Input
  if (!firstname || !lastname || !email) {
    return res.status(400).json({
      error: 'Missing required fields: firstname, lastname, or email.',
    });
  }

  // Section 3.2: Insert New Contact
  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert([{ firstname, lastname, email, phone, jobtitle, notes, companyid }])
    .select();

  if (error) {
    throw new Error(`Error creating contact: ${error.message}`);
  }

  // Section 3.3: Return Response
  return res.status(201).json({
    status: 'success',
    data: newContact[0],
  });
}
