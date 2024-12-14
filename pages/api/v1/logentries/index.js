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
      // Simplified prompt to ensure predictable JSON output
      const prompt = `Return a JSON object: {"event_type":"Call","description":"Test event","contacts":[],"companies":[],"keywords":["test"],"follow_up":false,"event_time":"now"}`;

      console.log("About to call OpenAI");
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.2,
      });
      console.log("OpenAI response:", response.data);

      // Parse the JSON response from GPT
      const parsed = JSON.parse(response.data.choices[0].message.content);
      console.log("Parsed JSON:", parsed);

      // Insert the parsed data into the database
      const { data, error } = await supabase.from('log_entries').insert([{
        log_entry_datetime: parsed.event_time === 'now' ? new Date().toISOString() : parsed.event_time,
        log_type: parsed.event_type,
        keywords: parsed.keywords,
        follow_up: parsed.follow_up,
        description: parsed.description,
      }]);

      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("Insert success:", data);
      return res.status(201).json({ data });
    } catch (err) {
      console.error("Catch block error:", err);
      return res.status(500).json({ error: 'Error processing request.' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}