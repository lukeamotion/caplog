import { supabase } from '../../utils/supabase';
import { validateLogEntry } from '../../utils/validation';

export default async function handler(req, res) {
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

    res.status(200).json(data);
  } else if (req.method === 'POST') {
    try {
      const body = req.body;
      validateLogEntry(body);

      const { data, error } = await supabase.from('logentries').insert([body]);
      if (error) throw error;

      res.status(201).json(data);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}