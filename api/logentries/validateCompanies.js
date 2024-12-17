import { supabase } from "../../utils/supabase.js";

// List of stopwords to exclude as company names
const stopwords = [
  "meeting", "email", "call", "note", "task", "review", "holiday", "vacation",
  "playing", "frisbee", "send", "process", "follow", "today", "tomorrow"
];

/**
 * Extract and validate company mentions from text and keywords
 * @param {string} text - The text of the log entry
 * @param {Array<string>} keywords - List of keywords provided
 * @returns {Array<string>} - List of validated company names to be created
 */
export async function extractAndValidateCompanies(text, keywords) {
  const capitalizedWords = text.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
  const candidates = [...new Set([...capitalizedWords, ...keywords])];

  // Filter out stopwords and ensure candidates are potential company names
  const potentialCompanies = candidates.filter(
    (word) => !stopwords.includes(word.toLowerCase())
  );

  const validatedCompanies = [];
  for (const name of potentialCompanies) {
    // Check if the company already exists
    const { data: company, error } = await supabase
      .from("companies")
      .select("id")
      .eq("name", name)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(`Error checking company "${name}":`, error.message);
      throw new Error(`Error validating company: ${name}`);
    }

    if (!company) {
      console.warn(`Company "${name}" is missing. Preparing to create it.`);
      validatedCompanies.push(name); // Add for creation
    }
  }

  return validatedCompanies;
}

/**
 * Create a company in the database if it is missing
 * @param {string} name - The name of the company
 * @param {object} [details] - Optional company details like city, state, zip, phone
 * @returns {number} - The ID of the created company
 */
export async function createCompanyIfMissing(name, details = {}) {
  console.log(`Creating company "${name}"...`);

  const { city = null, state = null, zip = null, phone = null } = details;

  // Insert the new company
  const { data: newCompany, error } = await supabase
    .from("companies")
    .insert([{ name, city, state, zip, phone }])
    .select("id")
    .single();

  if (error) {
    console.error(`Error creating company "${name}": ${error.message}`);
    throw new Error(`Failed to create company: ${name}`);
  }

  console.log(`Company "${name}" created successfully with ID: ${newCompany.id}`);
  return newCompany.id;
}
