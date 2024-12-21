export default function vercel(handler) {
    return async (req, res) => {
      const apiKey = req.headers['authorization']
      
      if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      return handler(req, res)
    }
  }