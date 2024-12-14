import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'PUT') {
    const { first_name, last_name, type, email, phone, company_id } = req.body;
    const { data, error } = await supabase
      .from('contacts')
      .update({ first_name, last_name, type, email, phone, company_id })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'DELETE') {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Contact deleted' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}