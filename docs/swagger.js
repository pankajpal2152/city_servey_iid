const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'City Survey Node.js API',
      version: '1.0.0',
      description: 'Backend APIs for City Survey health, authentication, user, customer, project, and master modules',
    },
    tags: [
      {
        name: 'Health',
        description: 'API status and deployment health checks'
      },
      {
        name: 'Auth',
        description: 'City Survey user authentication APIs'
      },
      {
        name: 'User',
        description: 'City Survey user list and profile add/update APIs'
      },
      {
        name: 'Customer',
        description: 'City Survey customer list, profile, and PIC add/update APIs'
      },
      {
        name: 'Project',
        description: 'City Survey project list, specific details, customer-wise details, and add/update APIs'
      },
      {
        name: 'Master',
        description: 'City Survey master data list and add/update APIs'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }],
    servers: [{ url: '/', description: 'Current API server' }]
  },
  apis: ['./routes/auth.js', './routes/user.js', './routes/customer.js', './routes/project.js', './routes/master.js', './routes/health.js']
};

module.exports = swaggerJsdoc(options);
