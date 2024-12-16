import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'POST') {
      // Create a new company
      const { name, city, state, zip, phone, country } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      // Insert company into the database
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, zip, phone, country }])
        .select('id')
        .single();

      if (error) throw error;

      return res.status(201).json({ message: 'Company created successfully.', data });

    } else if (req.method === 'PATCH') {
      // Update a specific company
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      if (!name && !city && !state && !zip && !phone && !country) {
        return res.status(400).json({ error: 'At least one field must be provided for update.' });
      }

      const { data, error } = await supabase
        .from('companies')
        .update({ name, city, state, zip, phone, country })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Company updated successfully.', data });

    } else if (req.method === 'DELETE') {
      // Delete a specific company
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Company deleted successfully.', data });

    } else {
      res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}