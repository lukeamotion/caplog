import { supabase } from '../../utils/supabase.js';
import { extractAndValidateCompanies, createCompanyIfMissing } from './validateCompanies.js';

console.log('ENV OPENAI_KEY:', process.env.OPENAI_KEY);

// Helper function for API key validation
function validateApiKey(req) {
  const apiKey = req.headers['authorization']?.trim();
  const validKey = process.env.OPENAI_KEY;

  if (!apiKey || apiKey !== `Bearer ${validKey}`) {
    console.error(`Authorization failed: Received key "${apiKey}", Expected key "Bearer ${validKey}"`);
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

  const companyId = companyName ? await createCompanyIfMissing(companyName) : null;

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
      let { logtype, keywords, followup = false, text, contactids = [], companyids = [] } = req.body;

      keywords = validateKeywords(keywords);
      if (!text) return res.status(400).json({ error: 'The text field is required.' });

      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, text, followup }])
        .select('id')
        .single();

      if (logError) throw logError;

      const logentryid = logEntry.id;

      if (contactids.length > 0) {
        const contactInserts = contactids.map((contactid) => ({
          logentryid,
          contactid,
        }));
        await supabase.from('logentrycontacts').insert(contactInserts);
      }

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
      });
    }

    // PATCH: Update a log entry
    else if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Log entry ID is required for updates.' });

      const { logtype, keywords, followup, text, contactids, companyids } = req.body;

      const updateFields = {};
      if (logtype) updateFields.logtype = logtype;
      if (keywords) updateFields.keywords = validateKeywords(keywords);
      if (followup !== undefined) updateFields.followup = followup;
      if (text) updateFields.text = text;

      const { error: updateError } = await supabase
        .from('logentries')
        .update(updateFields)
        .eq('id', id);

      if (updateError) throw updateError;

      if (contactids) {
        await supabase.from('logentrycontacts').delete().eq('logentryid', id);
        const contactInserts = contactids.map((contactid) => ({
          logentryid: id,
          contactid,
        }));
        await supabase.from('logentrycontacts').insert(contactInserts);
      }

      if (companyids) {
        await supabase.from('logentrycompanies').delete().eq('logentryid', id);
        const companyInserts = companyids.map((companyid) => ({
          logentryid: id,
          companyid,
        }));
        await supabase.from('logentrycompanies').insert(companyInserts);
      }

      return res.status(200).json({ message: `Log entry ${id} updated successfully.` });
    }

    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Log entry ID is required for deletion.' });

      await supabase.from('logentrycontacts').delete().eq('logentryid', id);
      await supabase.from('logentrycompanies').delete().eq('logentryid', id);
      await supabase.from('logentries').delete().eq('id', id);

      return res.status(200).json({ message: `Log entry ${id} deleted successfully.` });
    }

    else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}