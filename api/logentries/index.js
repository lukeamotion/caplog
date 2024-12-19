import { handleErrors } from '../../utils/vercel/errorHandler'; // Error handling middleware
import authenticate from '../../utils/vercel/auth'; // Authentication middleware
import supabase from '../../utils/supabase'; // Supabase client

export default handleErrors(async function handler(req, res) {
  authenticate(req, res, async () => {
    const { method } = req;

    // Section 1: Method Handling
    switch (method) {
      case 'GET':
        // Section 1.1: Handle GET Request (Fetch Logs)
        return await handleGetRequest(req, res);
      case 'POST':
        // Section 1.2: Handle POST Request (Create Log Entry)
        return await handlePostRequest(req, res);
      default:
        // Section 1.3: Unsupported Method
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed.` });
    }
  });
});

// Section 2: GET Request Logic
async function handleGetRequest(req, res) {
  const { keywords, followup } = req.query;

  // Section 2.1: Build Query
  let query = supabase.from('logentries').select('*');

  if (keywords) {
    query = query.ilike('keywords', `%${keywords}%`); // Case-insensitive keyword filter
  }

  if (followup !== undefined) {
    query = query.eq('followup', followup === 'true'); // Filter by follow-up status
  }

  // Section 2.2: Execute Query
  const { data: logEntries, error } = await query;

  if (error) {
    throw new Error(`Error fetching log entries: ${error.message}`);
  }

  // Section 2.3: Return Response
  return res.status(200).json({
    status: 'success',
    data: logEntries,
  });
}

// Section 3: POST Request Logic
async function handlePostRequest(req, res) {
  const { logtype, keywords, text, followup, contactids, companyids } = req.body;

  // Section 3.1: Validate Input
  if (!logtype || !text || !keywords) {
    return res.status(400).json({
      error: 'Missing required fields: logtype, keywords, or text.',
    });
  }

  // Section 3.2: Insert Log Entry
  const { data: newLogEntry, error } = await supabase
    .from('logentries')
    .insert([{ logtype, text, followup }])
    .select();

  if (error) {
    throw new Error(`Error creating log entry: ${error.message}`);
  }

  // Section 3.3: Insert Keywords
  if (Array.isArray(keywords) && keywords.length > 0) {
    const keywordRecords = keywords.map((keyword) => ({
      logentry_id: newLogEntry[0].id,
      keyword,
    }));
    await supabase.from('logentry_keywords').insert(keywordRecords);
  }

  // Section 3.4: Handle Relationships
  const relationships = [];

  if (Array.isArray(contactids)) {
    contactids.forEach((contact_id) => {
      relationships.push({ logentry_id: newLogEntry[0].id, contact_id });
    });
  }

  if (Array.isArray(companyids)) {
    companyids.forEach((company_id) => {
      relationships.push({ logentry_id: newLogEntry[0].id, company_id });
    });
  }

  if (relationships.length > 0) {
    await supabase.from('relationships').insert(relationships);
  }

  // Section 3.5: Return Response
  return res.status(201).json({
    status: 'success',
    data: newLogEntry[0],
  });
}
