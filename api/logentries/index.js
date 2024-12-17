import { supabase } from '../../utils/supabase.js';
console.log('ENV OPENAI_KEY:', process.env.OPENAI_KEY);


// Helper function for API key validation
function validateApiKey(req) {
  const apiKey = req.headers['authorization'];
  const validKey = process.env.OPENAI_KEY;

  if (apiKey !== `Bearer ${validKey}`) {
    throw new Error('Unauthorized: Invalid API Key');
  }
}

// Function to extract keywords from text (excluding names/companies)
function extractKeywords(text, contacts = [], companies = []) {
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, '').toLowerCase())
    .filter((word) => word.length > 2);

  const excludedWords = [...contacts, ...companies].map((entry) => entry.toLowerCase());
  return [...new Set(words.filter((word) => !excludedWords.includes(word)))];
}

// Function to infer logtype if not provided
function inferLogtype(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('email')) return 'Email';
  if (lowerText.includes('call')) return 'Call';
  if (lowerText.includes('meeting')) return 'Meeting';
  if (lowerText.includes('encounter')) return 'Encounter';
  if (lowerText.includes('note')) return 'Note';
  return 'Other';
}

// Function to create or get a company
async function createOrGetCompany(companyName) {
  const { data: existingCompany, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('name', companyName)
    .single();

  if (companyError && companyError.code !== 'PGRST116') {
    console.error('Error checking company:', companyError.message);
    throw new Error('Error retrieving company information.');
  }

  if (existingCompany) return existingCompany.id;

  const { data: newCompany, error: createError } = await supabase
    .from('companies')
    .insert([{ name: companyName }])
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating company:', createError.message);
    throw new Error('Error creating company.');
  }

  return newCompany.id;
}

// Function to create or get a contact
async function createOrGetContact(fullName, email, companyName) {
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ');

  if (!lastName) {
    throw new Error(`Last name is required for contact: ${fullName}`);
  }

  const { data: existingContact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('firstname', firstName)
    .eq('lastname', lastName)
    .single();

  if (contactError && contactError.code !== 'PGRST116') {
    console.error('Error checking contact:', contactError.message);
    throw new Error('Error retrieving contact information.');
  }

  if (existingContact) return existingContact.id;

  const companyId = companyName ? await createOrGetCompany(companyName) : null;

  const { data: newContact, error: createError } = await supabase
    .from('contacts')
    .insert([{ firstname: firstName, lastname: lastName, email, companyid: companyId }])
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating contact:', createError.message);
    throw new Error('Error creating contact.');
  }

  return newContact.id;
}

export default async function handler(req, res) {
  try {
    validateApiKey(req);
    if (req.method === 'GET') {
      const { id } = req.query;
    
      let query = supabase
      .from('logentries')
      .select(`
        id, logtype, keywords, text, followup,
        logentrycontacts ( contactid, contacts ( firstname, lastname, email ) ),
        logentrycompanies ( companyid, companies ( name, city, state, zip ) )
      `);    
    
      if (id) query = query.eq('id', id);
    
      const { data, error } = await query;
      if (error) throw error;
    
      return res.status(200).json(data);
    }
      

    // POST: Create a log entry
    else if (req.method === 'POST') {
      let { logtype, keywords, followup = false, description, text, contactids = [], companyids = [], contacts = [], companies = [] } = req.body;

      const finalText = text || description;
      if (!finalText) {
        return res.status(400).json({ error: 'The text field is required.' });
      }

      logtype = logtype || inferLogtype(finalText);

      // Process contacts
      if (contacts.length > 0) {
        for (const contact of contacts) {
          const { fullName, email, companyName } = contact;
          const contactId = await createOrGetContact(fullName, email, companyName);
          contactids.push(contactId);
        }
      }

      // Process companies
      if (companies.length > 0) {
        for (const companyName of companies) {
          const companyId = await createOrGetCompany(companyName);
          companyids.push(companyId);
        }
      }

      // Insert main log entry
      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, text: finalText, followup }])
        .select('id')
        .single();

      if (logError) throw logError;

      const logentryid = logEntry.id;

      // Associate contacts if any
      if (contactids.length > 0) {
        const contactInserts = contactids.map((contactid) => ({
          logentryid,
          contactid,
        }));
        await supabase.from('logentrycontacts').insert(contactInserts);
      }

      // Associate companies if any
      if (companyids.length > 0) {
        const companyInserts = companyids.map((companyid) => ({
          logentryid,
          companyid,
        }));
        await supabase.from('logentrycompanies').insert(companyInserts);
      }

      return res.status(201).json({
        message: 'Log entry created successfully.',
        logentryid,
        logtype,
        keywords,
      });
    }

    // Method not allowed
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
