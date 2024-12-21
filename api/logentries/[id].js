import { supabase } from '../../utils/supabase'
import vercel from '../../vercel/auth'
import { validateRequest } from '../../vercel/validate'

const handler = async (req, res) => {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'ID is required' })
  }

  switch (req.method) {
    case 'GET':
      return await getLogEntry(req, res, id)
    case 'PATCH':
      return await updateLogEntry(req, res, id)
    case 'DELETE':
      return await deleteLogEntry(req, res, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getLogEntry(req, res, id) {
  const { data, error } = await supabase
    .from('logentries')
    .select(`
      *,
      logentry_contacts (
        contacts (*)
      ),
      logentry_companies (
        companies (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Log entry not found' })
  return res.status(200).json(data)
}

async function updateLogEntry(req, res, id) {
  const { data, error } = await supabase
    .from('logentries')
    .update(req.body)
    .eq('id', id)
    .select()

  if (error) return res.status(500).json({ error: error.message })
  if (!data?.length) return res.status(404).json({ error: 'Log entry not found' })
  return res.status(200).json(data[0])
}

async function deleteLogEntry(req, res, id) {
  const { error } = await supabase
    .from('logentries')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
}

export default vercel(handler)