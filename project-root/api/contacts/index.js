import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { companyid } = req.query;

    let query = supabase.from('contacts').select('*');
    if (companyid) query = query.eq('companyid', companyid);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json(data);
  } else if (req.method === 'POST') {
    const { firstname, lastname, companyid, email, phone } = req.body;

    if (!firstname || !lastname) {
      return res.status(400).json({ message: 'Firstname and Lastname are required.' });
    }

    const { data, error } = await supabase.from('contacts').insert([{ firstname, lastname, companyid, email, phone }]);
    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json(data);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}