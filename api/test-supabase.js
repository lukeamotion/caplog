import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // Attempt to fetch data from a known table (e.g., "companies")
  const { data, error } = await supabase.from('companies').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ data });
}