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
        // Section 1.1: Handle GET Request (Retrieve Contact)
        return await handleGetById(req, res, id);
      case 'PATCH':
        // Section 1.2: Handle PATCH Request (Update Contact)
        return await handlePatchById(req, res, id);
      case 'DELETE':
        // Section 1.3: Handle DELETE Request (Remove Contact)
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
  // Section 2.1: Fetch Contact
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({
      error: `Contact with ID ${id} not found.`,
    });
  }

  // Section 2.2: Return Response
  return res.status(200).json({
    status: 'success',
    data: contact,
  });
}

// Section 3: PATCH Request Logic
async function handlePatchById(req, res, id) {
  const updates = req.body;

  // Section 3.1: Update Contact
  const { data: updatedContact, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(`Error updating contact: ${error.message}`);
  }

  // Section 3.2: Return Response
  return res.status(200).json({
    status: 'success',
    data: updatedContact,
  });
}

// Section 4: DELETE Request Logic
async function handleDeleteById(req, res, id) {
  // Section 4.1: Delete Contact
  const { error } = await supabase.from('contacts').delete().eq('id', id);

  if (error) {
    throw new Error(`Error deleting contact: ${error.message}`);
  }

  // Section 4.2: Return Response
  return res.status(204).end();
}
