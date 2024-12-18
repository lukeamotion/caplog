import { supabase } from '../../utils/supabase.js';

// SECTION 1: Helper Functions

// 1.1 Sanitize phone numbers to `XXX.XXX.XXXX` format
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

// SECTION 2: API Handler
export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    // 2.1 Validate API key
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    // 2.2 Handle POST Requests
    if (req.method === 'POST') {
      const { name, city, state, zip, phone, country } = req.body;

      // 2.2a Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      // 2.2b Sanitize and validate the phone number
      let sanitizedPhone;
      try {
        sanitizedPhone = sanitizePhone(phone);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 2.2c Prepare data for insertion
      const insertData = Object.fromEntries(
        Object.entries({
          name,
          city,
          state,
          zip,
          phone: sanitizedPhone, // Use the sanitized phone number
          country,
        }).filter(([_, value]) => value !== undefined)
      );

      // 2.2d Insert company into the database
      const { data, error } = await supabase
        .from('companies')
        .insert([insertData])
        .select('*')
        .single();

      if (error) throw error;

      return res.status(201).json({ message: 'Company created successfully.', data });
    }

    // 2.3 Handle GET Requests
    else if (req.method === 'GET') {
      const { id, includeLogs } = req.query;

      // 2.3a Fetch logs associated with the company
      if (includeLogs && id) {
        const { data, error } = await supabase
          .from('relationships')
          .select('logentry_id, logentries (id, logtype, text, followup)')
          .eq('company_id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Logs retrieved successfully.', data });
      }

      // 2.3b Retrieve all companies or a single company
      const { data, error } = id
        ? await supabase.from('companies').select('*').eq('id', id).single()
        : await supabase.from('companies').select('*');

      if (error) throw error;

      return res.status(200).json(data);
    }

    // 2.4 Handle PATCH Requests
    else if (req.method === 'PATCH') {
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      // 2.4a Validate required fields
      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      // 2.4b Sanitize and validate the phone number
      let sanitizedPhone;
      try {
        sanitizedPhone = sanitizePhone(phone);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 2.4c Prepare data for update
      const updateData = Object.fromEntries(
        Object.entries({
          name,
          city,
          state,
          zip,
          phone: sanitizedPhone, // Use the sanitized phone number
          country,
        }).filter(([_, value]) => value !== undefined)
      );

      // 2.4d Update the company record
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({ message: 'Company updated successfully.', data });
    }

    // 2.5 Handle DELETE Requests
    else if (req.method === 'DELETE') {
      const { id } = req.query;

      // 2.5a Validate required fields
      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      // 2.5b Cascade delete from relationships and companies table
      await supabase.from('relationships').delete().eq('company_id', id);
      const { error } = await supabase.from('companies').delete().eq('id', id);

      if (error) throw error;

      return res.status(204).end();
    }

    // 2.6 Handle Unsupported Methods
    else {
      res.setHeader('Allow', ['POST', 'PATCH', 'GET', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
