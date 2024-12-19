import { validateKeywords, getExcludedWords, validateContactIds } from './inputhelper.js';
import {
  insertLogEntry, // L-A-LOG-D-1
  insertRelationships, // L-A-LOG-D-2
  deleteRelationships, // L-A-LOG-D-3
  updateLogEntry, // L-A-LOG-D-4
  getLogEntry, // L-A-LOG-D-5
  getAllLogEntries, // L-A-LOG-D-6
} from './dbhelper.js';

export default async function handler(req, res) {
    // L-A-LOG-I-1: API Key Validation
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
        const { id } = req.query;

        switch (req.method) {
            // L-A-LOG-I-2: Handle GET Method (Retrieve Log Entries)
            case 'GET': {
                if (id) {
                    const logEntry = await getLogEntry(id); // L-A-LOG-D-5
                    if (!logEntry) {
                        return res.status(404).json({ error: `Log entry with ID ${id} not found.` });
                    }
                    return res.status(200).json({
                        message: `Log entry with ID ${id} retrieved successfully.`,
                        data: logEntry,
                    });
                } else {
                    const logEntries = await getAllLogEntries(); // L-A-LOG-D-6
                    return res.status(200).json({
                        message: 'All log entries retrieved successfully.',
                        data: logEntries,
                    });
                }
            }

            // L-A-LOG-I-3: Handle POST Method (Create a New Log Entry)
            case 'POST': {
                const { logtype, keywords, followup = false, text, contactids = [], companyids = [] } = req.body;

                if (!text) {
                    return res.status(400).json({ error: 'The text field is required.' });
                }

                await validateContactIds(contactids); // Validate contact IDs
                const excludedWords = await getExcludedWords(contactids, companyids); // Exclude specific words
                const cleanKeywords = validateKeywords(keywords, excludedWords); // Clean keywords

                const logentry_id = await insertLogEntry({ logtype, keywords: cleanKeywords, text, followup }); // L-A-LOG-D-1
                await insertRelationships(logentry_id, contactids, companyids); // L-A-LOG-D-2

                return res.status(201).json({
                    message: 'Log entry created successfully.',
                    logentry_id,
                });
            }

            // L-A-LOG-I-4: Handle PATCH Method (Update an Existing Log Entry)
            case 'PATCH': {
                const { logtype, keywords, followup, text } = req.body;

                if (!logtype && !keywords && !followup && !text) {
                    return res.status(400).json({
                        error: 'At least one field must be provided for update.',
                    });
                }

                const updatedLog = await updateLogEntry(id, { logtype, keywords, followup, text }); // L-A-LOG-D-4
                return res.status(200).json({
                    message: `Log entry with ID ${id} updated successfully.`,
                    data: updatedLog,
                });
            }

            // L-A-LOG-I-5: Handle DELETE Method (Delete a Log Entry)
            case 'DELETE': {
                await deleteRelationships(id); // L-A-LOG-D-3
                return res.status(200).json({
                    message: `Log entry with ID ${id} deleted successfully.`,
                });
            }

            // L-A-LOG-I-6: Handle Unsupported HTTP Methods
            default: {
                res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
            }
        }
    } catch (error) {
        // L-A-LOG-I-7: Error Handling
        console.error('Error in logentries handler:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
