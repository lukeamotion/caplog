import { supabase } from '../../utils/supabase.js';

// Helper function for API key validation
function validateApiKey(req) {
  const apiKey = req.headers['authorization'];
  const validKey = process.env.OPENAI_KEY;

  if (apiKey !== `Bearer ${validKey}`) {
    throw new Error('Unauthorized: Invalid API Key');
  }
}

// Function to extract keywords from notes (excluding names/companies)
function extractKeywords(notes, contacts = [], companies = []) {
  const words = notes
    .split(/\s+/) // Split text into words
    .map((word) => word.replace(/[^\w]/g, '').toLowerCase()) // Remove punctuation
    .filter((word) => word.length > 2); // Exclude short words (e.g., a, is, to)

  const excludedWords = [...contacts, ...companies].map((entry) => entry.toLowerCase());
  return [...new Set(words.filter((word) => !excludedWords.includes(word)))];
}

// Function to infer logtype if not provided
function inferLogtype(notes) {
  const lowerNotes = notes.toLowerCase();
  if (lowerNotes.includes('email')) return 'Email';
  if (lowerNotes.includes('call')) return 'Call';
  if (lowerNotes.includes('meeting')) return 'Meeting';
  if (lowerNotes.includes('encounter')) return 'Encounter';
  if (lowerNotes.includes('note')) return 'Note';
  return 'Other'; // Default to 'Other'
}

export default async function handler(req, res) {
  try {
    // Validate API Key
    validateApiKey(req);

    // Handle GET requests
    if (req.method === 'GET') {
      const { id } = req.query;

      let query = supabase
        .from('logentries')
        .select(
          `
          id, logtype, keywords, notes, followup,
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
      let { logtype, keywords, followup = false, description, notes, contactids = [], companyids = [] } = req.body;

      // Validate notes (description can map to notes)
      const finalNotes = notes || description;
      if (!finalNotes) {
        return res.status(400).json({ error: 'The notes field is required.' });
      }

      // Infer logtype if not provided
      logtype = logtype || inferLogtype(finalNotes);

      // Extract keywords, excluding contacts and companies
      const contacts = contactids.map((id) => `Contact-${id}`); // Placeholder for contacts
      const companies = companyids.map((id) => `Company-${id}`);
      const extractedKeywords = extractKeywords(finalNotes, contacts, companies);
      if (!keywords || keywords.length === 0) {
        keywords = extractedKeywords;
      }

      if (keywords.length === 0) {
        return res.status(400).json({ error: 'At least one keyword must be included.' });
      }

      // Insert the main log entry
      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, notes: finalNotes, followup }])
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

      // Associate companies with the log entry
      if (companyids.length > 0) {
        const companyInserts = companyids.map((companyid) => ({
          logentryid,
          companyid,
        }));
        const { error: companyError } = await supabase
          .from('logentrycompanies')
          .insert(companyInserts);
        if (companyError) throw companyError;
      }

      return res.status(201).json({
        message: 'Log entry created successfully with associated contacts and companies.',
        logentryid,
        logtype,
        keywords,
      });

    // Handle PATCH requests
    } else if (req.method === 'PATCH') {
      const { id } = req.query;
      const { logtype, keywords, followup, notes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required.' });
      }

      const updates = {};
      if (logtype) updates.logtype = logtype;
      if (keywords) updates.keywords = keywords;
      if (followup !== undefined) updates.followup = followup;
      if (notes) updates.notes = notes;

      const { data, error } = await supabase
        .from('logentries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ message: 'Log entry updated successfully.', data });

    // Handle DELETE requests
    } else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required.' });
      }

      const { error } = await supabase.from('logentries').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('logentrycontacts').delete().eq('logentryid', id);
      await supabase.from('logentrycompanies').delete().eq('logentryid', id);

      return res.status(200).json({ message: `Log entry with ID ${id} deleted.` });

    // Handle unsupported methods
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
