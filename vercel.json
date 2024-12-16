{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "headers": { "x-subdomain": "logentries" },
      "dest": "/api/logentries/$1",
      "methods": ["GET", "POST", "PATCH", "DELETE"]
    },
    {
      "src": "/(.*)",
      "headers": { "x-subdomain": "contacts" },
      "dest": "/api/contacts/$1",
      "methods": ["GET", "POST", "PATCH", "DELETE"]
    },
    {
      "src": "/(.*)",
      "headers": { "x-subdomain": "companies" },
      "dest": "/api/companies/$1",
      "methods": ["GET", "POST", "PATCH", "DELETE"]
    },
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
