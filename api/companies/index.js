import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all companies from the 'companies' table
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      const { name, code, city, state } = req.body;

      // Validate required fields
      if (!name || !code || !city) {
        return res.status(400).json({ error: 'Name, code, and city are required.' });
      }

      // Check for duplicate company code
      const { data: existingCompany, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('code', code)
        .single();

      if (existingCompany) {
        return res.status(409).json({ error: `A company with the code "${code}" already exists.` });
      }

      // Insert new company into the 'companies' table
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, code, city, state }]);

      if (error) throw error;

      return res.status(201).json(data);

    } else if (req.method === 'PUT') {
      const { id, name, code, city, state } = req.body;

      // Validate required fields
      if (!id || !name || !code || !city) {
        return res.status(400).json({ error: 'ID, name, code, and city are required for updates.' });
      }

      // Check for duplicate company code on update (excluding current ID)
      const { data: existingCompany, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('code', code)
        .neq('id', id)
        .single();

      if (existingCompany) {
        return res.status(409).json({ error: `A company with the code "${code}" already exists.` });
      }

      // Update company record
      const { data, error } = await supabase
        .from('companies')
        .update({ name, code, city, state })
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