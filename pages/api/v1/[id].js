import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('log_entries').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'PUT') {
    const { log_type, keywords, follow_up, description } = req.body;
    const { data, error } = await supabase
      .from('log_entries')
      .update({ log_type, keywords, follow_up, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'DELETE') {
    const { error } = await supabase.from('log_entries').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Log entry deleted' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}