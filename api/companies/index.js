import { supabase } from '../../utils/supabase.js';

// Allowed US states
const allowedStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helper function for API key validation
function validateApiKey(req) {
  const apiKey = req.headers['authorization'];
  const validKey = process.env.OPENAI_KEY;

  if (apiKey !== `Bearer ${validKey}`) {
    throw new Error('Unauthorized: Invalid API Key');
  }
}

export default async function handler(req, res) {
  try {
    // Validate API Key
    validateApiKey(req);

    if (req.method === 'GET') {
      // Retrieve all companies
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      // Insert a new company
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      if (state && !allowedStates.includes(state)) {
        return res.status(400).json({ error: `Invalid state value: ${state}.` });
      }

      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, zip, phone, country }]);
      if (error) throw error;

      return res.status(201).json({ message: 'Company created successfully.', data });

    } else if (req.method === 'PATCH') {
      // Update an existing company
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required for updates.' });
      }

      if (state && !allowedStates.includes(state)) {
        return res.status(400).json({ error: `Invalid state value: ${state}.` });
      }

      const { data, error } = await supabase
        .from('companies')
        .update({ city, state, zip, phone, country })
        .eq('name', name);
      if (error) throw error;

      return res.status(200).json({ message: 'Company updated successfully.', data });

    } else if (req.method === 'DELETE') {
      // Delete a company
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required for deletion.' });
      }

      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('name', name);
      if (error) throw error;

      return res.status(200).json({ message: 'Company deleted successfully.', data });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
