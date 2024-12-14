import { supabase } from '../../utils/supabase.js'; // Use the correct import with .js extension

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch data from the 'contacts' table
      const { data, error } = await supabase.from('contacts').select('*');
      if (error) throw error;

      // Return the data as JSON
      return res.status(200).json(data);
    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log and return internal server error
    console.error('Error in contacts handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}