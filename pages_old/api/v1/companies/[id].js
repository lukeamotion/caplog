import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'PUT') {
    const { name, company_type, city, state, zip, plant_code, keywords } = req.body;
    const { data, error } = await supabase
      .from('companies')
      .update({ name, company_type, city, state, zip, plant_code, keywords })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'DELETE') {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Company deleted' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}