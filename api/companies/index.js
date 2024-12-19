import { handleErrors } from '../../vercel/errorHandler'; // Error handling middleware
import authenticate from '../../vercel/auth'; // Authentication middleware
import supabase from '../../utils/supabaseClient'; // Supabase client

export default handleErrors(async function handler(req, res) {
  authenticate(req, res, async () => {
    const { method } = req;

    // Section 1: Method Handling
    switch (method) {
      case 'GET':
        // Section 1.1: Handle GET Request (Fetch Companies)
        return await handleGetRequest(req, res);
      case 'POST':
        // Section 1.2: Handle POST Request (Create Company)
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
  const { name, city, state } = req.query;

  // Section 2.1: Build Query
  let query = supabase.from('companies').select('*');

  if (name) query = query.ilike('name', `%${name}%`); // Filter by company name
  if (city) query = query.eq('city', city); // Filter by city
  if (state) query = query.eq('state', state); // Filter by state

  // Section 2.2: Execute Query
  const { data: companies, error } = await query;

  if (error) {
    throw new Error(`Error fetching companies: ${error.message}`);
  }

  // Section 2.3: Return Response
  return res.status(200).json({
    status: 'success',
    data: companies,
  });
}

// Section 3: POST Request Logic
async function handlePostRequest(req, res) {
  const { name, city, state, zip, country, phone, notes } = req.body;

  // Section 3.1: Validate Input
  if (!name || !city || !state || !country) {
    return res.status(400).json({
      error: 'Missing required fields: name, city, state, or country.',
    });
  }

  // Section 3.2: Insert New Company
  const { data: newCompany, error } = await supabase
    .from('companies')
    .insert([{ name, city, state, zip, country, phone, notes }])
    .select();

  if (error) {
    throw new Error(`Error creating company: ${error.message}`);
  }

  // Section 3.3: Return Response
  return res.status(201).json({
    status: 'success',
    data: newCompany[0],
  });
}
