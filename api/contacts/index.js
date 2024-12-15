import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    // API Key Validation
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('contacts').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { firstname, lastname, email, companyid } = req.body;

      if (!firstname || !lastname || !email || !companyid) {
        return res.status(400).json({
          error: 'firstname, lastname, email, and companyid are required.',
        });
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert([{ firstname, lastname, email, companyid }]);
      if (error) throw error;

      return res.status(201).json(data);
    } else if (req.method === 'PATCH') {
      const { id } = req.query;
      const { firstname, lastname, email } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      const { data, error } = await supabase
        .from('contacts')
        .update({ firstname, lastname, email })
        .eq('id', id);
      if (error) throw error;

      return res.status(200).json(data);
    } else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;

      return res.status(200).json({ message: `Contact with ID ${id} deleted.` });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
