import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all data from the 'logentries' table
      const { data, error } = await supabase.from('logentries').select('*');
      if (error) throw error;

      // Return the data as JSON
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { logType, keywords, followup } = req.body;

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
    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return a 500 response
    console.error('Error in logentries handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}