// FILE: routehelper.js
// DESCRIPTION: Handles API requests for logentries by routing them to utility and database functions.

import {
  validateKeywords,
  getExcludedWords,
  validateContactIds,
} from './inputhelper.js';
import {
  insertLogEntry,
  insertRelationships,
  deleteRelationships,
  updateLogEntry,
} from './dbhelper.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'GET') {
      // Add GET logic
    }

    if (req.method === 'POST') {
      const { logtype, keywords, followup = false, text, contactids = [], companyids = [] } = req.body;

      if (!text) return res.status(400).json({ error: 'The text field is required.' });

      await validateContactIds(contactids);
      const excludedWords = await getExcludedWords(contactids, companyids);
      const cleanKeywords = validateKeywords(keywords, excludedWords);

      const logentry_id = await insertLogEntry({ logtype, keywords: cleanKeywords, text, followup });
      await insertRelationships(logentry_id, contactids, companyids);

      return res.status(201).json({ message: 'Log entry created successfully.', logentry_id });
    }

    if (req.method === 'PATCH') {
      // Add PATCH logic
    }

    if (req.method === 'DELETE') {
      // Add DELETE logic
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Error in logentries handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
