import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
      }

      // Validate phone number
      if (phone) {
        if (!/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/.test(phone)) {
          if (phone.replace(/[^0-9]/g, '').length > 10) {
            return res.status(400).json({
              error: 'Phone number has too many digits. Please provide a valid 10-digit phone number or omit the phone field.',
            });
          } else {
            return res.status(400).json({
              error: 'Invalid phone format. Expected format: (555) 123-4567.',
            });
          }
        }
      }

      // Insert new company
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, zip, phone, country }]);
      if (error) throw error;

      return res.status(201).json(data);

    } else if (req.method === 'PUT') {
      const { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required for updates.' });
      }

      // Validate phone number
      if (phone) {
        if (!/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/.test(phone)) {
          if (phone.replace(/[^0-9]/g, '').length > 10) {
            return res.status(400).json({
              error: 'Phone number has too many digits. Please provide a valid 10-digit phone number or omit the phone field.',
            });
          } else {
            return res.status(400).json({
              error: 'Invalid phone format. Expected format: (555) 123-4567.',
            });
          }
        }
      }

      // Update company by name
      const { data, error } = await supabase
        .from('companies')
        .update({ city, state, zip, phone, country })
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