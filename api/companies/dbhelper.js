// FILE: caplog/api/companies/dbhelper.js
// DESCRIPTION: Contains database interaction functions for `companies` and related logs.

import { supabase } from '../supabase.js';

/**
 * Function C-A-C-D-1: Create or Update Company
 * Inserts or updates a company in the database.
 * 
 * @param {object} companyData - The company data to insert or update.
 * @param {number|null} id - The company ID to update (null for new companies).
 * @returns {object} - The created or updated company data.
 * @throws {Error} - If the operation fails.
 */
export async function saveCompany(companyData, id = null) {
  const query = supabase.from('companies');
  const { data, error } = id
    ? await query.update(companyData).eq('id', id).select('*').single()
    : await query.insert([companyData]).select('*').single();

  if (error) throw error;
  return data;
}

/**
 * Function C-A-C-D-2: Delete Company
 * Deletes a company and its relationships from the database.
 * 
 * @param {number} id - The company ID to delete.
 * @throws {Error} - If the operation fails.
 */
export async function deleteCompany(id) {
  await supabase.from('relationships').delete().eq('company_id', id);
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Function C-A-C-D-3: Get Company Logs
 * Retrieves logs associated with a specific company.
 * 
 * @param {number} id - The company ID to fetch logs for.
 * @returns {object[]} - A list of associated logs.
 * @throws {Error} - If the query fails.
 */
export async function getCompanyLogs(id) {
  const { data, error } = await supabase
    .from('relationships')
    .select('logentry_id, logentries (id, logtype, text, followup)')
    .eq('company_id', id);

  if (error) throw error;
  return data;
}

/**
 * Function C-A-C-D-4: Get Companies
 * Fetches all companies or a specific company by ID.
 * 
 * @param {number|null} id - The company ID to fetch (null for all companies).
 * @returns {object[]} - A list of companies or a single company object.
 * @throws {Error} - If the query fails.
 */
export async function getCompanies(id = null) {
  const query = id
    ? supabase.from('companies').select('*').eq('id', id).single()
    : supabase.from('companies').select('*');

  const { data, error } = await query;
  if (error) throw error;

  return data;
}
