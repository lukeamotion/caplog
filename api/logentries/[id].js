import { supabase } from '../../../utils/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query; // 'id' here refers to the dynamic route parameter

  console.log('Incoming request to [id].js');
  console.log('Request Method:', req.method);
  console.log('Request Query Parameters:', req.query);
  console.log('Request Body:', req.body);

  if (!id) {
    return res.status(400).json({ error: 'Log entry ID is required.' });
  }

  try {
    if (req.method === 'PATCH') {
      const { logtype, keywords, followup } = req.body;

      if (!logtype && !keywords && followup === undefined) {
        return res.status(400).json({ error: 'At least one field must be provided for update.' });
      }

      const { data, error } = await supabase
        .from('logentries')
        .update({ logtype, keywords, followup })
        .eq('logentryid', id); // Use the correct primary key column 'logentryid'

      if (error) throw error;

      return res.status(200).json({ message: `Log entry with ID ${id} updated successfully.`, data });
    } else if (req.method === 'DELETE') {
      const { data, error } = await supabase
        .from('logentries')
        .delete()
        .eq('logentryid', id); // Use 'logentryid' for deletion

      if (error) throw error;

      return res.status(200).json({ message: `Log entry with ID ${id} deleted successfully.`, data });
    } else {
      res.setHeader('Allow', ['PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in logentries/[id] handler:', error);
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
}