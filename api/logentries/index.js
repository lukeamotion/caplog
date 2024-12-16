import { supabase } from '../../utils/supabase.js'; // Ensure the .js extension

export default async function handler(req, res) {
  try {
    // Log request headers for debugging
    console.log('Request Headers:', req.headers);

    // Extract the API key from the Authorization header
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY; // Key stored in Vercel environment variables

    // Check if the API key is valid
    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

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
        query = query.eq('id', id); // Filter by specific log entry ID if provided
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);

    // Handle POST requests
    } else if (req.method === 'POST') {
      const { logtype, keywords, followup, notes, contactids = [], companyids = [] } = req.body;

      if (!logtype || !keywords || !notes) {
        return res.status(400).json({ error: 'logtype, keywords, and notes are required.' });
      }

      // Insert the main log entry with full text (notes)
      const { data: logEntry, error: logError } = await supabase
        .from('logentries')
        .insert([{ logtype, keywords, notes, followup }])
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
      });

    // Handle PATCH requests
    } else if (req.method === 'PATCH') {
      const { id } = req.query; // Get the log entry ID from query params
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
        .eq('id', id); // Update the record where id matches

      if (error) throw error;
      return res.status(200).json({ message: 'Log entry updated successfully.', data });

    // Handle DELETE requests
    } else if (req.method === 'DELETE') {
      const { id } = req.query; // Get the log entry ID from query params

      if (!id) {
        return res.status(400).json({ error: 'Log entry ID is required.' });
      }

      // Delete the record from logentries
      const { data, error } = await supabase
        .from('logentries')
        .delete()
        .eq('id', id); // Delete the record where id matches

      if (error) throw error;

      // Clean up related records in join tables
      await supabase.from('logentrycontacts').delete().eq('logentryid', id);
      await supabase.from('logentrycompanies').delete().eq('logentryid', id);

      return res.status(200).json({ message: `Log entry with ID ${id} deleted.` });

    // Handle unsupported HTTP methods
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Log error details and return a 500 response
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
