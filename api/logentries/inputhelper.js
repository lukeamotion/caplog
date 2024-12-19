// FILE: inputhelper.js
// DESCRIPTION: Contains helper functions for validating and processing input data for logentries.

import { supabase } from '../supabase.js';

/**
 * Function I1: Validate Keywords
 * Ensures keywords are single words and do not contain excluded words.
 * 
 * @param {string[]} keywords - List of keywords to validate.
 * @param {string[]} excludedWords - Words to exclude from validation (e.g., names or company names).
 * @returns {string[]} - A list of valid keywords.
 * @throws {Error} - If invalid keywords are found.
 */
export function validateKeywords(keywords, excludedWords = []) {
  if (!keywords || !Array.isArray(keywords)) return [];

  const invalidKeywords = keywords.filter((kw) => kw.includes(' '));
  if (invalidKeywords.length > 0) {
    throw new Error(
      `Keywords must be single words. Invalid keywords: ${invalidKeywords.join(', ')}`
    );
  }

  const lowerExcluded = excludedWords.map((word) => word.toLowerCase());
  return keywords.filter((kw) => !lowerExcluded.includes(kw.toLowerCase()));
}

/**
 * Function I2: Get Excluded Words
 * Retrieves excluded words (e.g., names or company names) based on contact and company IDs.
 * 
 * @param {number[]} contactIds - List of contact IDs to fetch names from.
 * @param {number[]} companyIds - List of company IDs to fetch names from.
 * @returns {string[]} - A list of excluded words.
 * @throws {Error} - If there are errors fetching data.
 */
export async function getExcludedWords(contactIds = [], companyIds = []) {
  const excludedWords = [];

  if (contactIds.length > 0) {
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('firstname, lastname')
      .in('id', contactIds);

    if (contactError) throw new Error('Error retrieving contact names.');
    contacts.forEach(({ firstname, lastname }) => {
      if (firstname) excludedWords.push(firstname);
      if (lastname) excludedWords.push(lastname);
    });
  }

  if (companyIds.length > 0) {
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .in('id', companyIds);

    if (companyError) throw new Error('Error retrieving company names.');
    companies.forEach(({ name }) => {
      if (name) excludedWords.push(name);
    });
  }

  return excludedWords;
}

/**
 * Function I3: Validate Contact IDs
 * Verifies that all provided contact IDs exist in the database.
 * 
 * @param {number[]} contactIds - List of contact IDs to validate.
 * @throws {Error} - If invalid contact IDs are found.
 */
export async function validateContactIds(contactIds) {
  if (!contactIds || contactIds.length === 0) return;

  const { data: validContacts, error } = await supabase
    .from('contacts')
    .select('id')
    .in('id', contactIds);

  if (error) {
    throw new Error('Error validating contact IDs.');
  }

  const validIds = validContacts.map((contact) => contact.id);
  const invalidIds = contactIds.filter((id) => !validIds.includes(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid contact IDs: ${invalidIds.join(', ')}`);
  }
}
