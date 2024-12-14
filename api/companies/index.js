import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json(data);
  } else if (req.method === 'POST') {
    const { code, name, city, state, zip, country, phone } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Code and Name are required.' });
    }

    const { data, error } = await supabase.from('companies').insert([{ code, name, city, state, zip, country, phone }]);
    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json(data);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}