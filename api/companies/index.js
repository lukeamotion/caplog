import fetch from 'node-fetch';
import { supabase } from '../../utils/supabase.js';

// Helper function for API key validation
function validateApiKey(req) {
  const apiKey = req.headers['authorization'];
  const validKey = process.env.OPENAI_KEY;

  if (apiKey !== `Bearer ${validKey}`) {
    throw new Error('Unauthorized: Invalid API Key');
  }
}

// Function to fetch company details from Google Places API
async function fetchCompanyDetailsFromGooglePlaces(companyName) {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  const endpoint = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    companyName
  )}&inputtype=textquery&fields=name,formatted_address&key=${googleApiKey}`;

  const response = await fetch(endpoint);

  if (response.ok) {
    const data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      const result = data.candidates[0];
      const address = result.formatted_address.split(',');

      return {
        name: result.name,
        city: address[address.length - 3]?.trim() || null,
        state: address[address.length - 2]?.split(' ')[0]?.trim() || null,
        zip: address[address.length - 2]?.split(' ')[1]?.trim() || null,
      };
    }
  }

  console.error('Failed to fetch company details from Google Places:', await response.text());
  return { name: companyName, city: null, state: null, zip: null };
}

export default async function handler(req, res) {
  try {
    // Validate API Key
    validateApiKey(req);

    if (req.method === 'GET') {
      // Retrieve all companies
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;

      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      // Insert a new company
      let { name, city = null, state = null, zip = null, phone = null, country = null } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      // Fetch details from Google Places API if city/state/zip are missing
      if (!city || !state || !zip) {
        const enrichedData = await fetchCompanyDetailsFromGooglePlaces(name);
        city = city || enrichedData.city;
        state = state || enrichedData.state;
        zip = zip || enrichedData.zip;
      }

      // Insert the company into the database
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, city, state, zip, phone, country }]);
      if (error) throw error;

      return res.status(201).json({ message: 'Company created successfully.', data });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in companies handler:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
