import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  try {
    const apiKey = req.headers['authorization'];
    const validKey = process.env.OPENAI_KEY;

    if (apiKey !== `Bearer ${validKey}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (req.method === 'POST') {
      // Create a new company
      const { name, city, state, zip, phone, country } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      // Clean and filter payload dynamically
      const insertData = Object.fromEntries(
        Object.entries({ name, city, state, zip, phone, country }).filter(
          ([_, value]) => value !== undefined && value !== null
        )
      );

      console.log("Payload being sent to Supabase:", insertData);

      // Insert into Supabase
      const { data, error } = await supabase
        .from('companies')
        .insert([insertData])
        .select('id, name, city, state, zip, phone, country')
        .single();

      if (error) {
        console.error("Supabase Insert Error:", error.message || error);
        throw error;
      }

      return res.status(201).json({ message: 'Company created successfully.', data });

    } else if (req.method === 'PATCH') {
      // Update a specific company
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      if (!name && !city && !state && !zip && !phone && !country) {
        return res.status(400).json({ error: 'At least one field must be provided for update.' });
      }

      const updateData = Object.fromEntries(
        Object.entries({ name, city, state, zip, phone, country }).filter(
          ([_, value]) => value !== undefined && value !== null
        )
      );

      console.log("Updating with payload:", updateData);

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error("Supabase Update Error:", error.message || error);
        throw error;
      }

      return res.status(200).json({ message: 'Company updated successfully.', data });

    } else if (req.method === 'GET') {
      // Retrieve company data
      const { id } = req.query;

      if (!id) {
        // Fetch all companies if no ID is provided
        const { data, error } = await supabase.from('companies').select('*');

        if (error) {
          console.error("Supabase Fetch All Error:", error.message || error);
          throw error;
        }

        return res.status(200).json({ message: 'Companies retrieved successfully.', data });
      } else {
        // Fetch specific company
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error("Supabase Fetch Error:", error.message || error);
          throw error;
        }

        return res.status(200).json({ message: 'Company retrieved successfully.', data });
      }
    } else if (req.method === 'DELETE') {
      // Delete a specific company
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Supabase Delete Error:", error.message || error);
        throw error;
      }

      return res.status(200).json({ message: 'Company deleted successfully.', data });

    } else {
      res.setHeader('Allow', ['POST', 'PATCH', 'GET', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}