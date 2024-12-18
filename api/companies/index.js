import { supabase } from '../../utils/supabase.js';

// Helper to sanitize phone numbers to `XXX.XXX.XXXX` format
function sanitizePhone(phone) {
  // Remove all non-digit characters
  const digits = phone?.replace(/\D/g, '');

  // Format to `XXX.XXX.XXXX` if exactly 10 digits
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  // If the format cannot be applied, throw an error
  throw new Error('Invalid phone number format. Expected: XXX.XXX.XXXX');
}

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    // POST: Create a company
    if (req.method === 'POST') {
      const { name, city, state, zip, phone, country } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      // Sanitize and validate the phone number
      let sanitizedPhone;
      try {
        sanitizedPhone = sanitizePhone(phone);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // Clean up and filter input
      const insertData = Object.fromEntries(
        Object.entries({ 
          name, 
          city, 
          state, 
          zip, 
          phone: sanitizedPhone, // Use the sanitized phone number
          country 
        }).filter(([_, value]) => value !== undefined)
      );

      // Insert the company into the database
      const { data, error } = await supabase
        .from('companies')
        .insert([insertData])
        .select('*')
        .single();

      if (error) throw error;

      return res.status(201).json({ message: 'Company created successfully.', data });
    }

    // GET: Fetch companies and optionally include associated logs
    else if (req.method === 'GET') {
      const { id, includeLogs } = req.query;

      // Fetch logs associated with the company via the relationships table
      if (includeLogs && id) {
        const { data, error } = await supabase
          .from('relationships')
          .select('logentry_id, logentries (id, logtype, text, followup)')
          .eq('company_id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Logs retrieved successfully.', data });
      }

      // Retrieve all companies or a single company
      const { data, error } = id
        ? await supabase.from('companies').select('*').eq('id', id).single()
        : await supabase.from('companies').select('*');

      if (error) throw error;

      return res.status(200).json(data);
    }

    // PATCH: Update a company
    else if (req.method === 'PATCH') {
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      // Sanitize and validate the phone number
      let sanitizedPhone;
      try {
        sanitizedPhone = sanitizePhone(phone);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // Filter out undefined values from the payload
      const updateData = Object.fromEntries(
        Object.entries({ 
          name, 
          city, 
          state, 
          zip, 
          phone: sanitizedPhone, // Use the sanitized phone number
          country 
        }).filter(([_, value]) => value !== undefined)
      );

      // Update the company record
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({ message: 'Company updated successfully.', data });
    }

    // DELETE: Remove a company and cascade delete relationships
    else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      // Cascade delete any associated rows in the relationships table
      await supabase.from('relationships').delete().eq('company_id', id);

      // Delete the company
      const { error } = await supabase.from('companies').delete().eq('id', id);

      if (error) throw error;

      return res.status(204).end();
    }

    // Method Not Allowed
    else {
      res.setHeader('Allow', ['POST', 'PATCH', 'GET', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
