import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { name, city, state, address = null, phone = null, email = null } = req.body;

      if (!name || !city || !state) {
        return res.status(400).json({ error: 'Name, city, and state are required.' });
      }

      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, address, phone, email }]);

      if (error) throw error;

      return res.status(201).json(data);
    } else if (req.method === 'PUT') {
      const { name, city, state, address = null, phone = null, email = null } = req.body;

      // Validate required fields
      if (!name || !city || !state) {
        return res.status(400).json({
          error: 'Name, city, and state are required for updates.',
        });
      }

      // Update company record by name
      const { data, error } = await supabase
        .from('companies')
        .update({ city, state, address, phone, email })
        .eq('name', name); // Use 'name' to locate the company

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