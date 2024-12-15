import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension

export default async function handler(req, res) {
  try {
    // Log request headers for debugging
    console.log('Request Headers:', req.headers);

    // Extract the API key from the Authorization header
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY; // Key stored in Vercel environment variables

    // Check if the API key is valid
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    // Handle GET requests
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('logentries').select('*');
      if (error) throw error;
      return res.status(200).json(data);

    // Handle POST requests
    } else if (req.method === 'POST') {
      const { logtype, keywords, followup } = req.body;

      if (!logtype || !keywords) {
        return res.status(400).json({ error: 'logtype and keywords are required.' });
      }

      const { data, error } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, followup }]);
      if (error) throw error;
      return res.status(201).json(data);

    // Handle PATCH requests
    } else if (req.method === 'PATCH') {
      const { id } = req.query; // Get the log entry ID from query params
      const { logtype, keywords, followup } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required.' });
      }

      const { data, error } = await supabase
        .from('logentries')
        .update({ logtype, keywords, followup })
        .eq('id', id); // Update the record where id matches
      if (error) throw error;
      return res.status(200).json(data);

    // Handle DELETE requests
    } else if (req.method === 'DELETE') {
      const { id } = req.query; // Get the log entry ID from query params

      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required.' });
      }

      const { data, error } = await supabase
        .from('logentries')
        .delete()
        .eq('id', id); // Delete the record where id matches
      if (error) throw error;
      return res.status(200).json({ message: `Log entry with ID ${id} deleted.` });

    // Handle unsupported HTTP methods
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return a 500 response
    console.error('Error in logentries handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
