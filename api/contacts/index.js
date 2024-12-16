import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    // API Key Validation
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'GET') {
      const { name, company } = req.query;

      if (company) {
        // Look up companyid by company name
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company)
          .single();

        if (companyError || !companyData) {
          return res.status(400).json({
            error: `Company '${company}' not found. Please provide a valid company name.`,
          });
        }

        // Retrieve contacts for the found companyid
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('companyid', companyData.id);

        if (error) throw error;
        return res.status(200).json(data);
      }

      // Default behavior to retrieve all contacts or filter by name
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstname', `%${name || ''}%`); // Filters by name if provided
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      let { name, firstname, lastname, email, companyid, company } = req.body;

      // Split `name` into `firstname` and `lastname` if not already provided
      if (name && (!firstname || !lastname)) {
        const [first, ...lastParts] = name.split(' ');
        firstname = firstname || first;
        lastname = lastname || lastParts.join(' '); // Handles multi-part last names
      }

      // Infer company name from email domain if `company` is not provided
      if (!company && email) {
        const domain = email.split('@')[1]?.split('.')[0];
        if (domain) {
          company = domain.charAt(0).toUpperCase() + domain.slice(1); // Capitalize inferred company name
        }
      }

      // Check if company exists, and create it if not
      if (!companyid && company) {
        const { data: existingCompany, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company)
          .single();

        if (companyError && companyError.code !== 'PGRST116') {
          // Log unexpected errors while querying companies
          console.error('Error checking company:', companyError);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (existingCompany) {
          companyid = existingCompany.id;
        } else {
          // Create the company if it doesn't exist
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert([{ name: company }])
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating company:', createError);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          companyid = newCompany.id;
        }
      }

      // Ensure all required fields are present
      if (!firstname || !lastname || !email || !companyid) {
        return res.status(400).json({
          error: 'firstname, lastname, email, and companyid are required.',
        });
      }

      // Insert the contact into the database
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ firstname, lastname, email, companyid }]);

      if (error) {
        console.error('Error inserting contact:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      return res.status(201).json({ message: 'Contact created successfully.', data });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in contacts handler:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
