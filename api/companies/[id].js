import { handleErrors } from '../../vercel/errorHandler'; // Error handling middleware
import authenticate from '../../vercel/auth'; // Authentication middleware
import supabase from '../../utils/supabaseClient'; // Supabase client

export default handleErrors(async function handler(req, res) {
  authenticate(req, res, async () => {
    const { method } = req;
    const { id } = req.query; // Dynamic ID from route

    // Section 1: Method Handling
    switch (method) {
      case 'GET':
        // Section 1.1: Handle GET Request (Retrieve Company)
        return await handleGetById(req, res, id);
      case 'PATCH':
        // Section 1.2: Handle PATCH Request (Update Company)
        return await handlePatchById(req, res, id);
      case 'DELETE':
        // Section 1.3: Handle DELETE Request (Remove Company)
        return await handleDeleteById(req, res, id);
      default:
        // Section 1.4: Unsupported Method
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed.` });
    }
  });
});

// Section 2: GET Request Logic
async function handleGetById(req, res, id) {
  // Section 2.1: Fetch Company
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({
      error: `Company with ID ${id} not found.`,
    });
  }

  // Section 2.2: Return Response
  return res.status(200).json({
    status: 'success',
    data: company,
  });
}

// Section 3: PATCH Request Logic
async function handlePatchById(req, res, id) {
  const updates = req.body;

  // Section 3.1: Update Company
  const { data: updatedCompany, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(`Error updating company: ${error.message}`);
  }

  // Section 3.2: Return Response
  return res.status(200).json({
    status: 'success',
    data: updatedCompany,
  });
}

// Section 4: DELETE Request Logic
async function handleDeleteById(req, res, id) {
  // Section 4.1: Delete Company
  const { error } = await supabase.from('companies').delete().eq('id', id);

  if (error) {
    throw new Error(`Error deleting company: ${error.message}`);
  }

  // Section 4.2: Return Response
  return res.status(204).end();
}
