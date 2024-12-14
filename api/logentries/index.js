import { supabase } from '../../utils/supabase';
import { validateLogEntry } from '../../utils/validation';

function convertToMeetingNotesFormat(entry) {
  return `
  Meeting Notes:
  - Date: ${entry.logeventtime || 'N/A'}
  - Keywords: ${entry.keywords?.join(', ') || 'None'}
  - Followup: ${entry.followup ? 'Yes' : 'No'}
  `;
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    // Debugging logic for missing environment variables
    return res.status(500).json({
      message: 'Missing environment variables',
      supabaseUrl: process.env.SUPABASE_URL || 'URL not found',
      supabaseKey: process.env.SUPABASE_KEY ? 'Key loaded' : 'Key not found',
    });
  }

  if (req.method === 'GET') {
    const { format, followup, limit = 1000, offset = 0 } = req.query;

    let query = supabase.from('logentries').select('*').range(offset, offset + limit - 1);
    if (followup) query = query.eq('followup', followup === 'true');

    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (format === 'meeting') {
      const formatted = data.map((entry) => convertToMeetingNotesFormat(entry));
      return res.status(200).send(formatted.join('\n\n'));
    }

    return res.status(200).json(data);
  } else if (req.method === 'POST') {
    try {
      const body = req.body;
      validateLogEntry(body);

      const { data, error } = await supabase.from('logentries').insert([body]);
      if (error) throw error;

      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}