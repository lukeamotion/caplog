import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      const { name, company } = req.query;

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

      if (!company && email) {
        const domain = email.split('@')[1]?.split('.')[0];
        if (domain) {
          company = domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }

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

      if (!firstname || !lastname || !email || !companyid) {
        return res.status(400).json({
          error: 'firstname, lastname, email, and companyid are required.',
        });
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert([{ firstname, lastname, email, companyid }]);

      if (error) throw error;
      return res.status(201).json({ message: 'Contact created successfully.', data });

    } else if (req.method === 'PATCH') {
      if (!id) {
        return res.status(400).json({ error: 'Contact ID is required.' });
      }

      const { firstname, lastname, email, phone, companyid } = req.body;

      if (!firstname && !lastname && !email && !phone && !companyid) {
        return res
          .status(400)
          .json({ error: 'At least one field must be provided for update.' });
      }

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

      const { error } = await supabase.from('contacts').delete().eq('id', id);

      if (error) throw error;

      return res.status(204).end(); // No content on successful delete

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
