import { supabase } from '../../utils/supabase.js';
import { extractAndValidateCompanies, createCompanyIfMissing } from './validateCompanies.js';

console.log('ENV OPENAI_KEY:', process.env.OPENAI_KEY);

function validateApiKey(req) {
  const apiKey = req.headers['authorization']?.trim();
  const validKey = process.env.OPENAI_KEY;

  if (!apiKey || apiKey !== `Bearer ${validKey}`) {
    throw new Error('Unauthorized: Invalid API Key');
  }
}

function validateKeywords(keywords) {
  if (!keywords || !Array.isArray(keywords)) return [];
  const invalidKeywords = keywords.filter((kw) => kw.includes(" "));
  if (invalidKeywords.length > 0) {
    throw new Error(`Keywords must be single words. Invalid keywords: ${invalidKeywords.join(", ")}`);
  }
  return keywords;
}

export default async function handler(req, res) {
  try {
    validateApiKey(req);

    // GET: Fetch log entries with relationships
    if (req.method === 'GET') {
      const { id } = req.query;

      let query = supabase
        .from('logentries')
        .select(`
          id, logtype, keywords, text, followup,
          relationships ( contact_id, company_id, contacts ( firstname, lastname, email ), companies ( name, city, state, zip ) )
        `);

      if (id) query = query.eq('id', id);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data);
    }

    // POST: Create a log entry and relationships
    else if (req.method === 'POST') {
      let { logtype, keywords, followup = false, text, contactids = [], companyids = [] } = req.body;

      keywords = validateKeywords(keywords);
      if (!text) return res.status(400).json({ error: 'The text field is required.' });

      // Step 1: Insert the log entry
      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, text, followup }])
        .select('id')
        .single();

      if (logError) throw logError;
      const logentry_id = logEntry.id;

      // Step 2: Insert relationships
      const relationshipInserts = [
        ...contactids.map(contact_id => ({ logentry_id, contact_id })),
        ...companyids.map(company_id => ({ logentry_id, company_id }))
      ];

      if (relationshipInserts.length > 0) {
        const { error: relError } = await supabase.from('relationships').insert(relationshipInserts);
        if (relError) throw relError;
      }

      return res.status(201).json({ message: 'Log entry created successfully.', logentry_id });
    }

    // PATCH: Update log entry and relationships
    else if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Log entry ID is required for updates.' });

      const { logtype, keywords, followup, text, contactids = [], companyids = [] } = req.body;

      const updateFields = {};
      if (logtype) updateFields.logtype = logtype;
      if (keywords) updateFields.keywords = validateKeywords(keywords);
      if (followup !== undefined) updateFields.followup = followup;
      if (text) updateFields.text = text;

      // Step 1: Update logentry fields
      const { error: updateError } = await supabase
        .from('logentries')
        .update(updateFields)
        .eq('id', id);

      if (updateError) throw updateError;

      // Step 2: Update relationships
      await supabase.from('relationships').delete().eq('logentry_id', id);

      const relationshipInserts = [
        ...contactids.map(contact_id => ({ logentry_id: id, contact_id })),
        ...companyids.map(company_id => ({ logentry_id: id, company_id }))
      ];

      if (relationshipInserts.length > 0) {
        const { error: relError } = await supabase.from('relationships').insert(relationshipInserts);
        if (relError) throw relError;
      }

      return res.status(200).json({ message: `Log entry ${id} updated successfully.` });
    }

    // DELETE: Remove log entry and relationships
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Log entry ID is required for deletion.' });

      await supabase.from('relationships').delete().eq('logentry_id', id);
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
