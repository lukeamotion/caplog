import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Initialize OpenAI
let openai;
try {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  openai = new OpenAIApi(configuration);
  console.log("OpenAI API initialized successfully.");
} catch (error) {
  console.error("Error initializing OpenAI API:", error);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { keyword, page = 1, limit = 10 } = req.query;
      let query = supabase.from('log_entries').select('*', { count: 'exact' });

      if (keyword) {
        query = query.contains('keywords', [keyword]);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Supabase GET error:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data, page, limit, total: count });
    } catch (err) {
      console.error("GET handler error:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    const { inputText } = req.body;
    if (!inputText) {
      console.error("No inputText provided in POST request");
      return res.status(400).json({ error: 'No input text provided.' });
    }

    if (!openai) {
      console.error("OpenAI instance is not initialized.");
      return res.status(500).json({ error: "OpenAI API is not initialized." });
    }

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

      console.log("Calling OpenAI API with prompt...");
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.2,
      });

      if (!response || !response.data || !response.data.choices || !response.data.choices[0]) {
        console.error("Unexpected OpenAI response format:", response);
        return res.status(500).json({ error: 'Unexpected response from OpenAI API.' });
      }

      console.log("OpenAI response received:", response.data);

      const parsed = JSON.parse(response.data.choices[0].message.content);
      console.log("Parsed JSON from OpenAI:", parsed);

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
      console.error("Catch block error in POST handler:", err);
      return res.status(500).json({ error: 'Error processing request.' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}