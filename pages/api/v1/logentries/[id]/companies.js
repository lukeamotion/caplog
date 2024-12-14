import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { id } = req.query; // log_entry_id

  if (req.method === 'POST') {
    const { company_id } = req.body;
    if (!company_id) return res.status(400).json({ error: 'No company_id provided.' });

    const { data, error } = await supabase
      .from('log_entry_companies')
      .insert([{ log_entry_id: id, company_id }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ data, message: 'Company added to log entry' });
  } else if (req.method === 'DELETE') {
    const { company_id } = req.body;
    if (!company_id) return res.status(400).json({ error: 'No company_id provided.' });

    const { error } = await supabase
      .from('log_entry_companies')
      .delete()
      .match({ log_entry_id: id, company_id });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Company removed from log entry' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}