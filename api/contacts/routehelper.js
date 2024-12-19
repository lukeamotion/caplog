// FILE: routehelper.js
// DESCRIPTION: Handles API requests for `contacts` by routing them to utility and database functions.

import { inferCompanyFromEmail, sanitizePhone } from './inputhelper.js';
import { ensureCompanyExists, saveContact, deleteContact } from './dbhelper.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      // Handle GET logic here
    }

    if (req.method === 'POST') {
      const { name, firstname, lastname, email, phone, companyid, company } = req.body;

      const [first, ...lastParts] = name?.split(' ') || [];
      const resolvedFirst = firstname || first;
      const resolvedLast = lastname || lastParts.join(' ');

      if (!resolvedFirst || !resolvedLast || !email) {
        return res.status(400).json({ error: 'firstname, lastname, and email are required.' });
      }

      const resolvedCompanyId = await ensureCompanyExists(companyid, company);
      const sanitizedPhone = sanitizePhone(phone);

      const contactData = {
        firstname: resolvedFirst,
        lastname: resolvedLast,
        email,
        phone: sanitizedPhone,
        companyid: resolvedCompanyId,
      };

      const createdContact = await saveContact(contactData);
      return res.status(201).json({ message: 'Contact created successfully.', data: createdContact });
    }

    if (req.method === 'PATCH') {
      const { firstname, lastname, email, phone, companyid } = req.body;

      if (!id) return res.status(400).json({ error: 'Contact ID is required.' });

      const sanitizedPhone = phone ? sanitizePhone(phone) : undefined;
      const updateData = { firstname, lastname, email, phone: sanitizedPhone, companyid };

      const updatedContact = await saveContact(updateData, id);
      return res.status(200).json({ message: 'Contact updated successfully.', data: updatedContact });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Contact ID is required.' });

      await deleteContact(id);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Error in contacts handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
