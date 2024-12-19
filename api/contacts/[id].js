import { supabase } from '../../utils/supabase.js';
import { inferCompanyFromEmail, sanitizePhone } from './inputhelper.js';
import {
  ensureCompanyExists, // C-A-CON-D-1
  saveContact, // C-A-CON-D-2
  deleteContact, // C-A-CON-D-3
} from './dbhelper.js';

export default async function handler(req, res) {
    // C-A-CON-I-1: Validate API Key
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
        const { id } = req.query;

        switch (req.method) {
            // C-A-CON-I-2: Handle POST Method (Create a New Contact)
            case 'POST': {
                const { name, firstname, lastname, email, phone, companyid, company } = req.body;

                const [first, ...lastParts] = name?.split(' ') || [];
                const resolvedFirst = firstname || first;
                const resolvedLast = lastname || lastParts.join(' ');

                if (!resolvedFirst || !resolvedLast || !email) {
                    return res.status(400).json({
                        error: 'firstname, lastname, and email are required.',
                    });
                }

                const resolvedCompanyId = await ensureCompanyExists(companyid, company); // C-A-CON-D-1
                const sanitizedPhone = sanitizePhone(phone);

                const contactData = {
                    firstname: resolvedFirst,
                    lastname: resolvedLast,
                    email,
                    phone: sanitizedPhone,
                    companyid: resolvedCompanyId,
                };

                const createdContact = await saveContact(contactData); // C-A-CON-D-2
                return res.status(201).json({
                    message: 'Contact created successfully.',
                    data: createdContact,
                });
            }

            // C-A-CON-I-3: Handle PATCH Method (Update an Existing Contact)
            case 'PATCH': {
                const { firstname, lastname, email, phone, companyid } = req.body;

                if (!id) {
                    return res.status(400).json({ error: 'Contact ID is required.' });
                }

                const sanitizedPhone = phone ? sanitizePhone(phone) : undefined;
                const updateData = { firstname, lastname, email, phone: sanitizedPhone, companyid };

                const updatedContact = await saveContact(updateData, id); // C-A-CON-D-2
                return res.status(200).json({
                    message: 'Contact updated successfully.',
                    data: updatedContact,
                });
            }

            // C-A-CON-I-4: Handle DELETE Method (Delete a Contact)
            case 'DELETE': {
                if (!id) {
                    return res.status(400).json({ error: 'Contact ID is required.' });
                }

                await deleteContact(id); // C-A-CON-D-3
                return res.status(204).end();
            }

            // C-A-CON-I-5: Handle Unsupported HTTP Methods
            default: {
                res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
            }
        }
    } catch (error) {
        // C-A-CON-I-6: Handle Errors and Send a 500 Response
        console.error('Error in contacts handler:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
