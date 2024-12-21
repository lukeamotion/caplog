import { supabase } from '../../utils/supabase'
import vercel from '../../vercel/auth'
import { validateRequest } from '../../vercel/validate'

// #1: Main Handler
const handler = async (req, res) => {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'ID is required' })
  }

  switch (req.method) {
    case 'GET':
      return await getCompany(req, res, id)
    case 'PATCH':
      return await updateCompany(req, res, id)
    case 'DELETE':
      return await deleteCompany(req, res, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

// #2: Get Company
async function getCompany(req, res, id) {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts(*),
      logentry_companies(
        logentries(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Company not found' })
  return res.status(200).json(data)
}

// #3: Update Company
async function updateCompany(req, res, id) {
  const { data, error } = await supabase
    .from('companies')
    .update(req.body)
    .eq('id', id)
    .select(`
      *,
      contacts(*),
      logentry_companies(
        logentries(*)
      )
    `)

  if (error) return res.status(500).json({ error: error.message })
  if (!data?.length) return res.status(404).json({ error: 'Company not found' })
  return res.status(200).json(data[0])
}

// #4: Delete Company
async function deleteCompany(req, res, id) {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
}

// #5: Export
export default vercel(handler)