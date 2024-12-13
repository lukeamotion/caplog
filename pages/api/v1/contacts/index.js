import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { search } = req.query;
    let query = supabase.from('contacts').select('*');

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  } else if (req.method === 'POST') {
    const { first_name, last_name, type, email, phone, company_id } = req.body;
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ first_name, last_name, type, email, phone, company_id }]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ data });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}