import { supabase } from '../../utils/supabase'
import vercel from '../../vercel/auth'
import { validateRequest } from '../../vercel/validate'

// #1: Main Handler
const handler = async (req, res) => {
  switch (req.method) {
    case 'GET':
      return await getContacts(req, res)
    case 'POST':
      return await createContact(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

// #2: Get Contacts
async function getContacts(req, res) {
  const { name, company, jobtitle } = req.query
  let query = supabase
    .from('contacts')
    .select(`
      *,
      companies(*),
      logentry_contacts(
        logentries(*)
      )
    `)

  if (name) {
    query = query.ilike('fullname', `%${name}%`)
  }
  if (company) {
    query = query.eq('company_id', company)
  }
  if (jobtitle) {
    query = query.ilike('job_title', `%${jobtitle}%`)
  }

  const { data, error } = await query.order('lastname')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}

// #3: Create Contact
async function createContact(req, res) {
  const { firstname, lastname, email, company_id, ...contactData } = req.body
  const fullname = `${firstname} ${lastname}`.trim()

  // Try to infer company from email if no company_id
  let finalCompanyId = company_id
  if (email && !company_id) {
    const domain = email.split('@')[1]
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', `%${domain.split('.')[0]}%`)
      .single()
    
    if (company) {
      finalCompanyId = company.id
    }
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert([{ 
      firstname,
      lastname,
      fullname,
      email,
      company_id: finalCompanyId,
      ...contactData
    }])
    .select(`
      *,
      companies(*)
    `)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data[0])
}

// #4: Export
export default vercel(handler)