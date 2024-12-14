import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension is included

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all companies from the 'companies' table
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      // Return the data as JSON
      return res.status(200).json(data);
    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return an internal server error
    console.error('Error in companies handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}