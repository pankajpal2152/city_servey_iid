const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'City Survey Node.js API',
      version: '1.0.0',
      description: 'Backend APIs for City Survey health, authentication, user, customer, and project modules',
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
        description: 'City Survey user profile add/update APIs'
      },
      {
        name: 'Customer',
        description: 'City Survey customer details and PIC add/update APIs'
      },
      {
        name: 'Project',
        description: 'City Survey project add/update APIs'
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
  apis: ['./routes/auth.js', './routes/user.js', './routes/customer.js', './routes/project.js', './routes/health.js']
};

module.exports = swaggerJsdoc(options);
