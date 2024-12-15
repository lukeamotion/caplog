import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  const allowedStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  try {
    // Extract the API key from the Authorization header
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY; // Key stored in Vercel environment variables

    // Check if the API key is valid
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
      }

      // Validate state if provided
      if (state && !allowedStates.includes(state)) {
        return res.status(400).json({
          error: `Invalid state value: ${state}. Allowed values are: ${allowedStates.join(', ')}.`
        });
      }

      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, zip, phone, country }]);

      if (error) throw error;

      return res.status(201).json(data);

    } else if (req.method === 'PUT') {
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required for updates.' });
      }

      // Validate state if provided
      if (state && !allowedStates.includes(state)) {
        return res.status(400).json({
          error: `Invalid state value: ${state}. Allowed values are: ${allowedStates.join(', ')}.`
        });
      }

      const { data, error } = await supabase
        .from('companies')
        .update({ city, state, zip, phone, country })
        .eq('name', name);

      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'DELETE') {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required to delete a company.' });
      }

      const { data, error } = await supabase.from('companies').delete().eq('name', name);
      if (error) throw error;

      return res.status(200).json({ message: 'Company deleted successfully.', data });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
