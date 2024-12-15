import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { firstname, lastname, email, companyid } = req.body;

      // Validate required fields
      if (!firstname || !lastname || !email || !companyid) {
        return res
          .status(400)
          .json({ error: 'First name, last name, email, and companyid are required.' });
      }

      // Check for duplicate email
      const { data: existingContact, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', email)
        .single(); // Single ensures only one result is returned

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Handle unexpected Supabase errors
        throw fetchError;
      }

      if (existingContact) {
        return res
          .status(409)
          .json({ error: `A contact with the email "${email}" already exists.` });
      }

      // Insert new contact
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ firstname, lastname, email, companyid }]);
      if (error) throw error;

      // Return the created contact
      return res.status(201).json(data);
    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}