import { createClient } from '@supabase/supabase-js';
// import { Configuration, OpenAIApi } from 'openai'; // Temporarily commented out

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
// const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { keyword, page = 1, limit = 10 } = req.query;
    let query = supabase.from('log_entries').select('*', { count: 'exact' });

    if (keyword) {
      query = query.contains('keywords', [keyword]);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ data, page, limit, total: count });
  } else if (req.method === 'POST') {
    // Temporarily skipping GPT logic. Just return a success response.
    // This confirms that the POST endpoint is working at a basic level.
    return res.status(200).json({ message: 'POST endpoint reached successfully.' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}