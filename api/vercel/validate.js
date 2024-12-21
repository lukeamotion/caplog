export function validateRequest(schema) {
    return (req, res, next) => {
      try {
        // Skip validation if no schema
        if (!schema) return next()
        
        // Validate request body
        const validated = schema.validate(req.body)
        req.body = validated
        
        return next()
      } catch (error) {
        return res.status(400).json({ 
          error: error.message 
        })
      }
    }
  }