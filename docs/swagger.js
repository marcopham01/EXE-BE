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
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin'] },
            provider: { type: 'string', enum: ['local', 'google'] },
            gender: { type: 'string', enum: ['male', 'female'] },
            birthDate: { type: 'string', format: 'date-time' },
            job: { type: 'string', enum: ['Học sinh', 'Sinh viên', 'Đã đi làm'] },
            heightCm: { type: 'number' },
            weightKg: { type: 'number' },
            premiumMembership: { type: 'boolean' },
            premiumMembershipExpires: { type: 'string', format: 'date-time' },
            premiumMembershipType: { type: 'string', enum: ['monthly'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user_id: { type: 'string' },
            type: { type: 'string', enum: ['premium_success','meal_plan_created','weekly_kcal_summary','generic'] },
            title: { type: 'string' },
            message: { type: 'string' },
            data: { type: 'object' },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        PaginatedNotifications: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Notification' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
        PaginatedUsers: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' },
              },
            },
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username','password','fullName','email','birthDate','job'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
            phoneNumber: { type: 'string' },
            email: { type: 'string' },
            fullName: { type: 'string' },
            gender: { type: 'string', enum: ['male','female'] },
            birthDate: { type: 'string', format: 'date-time' },
            job: { type: 'string', enum: ['Học sinh','Sinh viên','Đã đi làm'] },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username','password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        CreateNotificationRequest: {
          type: 'object',
          required: ['title','message'],
          properties: {
            type: { type: 'string', enum: ['premium_success','meal_plan_created','weekly_kcal_summary','generic'] },
            title: { type: 'string' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Meal: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            ingredients: { type: 'array', items: { type: 'string' } },
            instructions: { type: 'array', items: { type: 'string' } },
            image: { type: 'string' },
            category: { type: 'string' },
            subCategory: { type: 'string' },
            dietType: { type: 'string', enum: ['Giảm cân','Tăng cân','Eat clean'] },
            totalKcal: { type: 'number' },
            tag: { type: 'array', items: { type: 'string' } },
            mealTime: { type: 'array', items: { type: 'string', enum: ['breakfast','lunch','dinner'] } },
            rating: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MealCreateRequest: {
          type: 'object',
          required: ['name','description','ingredients','instructions','category','subCategory','dietType','totalKcal','tag','mealTime'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            ingredients: { type: 'array', items: { type: 'string' } },
            instructions: { type: 'array', items: { type: 'string' } },
            image: { type: 'string' },
            category: { type: 'string' },
            subCategory: { type: 'string' },
            dietType: { type: 'string', enum: ['Giảm cân','Tăng cân','Eat clean'] },
            totalKcal: { type: 'number' },
            tag: { type: 'array', items: { type: 'string' } },
            mealTime: { type: 'array', items: { type: 'string', enum: ['breakfast','lunch','dinner'] } },
          },
        },
        MealPlan: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user_id: { type: 'string' },
            input: {
              type: 'object',
              properties: {
                heightCm: { type: 'number' },
                weightKg: { type: 'number' },
                activityLevel: { type: 'string' },
                goal: { type: 'string' },
              },
            },
            result: {
              type: 'object',
              properties: {
                bmi: { type: 'number' },
                bmiClass: { type: 'string' },
                bmr: { type: 'number' },
                tdee: { type: 'number' },
                calorieTarget: { type: 'number' },
                breakdown: {
                  type: 'object',
                  properties: { breakfast: { type: 'number' }, lunch: { type: 'number' }, dinner: { type: 'number' } },
                },
                dietType: { type: 'string' },
                meals: { type: 'object' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            order_code: { type: 'integer' },
            amount: { type: 'number' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['pending','paid','cancelled','failed'] },
            user_id: { type: 'string' },
            checkout_url: { type: 'string' },
            qr_code: { type: 'string' },
            premium_package_type: { type: 'string', enum: ['monthly','trial'] },
            expiredAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreatePaymentRequest: {
          type: 'object',
          required: ['premium_package_type'],
          properties: {
            amount: { type: 'number' },
            premium_package_type: { type: 'string', enum: ['monthly','trial'] },
          },
        },
        UpdatePaymentStatusRequest: {
          type: 'object',
          required: ['order_code','status'],
          properties: {
            order_code: { type: 'integer' },
            status: { type: 'string', enum: ['pending','paid','cancelled','failed'] },
          },
        },
        PaginatedMeals: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Meal' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' },
              },
            },
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
        PaginatedMealPlans: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { $ref: '#/components/schemas/MealPlan' } },
            pagination: {
              type: 'object',
              properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } },
            },
          },
        },
        PaginatedPayments: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' },
              },
            },
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
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

