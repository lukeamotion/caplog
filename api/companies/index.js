import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all data from the 'companies' table
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      // Return the data as JSON
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { name, city, state } = req.body;

      if (!name || !city) {
        return res.status(400).json({ error: 'Name and city are required.' });
      }

      // Insert new company into the 'companies' table
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state }]);
      if (error) throw error;

      // Return the created company as JSON
      return res.status(201).json(data);
    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return a 500 response
    console.error('Error in companies handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}