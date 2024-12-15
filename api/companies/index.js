import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all companies from the 'companies' table
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      const { name, city, state } = req.body;

      // Validate required fields
      if (!name || !city) {
        return res.status(400).json({ error: 'Name and city are required.' });
      }

      // Insert new company into the 'companies' table
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state }]);
      if (error) throw error;

      return res.status(201).json(data);

    } else if (req.method === 'PUT') {
      const { id, name, city, state } = req.body;

      // Validate required fields
      if (!id || !name || !city) {
        return res.status(400).json({ error: 'ID, name, and city are required for updates.' });
      }

      // Update company record
      const { data, error } = await supabase
        .from('companies')
        .update({ name, city, state })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'DELETE') {
      const { id } = req.body;

      // Validate required field
      if (!id) {
        return res.status(400).json({ error: 'ID is required to delete a company.' });
      }

      // Delete company record
      const { data, error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;

      return res.status(200).json({ message: 'Company deleted successfully.', data });

    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}