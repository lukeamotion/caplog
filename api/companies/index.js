import fetch from 'node-fetch';
import { supabase } from '../../utils/supabase.js';

// Function to fetch company details from Google Places API
async function fetchCompanyDetailsFromGooglePlaces(companyName) {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  const endpoint = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    companyName
  )}&inputtype=textquery&fields=name,formatted_address,formatted_phone_number&key=${googleApiKey}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    console.error('Google Places API Error:', await response.text());
    throw new Error('Failed to fetch company details from Google Places API.');
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    console.warn(`No results found for company: ${companyName}`);
    return { name: companyName, city: null, state: null, zip: null, phone: null, country: null };
  }

  const result = data.candidates[0];
  const addressParts = result.formatted_address.split(',');

  return {
    name: result.name,
    city: addressParts[addressParts.length - 3]?.trim() || null,
    state: addressParts[addressParts.length - 2]?.split(' ')[0]?.trim() || null,
    zip: addressParts[addressParts.length - 2]?.split(' ')[1]?.trim() || null,
    phone: result.formatted_phone_number || null,
    country: addressParts[addressParts.length - 1]?.trim() || null,
  };
}

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

      // Fetch details from Google Places API if city/state/phone are missing
      let enrichedData = { name, city, state, zip, phone, country };
      if (!city || !state || !zip || !phone) {
        try {
          enrichedData = await fetchCompanyDetailsFromGooglePlaces(name);
        } catch (err) {
          console.error('Error fetching data from Google Places API:', err.message);
        }
      }

      // Insert company into the database
      const { data, error } = await supabase
        .from('companies')
        .insert([enrichedData])
        .select('id')
        .single();

      if (error) throw error;

      return res.status(201).json({ message: 'Company created successfully.', data });

    } else if (req.method === 'PATCH') {
      // Update a specific company
      const { id } = req.query;
      const { name, city, state, zip, phone, country } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Company ID is required.' });
      }

      if (!name && !city && !state && !zip && !phone && !country) {
        return res.status(400).json({ error: 'At least one