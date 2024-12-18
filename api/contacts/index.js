import { supabase } from '../../utils/supabase.js';

// Helper to infer company from private email domains
function inferCompanyFromEmail(email) {
  const privateDomains = {
    'microsoft.com': 'Microsoft',
    'google.com': 'Google',
    'netflix.com': 'Netflix',
    'hulu.com': 'Hulu',
  };

  const domain = email?.split('@')[1]?.toLowerCase();
  return privateDomains[domain] || null;
}

// Helper to sanitize phone numbers to `XXX.XXX.XXXX` format
function sanitizePhone(phone) {
  const digits = phone?.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  throw new Error('Invalid phone number format. Expected: XXX.XXX.XXXX');
}

// Ensure companyid exists or create a new company
async function ensureCompanyExists(companyid, companyName) {
  if (!companyid && !companyName) return null;

  if (companyid) {
    const { data: existingCompany, error } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyid)
      .single();

    if (!error && existingCompany) return companyid;
  }

  if (companyName) {
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert([{ name: companyName }])
      .select('id')
      .single();

    if (createError) throw createError;

    return newCompany.id;
  }

  throw new Error('Invalid companyid and no company name provided.');
}

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.query;

    // GET Method: Fetch contacts with optional logs
    if (req.method === 'GET') {
      const { name, company, includeLogs } = req.query;

      if (includeLogs && id) {
        const { data, error } = await supabase
          .from('relationships')
          .select('logentry_id, logentries (id, logtype, text, followup)')
          .eq('contact_id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Logs retrieved successfully.', data });
      }

      if (company) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company)
          .single();

        if (companyError || !companyData) {
          return res.status(400).json({
            error: `Company '${company}' not found.`,
          });
        }

        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('companyid', companyData.id);

        if (error) throw error;

        return res.status(200).json(data);
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstname', `%${name || ''}%`);

      if (error) throw error;

      return res.status(200).json(data);
    }

    // POST Method: Create a contact
    else if (req.method === 'POST') {
      let { name, firstname, lastname, email, phone, companyid, company } = req.body;

      if (name && (!firstname || !lastname)) {
        const [first, ...lastParts] = name.split(' ');
        firstname = firstname || first;
        lastname = lastname || lastParts.join(' ');
      }

      if (!firstname || !lastname || !email) {
        return res.status(400).json({
          error: 'firstname, lastname, and email are required.',
        });
      }

      // Ensure the company exists or create it if missing
      try {
        companyid = await ensureCompanyExists(companyid, company);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // Sanitize phone number
      let sanitizedPhone;
      try {
        sanitizedPhone = sanitizePhone(phone);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // Create contact
      const contactData = { firstname, lastname, email, phone: sanitizedPhone, companyid };
      const { data, error } = await supabase.from('contacts').insert([contactData]);

      if (error) throw error;

      return res.status(201).json({ message: 'Contact created successfully.', data });
    }

    // PATCH Method: Update a contact
    else if (req.method === 'PATCH') {
      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      const { firstname, lastname, email, phone, companyid } = req.body;

      let sanitizedPhone;
      if (phone) {
        try {
          sanitizedPhone = sanitizePhone(phone);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }

      const updateData = Object.fromEntries(
        Object.entries({ firstname, lastname, email, phone: sanitizedPhone, companyid }).filter(
          ([_, value]) => value !== undefined
        )
      );

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({ message: 'Contact updated successfully.', data });
    }

    // DELETE Method: Delete a contact by ID or name
    else if (req.method === 'DELETE') {
      const { id, name } = req.query;

      if (!id && !name) {
        return res.status(400).json({ error: 'Contact ID or name is required for deletion.' });
      }

      let contactIdToDelete = id;

      // If name is provided, find the contact ID
      if (name && !id) {
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        const { data: contactData, error: searchError } = await supabase
          .from('contacts')
          .select('id')
          .eq('firstname', firstName)
          .eq('lastname', lastName)
          .single();

        if (searchError || !contactData) {
          return res.status(404).json({ error: `Contact '${name}' not found.` });
        }

        contactIdToDelete = contactData.id;
      }

      // Cascade delete from relationships table
      await supabase.from('relationships').delete().eq('contact_id', contactIdToDelete);

      // Delete the contact
      const { error } = await supabase.from('contacts').delete().eq('id', contactIdToDelete);

      if (error) throw error;

      return res.status(204).end();
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}