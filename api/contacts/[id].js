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
      return await getContact(req, res, id)
    case 'PATCH':
      return await updateContact(req, res, id)
    case 'DELETE':
      return await deleteContact(req, res, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getContact(req, res, id) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, companies(*)')
    .eq('id', id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Contact not found' })
  return res.status(200).json(data)
}

async function updateContact(req, res, id) {
  if (req.body.firstname && req.body.lastname) {
    req.body.fullname = `${req.body.firstname} ${req.body.lastname}`.trim()
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(req.body)
    .eq('id', id)
    .select('*, companies(*)')

  if (error) return res.status(500).json({ error: error.message })
  if (!data?.length) return res.status(404).json({ error: 'Contact not found' })
  return res.status(200).json(data[0])
}

async function deleteContact(req, res, id) {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
}

export default vercel(handler)