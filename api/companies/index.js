import { supabase } from '../../utils/supabase'
import vercel from '../../vercel/auth'
import { validateRequest } from '../../vercel/validate'

// #1: Main Handler
const handler = async (req, res) => {
  switch (req.method) {
    case 'GET':
      return await getCompanies(req, res)
    case 'POST':
      return await createCompany(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

// #2: Get Companies
async function getCompanies(req, res) {
  const { name, facility_code, includeLogs } = req.query
  let query = supabase
    .from('companies')
    .select(`
      *,
      contacts (*),
      ${includeLogs === 'true' ? 'logentry_companies(logentries(*)),' : ''}
      facility_code
    `)

  if (name) {
    query = query.ilike('name', `%${name}%`)
  }
  if (facility_code) {
    query = query.eq('facility_code', facility_code)
  }

  const { data, error } = await query.order('name')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}

// #3: Create Company
async function createCompany(req, res) {
  const { name, facility_code, city, state, zip, country, phone } = req.body

  const { data, error } = await supabase
    .from('companies')
    .insert([{ 
      name,
      facility_code,
      city,
      state,
      zip,
      country: country || 'USA',
      phone
    }])
    .select(`
      *,
      contacts(*)
    `)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data[0])
}

// #4: Export
export default vercel(handler)