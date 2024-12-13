import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

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
    const { inputText } = req.body;
    if (!inputText) return res.status(400).json({ error: 'No input text provided.' });

    try {
      const prompt = `
You are a parser that extracts details from an input text for a logging system.
Extract and return JSON with:
- event_type: string
- description: string
- contacts: array of contact names
- companies: array of company names
- keywords: array of keywords
- follow_up: boolean
- event_time: string in ISO format or 'now' if not specified

Text: "${inputText}"
`;

      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo for broader availability
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.2,
      });

      // Parse the JSON response from GPT
      const parsed = JSON.parse(response.data.choices[0].message.content);

      // Insert the parsed data into the database
      const { data, error } = await supabase.from('log_entries').insert([{
        log_entry_datetime: parsed.event_time === 'now' ? new Date().toISOString() : parsed.event_time,
        log_type: parsed.event_type,
        keywords: parsed.keywords,
        follow_up: parsed.follow_up,
        description: parsed.description,
      }]);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error processing request.' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}