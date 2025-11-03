const path = require('path');
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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [ { bearerAuth: [] } ],
  },
  // Dùng đường dẫn tuyệt đối để tránh lỗi khi chạy ở Render
  apis: [
    path.join(__dirname, '../routes/*.js'),
  ],
};

module.exports = swaggerJsdoc(options);

