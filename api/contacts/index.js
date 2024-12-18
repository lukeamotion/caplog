import { supabase } from '../../utils/supabase.js';

// SECTION 1: Helper Functions

// 1.1 Infer company name from email domains
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

// 1.2 Sanitize phone numbers to `XXX.XXX.XXXX` format
function sanitizePhone(phone) {
  const digits = phone?.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  throw new Error('Invalid phone number format. Expected: XXX.XXX.XXXX');
}

// 1.3 Ensure company exists or create a new company
async function ensureCompanyExists(companyid, companyName) {
  if (!companyid && !companyName) return null;

  // 1.3a Validate existing company ID
  if (companyid) {
    const { data: existingCompany, error } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyid)
      .single();

    if (!error && existingCompany) return companyid;
  }

  // 1.3b Create a new company if company name is provided
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

// SECTION 2: API Handler
export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    // 2.1 Validate API key
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.query;

    // 2.2 Handle GET Requests
    if (req.method === 'GET') {
      const { name, company, includeLogs } = req.query;

      // 2.2a Include logs for a specific contact
      if (includeLogs && id) {
        const { data, error } = await supabase
          .from('relationships')
          .select('logentry_id, logentries (id, logtype, text, followup)')
          .eq('contact_id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Logs retrieved successfully.', data });
      }

      // 2.2b Fetch contacts by company
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

      // 2.2c Search contacts by name
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstname', `%${name || ''}%`);

      if (error) throw error;

      return res.status(200).json(data);
    }

    // 2.3 Handle POST Requests
    else if (req.method === 'POST') {
      let { name, firstname, lastname, email, phone, companyid, company } = req.body;

      // 2.3a Split name into first and last if needed
      if (name && (!firstname || !lastname)) {
        const [first, ...lastParts] = name.split(' ');
        firstname = firstname || first;
        lastname = lastname || lastParts.join(' ');
      }

      // 2.3b Validate required fields
      if (!firstname || !lastname || !email) {
        return res.status(400).json({
          error: 'firstname, lastname, and email are required.',
        });
      }

      // 2.3c Ensure company exists or create it
      try {
        companyid = await ensureCompanyExists(companyid, company);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 2.3d Sanitize phone number
      let sanitizedPhone;
      try {
        sanitizedPhone = sanitizePhone(phone);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 2.3e Create contact
      const contactData = { firstname, lastname, email, phone: sanitizedPhone, companyid };
      const { data, error } = await supabase.from('contacts').insert([contactData]);

      if (error) throw error;

      return res.status(201).json({ message: 'Contact created successfully.', data });
    }

    // 2.4 Handle PATCH Requests
    else if (req.method === 'PATCH') {
      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      const { firstname, lastname, email, phone, companyid } = req.body;

      // 2.4a Sanitize phone number
      let sanitizedPhone;
      if (phone) {
        try {
          sanitizedPhone = sanitizePhone(phone);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }

      // 2.4b Prepare updated data
      const updateData = Object.fromEntries(
        Object.entries({ firstname, lastname, email, phone: sanitizedPhone, companyid }).filter(
          ([_, value]) => value !== undefined
        )
      );

      // 2.4c Update contact
      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({ message: 'Contact updated successfully.', data });
    }

    // 2.5 Handle DELETE Requests
    else if (req.method === 'DELETE') {
      const { id, name } = req.query;

      // 2.5a Validate required ID or name
      if (!id && !name) {
        return res.status(400).json({ error: 'Contact ID or name is required for deletion.' });
      }

      // 2.5b Resolve contact ID from name if needed
      let contactIdToDelete = id;
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

      // 2.5c Cascade delete from relationships and contacts
      await supabase.from('relationships').delete().eq('contact_id', contactIdToDelete);
      const { error } = await supabase.from('contacts').delete().eq('id', contactIdToDelete);

      if (error) throw error;

      return res.status(204).end();
    }

    // 2.6 Handle Unsupported Methods
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
