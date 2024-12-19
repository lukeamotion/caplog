// FILE: caplog/api/logentries/dbhelper.js
// DESCRIPTION: Handles database operations for logentries and relationships.

import { supabase } from '../supabase.js';

/**
 * Function L-A-LOG-D-1: Insert Log Entry
 * Inserts a new log entry into the database.
 * 
 * @param {object} logEntry - The log entry data to insert.
 * @returns {number} - The ID of the inserted log entry.
 * @throws {Error} - If the insertion fails.
 */
export async function insertLogEntry(logEntry) {
  const { data, error } = await supabase
    .from('logentries')
    .insert([logEntry])
    .select('id')
    .single();

  if (error) throw error;

  return data.id;
}

/**
 * Function L-A-LOG-D-2: Insert Relationships
 * Creates relationships between a log entry and contacts/companies.
 * 
 * @param {number} logentry_id - The log entry ID.
 * @param {number[]} contactIds - List of contact IDs.
 * @param {number[]} companyIds - List of company IDs.
 * @throws {Error} - If the insertion fails.
 */
export async function insertRelationships(logentry_id, contactIds, companyIds) {
  const relationshipInserts = [
    ...contactIds.map((contact_id) => ({ logentry_id, contact_id })),
    ...companyIds.map((company_id) => ({ logentry_id, company_id })),
  ];

  if (relationshipInserts.length > 0) {
    const { error } = await supabase.from('relationships').insert(relationshipInserts);
    if (error) throw error;
  }
}

/**
 * Function L-A-LOG-D-3: Delete Relationships
 * Deletes all relationships for a given log entry.
 * 
 * @param {number} logentry_id - The log entry ID.
 * @throws {Error} - If the deletion fails.
 */
export async function deleteRelationships(logentry_id) {
  const { error } = await supabase.from('relationships').delete().eq('logentry_id', logentry_id);
  if (error) throw error;
}

/**
 * Function L-A-LOG-D-4: Update Log Entry
 * Updates an existing log entry in the database.
 * 
 * @param {number} id - The ID of the log entry to update.
 * @param {object} updateFields - The fields to update.
 * @throws {Error} - If the update fails.
 */
export async function updateLogEntry(id, updateFields) {
  const { error } = await supabase
    .from('logentries')
    .update(updateFields)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Function L-A-LOG-D-5: Get Log Entry
 * Fetches a specific log entry by ID.
 * 
 * @param {number} id - The ID of the log entry to fetch.
 * @returns {object} - The retrieved log entry.
 * @throws {Error} - If the query fails or the log entry does not exist.
 */
export async function getLogEntry(id) {
  const { data, error } = await supabase
    .from('logentries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Function L-A-LOG-D-6: Get All Log Entries
 * Fetches all log entries from the database.
 * 
 * @returns {object[]} - A list of all log entries.
 * @throws {Error} - If the query fails.
 */
export async function getAllLogEntries() {
  const { data, error } = await supabase.from('logentries').select('*');
  if (error) throw error;
  return data;
}
