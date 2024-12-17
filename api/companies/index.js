import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'POST') {
      const { name, city, state, zip, phone, country } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      const insertData = Object.fromEntries(
        Object.entries({ name, city, state, zip, phone, country }).filter(
          ([_, value]) => value !== undefined
        )
      );

      const { data, error } = await supabase
        .from('companies')
        .insert([insertData])
        .select('*')
        .single();

      if (error) throw error;
      return res.status(201).json({ message: 'Company created successfully.', data });

    } else if (req.method === 'GET') {
      const { id, includeLogs } = req.query;

      if (includeLogs && id) {
        const { data, error } = await supabase
          .from('logentrycompanies')
          .select('logentryid, logentries (id, logtype, text, followup)')
          .eq('companyid', id);

        if (error) throw error;
        return res.status(200).json({ message: 'Logs retrieved successfully.', data });
      }

      const { data, error } = id
        ? await supabase.from('companies').select('*').eq('id', id).single()
        : await supabase.from('companies').select('*');

      if (error) throw error;
      return res.status(200).json(data);

    } else if (req.method === 'PATCH') {
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      const updateData = Object.fromEntries(
        Object.entries({ name, city, state, zip, phone, country }).filter(
          ([_, value]) => value !== undefined
        )
      );

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ message: 'Company updated successfully.', data });

    } else if (req.method === 'DELETE') {
      const { id } = req.query;

      // Cascade delete from logentrycompanies
      await supabase.from('logentrycompanies').delete().eq('companyid', id);

      const { error } = await supabase.from('companies').delete().eq('id', id);

      if (error) throw error;
      return res.status(204).end();

    } else {
      res.setHeader('Allow', ['POST', 'PATCH', 'GET', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
