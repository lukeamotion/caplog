// FILE: dbhelper.js
// DESCRIPTION: Contains database interaction functions for `contacts` and their associated companies.

import { supabase } from '../supabase.js';

/**
 * Function D1: Ensure Company Exists
 * Ensures a company exists in the database, creating it if necessary.
 * 
 * @param {number|null} companyid - The ID of the existing company (optional).
 * @param {string|null} companyName - The name of the company to create if it doesn't exist.
 * @returns {number|null} - The company ID.
 * @throws {Error} - If the company cannot be created or validated.
 */
export async function ensureCompanyExists(companyid, companyName) {
  if (!companyid && !companyName) return null;

  if (companyid) {
    const { data: existingCompany, error } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyid)
      .single();

    if (!error && existingCompany) return companyid;
  }

  if (companyName) {
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert([{ name: companyName }])
      .select('id')
      .single();

    if (createError) throw createError;

    return newCompany.id;
  }

  throw new Error('Invalid companyid and no company name provided.');
}

/**
 * Function D2: Create or Update Contact
 * Inserts or updates a contact in the database.
 * 
 * @param {object} contactData - The contact data to insert or update.
 * @param {number|null} id - The contact ID to update (null for new contacts).
 * @returns {object} - The created or updated contact data.
 * @throws {Error} - If the operation fails.
 */
export async function saveContact(contactData, id = null) {
  const query = supabase.from('contacts');
  const { data, error } = id
    ? await query.update(contactData).eq('id', id).select('*').single()
    : await query.insert([contactData]).select('*').single();

  if (error) throw error;
  return data;
}

/**
 * Function D3: Delete Contact
 * Deletes a contact and its relationships from the database.
 * 
 * @param {number} id - The contact ID to delete.
 * @throws {Error} - If the operation fails.
 */
export async function deleteContact(id) {
  await supabase.from('relationships').delete().eq('contact_id', id);
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}
