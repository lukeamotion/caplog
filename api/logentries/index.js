import { supabase } from '../../utils/supabase.js';
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

      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, text: finalText, followup }])
        .select('id')
        .single();

      if (logError) throw logError;

      const logentryid = logEntry.id;

      return res.status(201).json({
        message: 'Log entry created successfully.',
        logentryid,
        logtype,
        keywords,
      });
    }

    // DELETE: Bulk remove log entries
    else if (req.method === 'DELETE') {
      const { ids } = req.body; // Accept an array of IDs in the body
    
      // Validate input
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'An array of log entry IDs is required for deletion.' });
      }
    
      // Perform bulk deletion using Supabase's `in` method
      const { error } = await supabase
        .from('logentries')
        .delete()
        .in('id', ids);
    
      if (error) {
        console.error('Error deleting log entries:', error.message);
        return res.status(500).json({ error: 'Failed to delete log entries.' });
      }
    
      return res.status(200).json({ message: 'Log entries deleted successfully.' });
    }

    // Method not allowed
    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
