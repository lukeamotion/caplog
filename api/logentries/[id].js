import { validateKeywords, getExcludedWords, validateContactIds } from './inputhelper.js';
import {
    insertLogEntry,
    insertRelationships,
    deleteRelationships,
    updateLogEntry,
    getLogEntry,
    getAllLogEntries,
} from './dbhelper.js';

export default async function handler(req, res) {
    const { id } = req.query;

    // L-A-LOG-I-1: API Key Validation
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
        // Handle requests without an ID explicitly
        if (req.method === 'GET' && !id) {
            const logEntries = await getAllLogEntries(); // L-A-LOG-D-6
            return res.status(200).json({
                message: 'All log entries retrieved successfully.',
                data: logEntries,
            });
        }

        switch (req.method) {
            case 'GET': {
                if (id) {
                    // Fetch a specific log entry by ID
                    const logEntry = await getLogEntry(id); // L-A-LOG-D-5
                    if (!logEntry) {
                        return res.status(404).json({ error: `Log entry with ID ${id} not found.` });
                    }
                    return res.status(200).json({
                        message: `Log entry with ID ${id} retrieved successfully.`,
                        data: logEntry,
                    });
                }
            }

            case 'POST': {
                const { logtype, keywords, followup = false, text, contactids = [], companyids = [] } = req.body;

                if (!text) {
                    return res.status(400).json({ error: 'The text field is required.' });
                }

                await validateContactIds(contactids);
                const excludedWords = await getExcludedWords(contactids, companyids);
                const cleanKeywords = validateKeywords(keywords, excludedWords);

                const logentry_id = await insertLogEntry({ logtype, keywords: cleanKeywords, text, followup });
                await insertRelationships(logentry_id, contactids, companyids);

                return res.status(201).json({
                    message: 'Log entry created successfully.',
                    logentry_id,
                });
            }

            case 'PATCH': {
                const { logtype, keywords, followup, text } = req.body;

                if (!logtype && !keywords && !followup && !text) {
                    return res.status(400).json({
                        error: 'At least one field must be provided for update.',
                    });
                }

                const updatedLog = await updateLogEntry(id, { logtype, keywords, followup, text });
                return res.status(200).json({
                    message: `Log entry with ID ${id} updated successfully.`,
                    data: updatedLog,
                });
            }

            case 'DELETE': {
                await deleteRelationships(id);
                return res.status(200).json({
                    message: `Log entry with ID ${id} deleted successfully.`,
                });
            }

            default: {
                res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
            }
        }
    } catch (error) {
        console.error('Error in logentries handler:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
