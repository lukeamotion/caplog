import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Contact ID is required.' });
  }

  try {
    // API Key Validation
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'PATCH') {
      // Update a specific contact
      const { firstname, lastname, email, phone } = req.body;

      if (!firstname && !lastname && !email && !phone) {
        return res.status(400).json({ error: 'At least one field must be provided for update.' });
      }

      const { data, error } = await supabase
        .from('contacts')
        .update({ firstname, lastname, email, phone })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Contact updated successfully.', data });

    } else if (req.method === 'DELETE') {
      // Delete a specific contact
      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: `Contact with ID ${id} deleted.` });

    } else {
      res.setHeader('Allow', ['PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts/[id] handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
