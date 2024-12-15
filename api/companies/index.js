import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all companies
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
      }

      // Format and validate phone number
      const formattedPhone = formatPhone(phone);

      // Insert new company
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, zip, phone: formattedPhone, country }]);

      if (error) throw error;

      return res.status(201).json(data);

    } else if (req.method === 'PUT') {
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required for updates.' });
      }

      // Format and validate phone number
      const formattedPhone = formatPhone(phone);

      // Update company by name
      const { data, error } = await supabase
        .from('companies')
        .update({ city, state, zip, phone: formattedPhone, country })
        .eq('name', name);

      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'DELETE') {
      const { name } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required to delete a company.' });
      }

      // Delete company by name
      const { data, error } = await supabase.from('companies').delete().eq('name', name);
      if (error) throw error;

      return res.status(200).json({ message: 'Company deleted successfully.', data });

    } else {
      // Handle unsupported HTTP methods
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Utility function to format and validate phone numbers
function formatPhone(phone) {
  if (!phone) return null; // Allow null or empty phone numbers
  const numericPhone = phone.replace(/[^0-9]/g, ''); // Strip non-numeric characters
  if (numericPhone.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits.');
  }
  return `${numericPhone.slice(0, 3)}.${numericPhone.slice(3, 6)}.${numericPhone.slice(6)}`;
}