import { supabase } from '../../utils/supabase.js';

// Helper function for API key validation
function validateApiKey(req) {
  const apiKey = req.headers['authorization'];
  const validKey = process.env.OPENAI_KEY;

  if (apiKey !== `Bearer ${validKey}`) {
    throw new Error('Unauthorized: Invalid API Key');
  }
}

// Validate keywords
function validateKeywords(keywords) {
  if (!keywords || !Array.isArray(keywords)) return [];

  const invalidKeywords = keywords.filter((kw) => kw.includes(" "));
  if (invalidKeywords.length > 0) {
    throw new Error(
      `Keywords must be single words. Invalid keywords: ${invalidKeywords.join(", ")}`
    );
  }

  return keywords;
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

// Function to infer company name from email
function inferCompanyFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.split('.')[0];
  return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : null;
}

// Function to create a company if it doesn't exist
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

  if (existingCompany) {
    return existingCompany.id;
  }

  // Create the company
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

// Function to create a contact if it doesn't exist
async function createOrGetContact(fullName, email, companyName) {
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ');

  if (!lastName) {
    throw new Error(`Last name is required for contact: ${fullName}`);
  }

  // Check if contact exists
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

  if (existingContact) {
    return existingContact.id;
  }

  // Infer company from email if not provided
  const inferredCompany = companyName || (email ? inferCompanyFromEmail(email) : null);
  const companyId = inferredCompany ? await createOrGetCompany(inferredCompany) : null;

  // Create the contact
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

    // Handle GET requests
    if (req.method === 'GET') {
      const { id } = req.query;

      let query = supabase
        .from('logentries')
        .select(
          `
          id, logtype, keywords, text, followup,
          logentrycontacts ( contactid, contacts ( firstname, lastname, email ) ),
          logentrycompanies ( companyid, companies ( name, city, state, zip ) )
          `
        );

      if (id) {
        query = query.eq('id', id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);

    // Handle POST requests
    } else if (req.method === 'POST') {
      let { logtype, keywords, followup = false, description, text, contactids = [], companyids = [], contacts = [] } = req.body;

// Validate keywords
try {
  keywords = validateKeywords(keywords);
} catch (validationError) {
  return res.status(400).json({ error: validationError.message });
}
      const finalText = text || description;
      if (!finalText) {
        return res.status(400).json({ error: 'The text field is required.' });
      }

      logtype = logtype || inferLogtype(finalText);

      // Process contacts and companies
      for (const contact of contacts) {
        const { fullName, email, companyName } = contact;
        const contactId = await createOrGetContact(fullName, email, companyName);
        contactids.push(contactId);
      }

      // Insert the main log entry
      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, text: finalText, followup }])
        .select('id')
        .single();

      if (logError) throw logError;

      const logentryid = logEntry.id;

      // Associate contacts with the log entry
      if (contactids.length > 0) {
        const contactInserts = contactids.map((contactid) => ({
          logentryid,
          contactid,
        }));
        const { error: contactError } = await supabase
          .from('logentrycontacts')
          .insert(contactInserts);
        if (contactError) throw contactError;
      }

      return res.status(201).json({
        message: 'Log entry created successfully with associated contacts.',
        logentryid,
        logtype,
        keywords,
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}