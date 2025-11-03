const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EXE201 Backend API',
      version: '1.0.0',
      description: 'Auto-generated docs from JSDoc annotations',
    },
    servers: [
      { url: '/api' },
    ],
  },
  apis: [
    './routes/*.js',
  ],
};

module.exports = swaggerJsdoc(options);

