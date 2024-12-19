// FILE: routehelper.js
// DESCRIPTION: Handles API requests for `companies` by routing them to utility and database functions.

import { sanitizePhone } from './inputhelper.js';
import { saveCompany, deleteCompany, getCompanyLogs, getCompanies } from './dbhelper.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'POST') {
      const { name, city, state, zip, phone, country } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      const sanitizedPhone = sanitizePhone(phone);

      const companyData = { name, city, state, zip, phone: sanitizedPhone, country };
      const createdCompany = await saveCompany(companyData);
      return res.status(201).json({ message: 'Company created successfully.', data: createdCompany });
    }

    if (req.method === 'GET') {
      const { id, includeLogs } = req.query;

      if (includeLogs && id) {
        const logs = await getCompanyLogs(id);
        return res.status(200).json({ message: 'Logs retrieved successfully.', data: logs });
      }

      const companies = await getCompanies(id);
      return res.status(200).json(companies);
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      const sanitizedPhone = sanitizePhone(phone);

      const companyData = { name, city, state, zip, phone: sanitizedPhone, country };
      const updatedCompany = await saveCompany(companyData, id);
      return res.status(200).json({ message: 'Company updated successfully.', data: updatedCompany });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      await deleteCompany(id);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['POST', 'PATCH', 'GET', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
