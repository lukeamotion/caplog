import { supabase } from '../../utils/supabase.js';
import { sanitizePhone } from './inputhelper.js';
import { saveCompany, deleteCompany, getCompanyLogs, getCompanies } from './dbhelper.js';

export default async function handler(req, res) {
    // C-A-C-I-1: Validate API Key
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
        const { id, includeLogs } = req.query;

        switch (req.method) {
            // C-A-C-I-2: Handle POST Method (Create a New Company)
            case 'POST': {
                const { name, city, state, zip, phone, country } = req.body;

                // Validation: Ensure `name` is provided.
                if (!name) {
                    return res.status(400).json({ error: 'Company name is required.' });
                }

                // Sanitize phone number before saving.
                const sanitizedPhone = sanitizePhone(phone);
                const companyData = { name, city, state, zip, phone: sanitizedPhone, country };

                // Save the company using the database helper.
                const createdCompany = await saveCompany(companyData);

                return res.status(201).json({
                    message: 'Company created successfully.',
                    data: createdCompany,
                });
            }

            // C-A-C-I-3: Handle GET Method (Retrieve Company or Logs)
            case 'GET': {
                if (includeLogs && id) {
                    // Retrieve logs for a specific company.
                    const logs = await getCompanyLogs(id);
                    return res.status(200).json({
                        message: 'Logs retrieved successfully.',
                        data: logs,
                    });
                }

                // Retrieve companies (all or a specific one based on `id`).
                const companies = await getCompanies(id);
                return res.status(200).json(companies);
            }

            // C-A-C-I-4: Handle PATCH Method (Update an Existing Company)
            case 'PATCH': {
                if (!id) {
                    return res.status(400).json({ error: 'Company ID is required.' });
                }

                const { name, city, state, zip, phone, country } = req.body;

                // Sanitize phone number before updating.
                const sanitizedPhone = sanitizePhone(phone);
                const companyData = { name, city, state, zip, phone: sanitizedPhone, country };

                // Update the company using the database helper.
                const updatedCompany = await saveCompany(companyData, id);

                return res.status(200).json({
                    message: 'Company updated successfully.',
                    data: updatedCompany,
                });
            }

            // C-A-C-I-5: Handle DELETE Method (Delete a Company)
            case 'DELETE': {
                if (!id) {
                    return res.status(400).json({ error: 'Company ID is required.' });
                }

                // Delete the company using the database helper.
                await deleteCompany(id);

                return res.status(204).end();
            }

            // C-A-C-I-6: Handle Unsupported HTTP Methods
            default: {
                res.setHeader('Allow', ['POST', 'PATCH', 'GET', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
            }
        }
    } catch (error) {
        // C-A-C-I-7: Handle Errors and Send a 500 Response
        console.error('Error in companies handler:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
