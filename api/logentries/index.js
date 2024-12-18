import { supabase } from '../../utils/supabase.js';

// SECTION 1: Helper Functions
// 1.1 Validate Keywords
function validateKeywords(keywords, excludedWords = []) {
  if (!keywords || !Array.isArray(keywords)) return [];

  const invalidKeywords = keywords.filter((kw) => kw.includes(' '));
  if (invalidKeywords.length > 0) {
    throw new Error(
      `Keywords must be single words. Invalid keywords: ${invalidKeywords.join(', ')}`
    );
  }

  // Remove excluded words (e.g., names or company names)
  const lowerExcluded = excludedWords.map((word) => word.toLowerCase());
  return keywords.filter((kw) => !lowerExcluded.includes(kw.toLowerCase()));
}

// 1.2 Get Excluded Words
async function getExcludedWords(contactIds = [], companyIds = []) {
  const excludedWords = [];

  // 1.2a Fetch contact names
  if (contactIds.length > 0) {
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('firstname, lastname')
      .in('id', contactIds);

    if (contactError) throw new Error('Error retrieving contact names.');
    contacts.forEach(({ firstname, lastname }) => {
      if (firstname) excludedWords.push(firstname);
      if (lastname) excludedWords.push(lastname);
    });
  }

  // 1.2b Fetch company names
  if (companyIds.length > 0) {
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .in('id', companyIds);

    if (companyError) throw new Error('Error retrieving company names.');
    companies.forEach(({ name }) => {
      if (name) excludedWords.push(name);
    });
  }

  return excludedWords;
}

// 1.3 Validate Contact IDs
async function validateContactIds(contactIds) {
  if (!contactIds || contactIds.length === 0) return;

  const { data: validContacts, error } = await supabase
    .from('contacts')
    .select('id')
    .in('id', contactIds);

  if (error) {
    throw new Error('Error validating contact IDs.');
  }

  const validIds = validContacts.map((contact) => contact.id);
  const invalidIds = contactIds.filter((id) => !validIds.includes(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid contact IDs: ${invalidIds.join(', ')}`);
  }
}

// SECTION 2: API Handler
export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    // 2.1 Validate API Key
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    // 2.2 Handle GET Requests
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

    // 2.3 Handle POST Requests
    else if (req.method === 'POST') {
      let {
        logtype,
        keywords,
        followup = false,
        text,
        contactids = [],
        companyids = [],
      } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'The text field is required.' });
      }

      // 2.3a Validate Contact IDs
      try {
        await validateContactIds(contactids);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 2.3b Get Excluded Words for Keywords
      const excludedWords = await getExcludedWords(contactids, companyids);

      // 2.3c Validate and Clean Keywords
      try {
        keywords = validateKeywords(keywords, excludedWords);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 2.3d Insert Log Entry
      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, text, followup }])
        .select('id')
        .single();

      if (logError) throw logError;

      const logentry_id = logEntry.id;

      // 2.3e Insert Relationships
      const relationshipInserts = [
        ...contactids.map((contact_id) => ({ logentry_id, contact_id })),
        ...companyids.map((company_id) => ({ logentry_id, company_id })),
      ];

      if (relationshipInserts.length > 0) {
        const { error: relError } = await supabase.from('relationships').insert(relationshipInserts);
        if (relError) throw relError;
      }

      return res.status(201).json({ message: 'Log entry created successfully.', logentry_id });
    }

    // 2.4 Handle PATCH Requests
    else if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required for updates.' });
      }

      const { logtype, keywords, followup, text, contactids, companyids } = req.body;

      // 2.4a Validate Contact IDs
      if (contactids) {
        try {
          await validateContactIds(contactids);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }

      // 2.4b Get Excluded Words for Keywords
      const excludedWords = await getExcludedWords(contactids || [], companyids || []);

      // 2.4c Validate and Clean Keywords
      const updateFields = {};
      if (keywords) {
        try {
          updateFields.keywords = validateKeywords(keywords, excludedWords);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }
      if (logtype) updateFields.logtype = logtype;
      if (followup !== undefined) updateFields.followup = followup;
      if (text) updateFields.text = text;

      // 2.4d Update Log Entry
      const { error: updateError } = await supabase
        .from('logentries')
        .update(updateFields)
        .eq('id', id);

      if (updateError) throw updateError;

      // 2.4e Update Relationships
      await supabase.from('relationships').delete().eq('logentry_id', id);

      const relationshipInserts = [
        ...contactids.map((contact_id) => ({ logentry_id: id, contact_id })),
        ...companyids.map((company_id) => ({ logentry_id: id, company_id })),
      ];

      if (relationshipInserts.length > 0) {
        const { error: relError } = await supabase.from('relationships').insert(relationshipInserts);
        if (relError) throw relError;
      }

      return res.status(200).json({ message: `Log entry ${id} updated successfully.` });
    }

    // 2.5 Handle DELETE Requests
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required for deletion.' });
      }

      // Delete relationships and log entry
      await supabase.from('relationships').delete().eq('logentry_id', id);
      await supabase.from('logentries').delete().eq('id', id);

      return res.status(200).json({ message: `Log entry ${id} deleted successfully.` });
    }

    // 2.6 Handle Unsupported Methods
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
