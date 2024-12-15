import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension

export default async function handler(req, res) {
  try {
    // Extract the API key from the Authorization header
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY; // Key stored in Vercel environment variables

    // Check if the API key is valid
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    // Handle GET requests
    if (req.method === 'GET') {
      // Fetch all data from the 'logentries' table
      const { data, error } = await supabase.from('logentries').select('*');
      if (error) throw error;

      // Return the data as JSON
      return res.status(200).json(data);

    // Handle POST requests
    } else if (req.method === 'POST') {
      const { logType, keywords, followup } = req.body;

      // Validate required fields
      if (!logType || !keywords) {
        return res.status(400).json({ error: 'logType and keywords are required.' });
      }

      // Insert new log entry into the 'logentries' table
      const { data, error } = await supabase
        .from('logentries')
        .insert([{ logType, keywords, followup }]);
      if (error) throw error;

      // Return the created log entry as JSON
      return res.status(201).json(data);

    // Handle unsupported HTTP methods
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return a 500 response
    console.error('Error in logentries handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
