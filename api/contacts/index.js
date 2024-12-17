import { supabase } from '../../utils/supabase.js';

// Helper to infer company from private email domains
function inferCompanyFromEmail(email) {
  const privateDomains = {
    'microsoft.com': 'Microsoft',
    'google.com': 'Google',
    'netflix.com': 'Netflix',
    'hulu.com': 'Hulu'
  };

  const domain = email?.split('@')[1]?.toLowerCase();
  return privateDomains[domain] || null;
}

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      const { name, company, includeLogs } = req.query;

      if (includeLogs && id) {
        // Fetch logs linked to a specific contact
        const { data, error } = await supabase
          .from('logentrycontacts')
          .select('logentryid, logentries (id, logtype, text, followup)')
          .eq('contactid', id);

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

    } else if (req.method === 'POST') {
      let { name, firstname, lastname, email, companyid, company } = req.body;

      if (name && (!firstname || !lastname)) {
        const [first, ...lastParts] = name.split(' ');
        firstname = firstname || first;
        lastname = lastname || lastParts.join(' ');
      }

      // Infer company if not provided
      if (!companyid && !company && email) {
        company = inferCompanyFromEmail(email);
      }

      // Attempt to create or retrieve company if inferred
      if (!companyid && company) {
        const { data: existingCompany, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company)
          .single();

        if (existingCompany) {
          companyid = existingCompany.id;
        } else {
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert([{ name: company }])
            .select('id')
            .single();

          if (createError) throw createError;
          companyid = newCompany.id;
        }
      }

      // Create contact without requiring companyid
      if (!firstname || !lastname || !email) {
        return res.status(400).json({
          error: 'firstname, lastname, and email are required.',
        });
      }

      const contactData = { firstname, lastname, email };
      if (companyid) contactData.companyid = companyid;

      const { data, error } = await supabase.from('contacts').insert([contactData]);

      if (error) throw error;
      return res.status(201).json({ message: 'Contact created successfully.', data });

    } else if (req.method === 'PATCH') {
      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      const { firstname, lastname, email, phone, companyid } = req.body;

      const updateData = Object.fromEntries(
        Object.entries({ firstname, lastname, email, phone, companyid }).filter(
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

    } else if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      // Cascade delete from logentrycontacts
      await supabase.from('logentrycontacts').delete().eq('contactid', id);

      const { error } = await supabase.from('contacts').delete().eq('id', id);

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
