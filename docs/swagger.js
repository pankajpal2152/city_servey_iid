const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'City Survey Node.js API',
      version: '1.0.0',
      description: 'Backend APIs for City Survey user management and authentication',
    },
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
  apis: ['./routes/auth.js', './routes/user.js']
};

module.exports = swaggerJsdoc(options);
