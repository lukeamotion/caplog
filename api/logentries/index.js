import { supabase } from '../../utils/supabase'
import vercel from '../../vercel/auth'
import { validateRequest } from '../../vercel/validate'

// #1: Main Handler
const handler = async (req, res) => {
  switch (req.method) {
    case 'GET':
      return await getLogEntries(req, res)
    case 'POST':
      return await createLogEntry(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

// #2: Get Log Entries
async function getLogEntries(req, res) {
  const { followup, due_date, keywords } = req.query
  let query = supabase
    .from('logentries')
    .select(`
      *,
      contacts (*),
      companies (*)
    `)

  if (followup === 'true') {
    query = query.eq('followup', true)
  }
  
  if (due_date) {
    query = query.lte('due_date', due_date)
  }

  if (keywords) {
    query = query.contains('keywords', [keywords])
  }

  const { data, error } = await query.order('due_date', { ascending: true, nullsLast: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}

// #3: Create Log Entry
async function createLogEntry(req, res) {
  const { contactids, companyids, ...logData } = req.body

  // Create log entry
  const { data: logEntry, error: logError } = await supabase
    .from('logentries')
    .insert([logData])
    .select()

  if (logError) return res.status(500).json({ error: logError.message })

  // Link contacts if provided
  if (contactids?.length) {
    const { error: contactError } = await supabase
      .from('logentry_contacts')
      .insert(contactids.map(id => ({
        logentry_id: logEntry[0].id,
        contact_id: id
      })))

    if (contactError) return res.status(500).json({ error: contactError.message })
  }

  // Link companies if provided
  if (companyids?.length) {
    const { error: companyError } = await supabase
      .from('logentry_companies')
      .insert(companyids.map(id => ({
        logentry_id: logEntry[0].id,
        company_id: id
      })))

    if (companyError) return res.status(500).json({ error: companyError.message })
  }

  return res.status(201).json(logEntry[0])
}

// #4: Export
export default vercel(handler)