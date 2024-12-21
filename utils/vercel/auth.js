export default function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  console.log('Received API Key:', apiKey);
  console.log('Expected API Key:', process.env.API_SECRET_KEY);

  if (apiKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized access. Invalid API key.' });
  }
  next();
}
