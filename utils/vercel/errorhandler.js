export function handleErrors(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`[Error] ${error.message}`, error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'An unexpected error occurred.',
      });
    }
  };
}
