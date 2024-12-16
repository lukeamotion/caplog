export default function handler(req, res) {
  const { id } = req.query;

  console.log('🚀 Route Triggered: [id].js');
  console.log('ID Received:', id);
  console.log('Request Method:', req.method);

  if (!id) {
    return res.status(400).json({ error: 'ID is required.' });
  }

  if (req.method === 'PATCH') {
    return res.status(200).json({ message: `PATCH request successful for ID: ${id}` });
  } else if (req.method === 'DELETE') {
    return res.status(200).json({ message: `DELETE request successful for ID: ${id}` });
  } else {
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
