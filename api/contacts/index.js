import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all data from the 'contacts' table
      const { data, error } = await supabase.from('contacts').select('*');
      if (error) throw error;

      // Return the data as JSON
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { firstname, lastname, email, companyid } = req.body;

      // Validate required fields
      if (!firstname || !lastname || !companyid) {
        return res
          .status(400)
          .json({ error: 'First name, last name, and companyid are required.' });
      }

      // Insert new contact into the 'contacts' table
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ firstname, lastname, email, companyid }]);
      if (error) throw error;

      // Return the created contact as JSON
      return res.status(201).json(data);
    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return a 500 response
    console.error('Error in contacts handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}