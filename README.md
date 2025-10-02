# 🧠 Brainac Backend

Node.js TypeScript backend for the Brainac educational platform, providing REST API for authentication, content delivery, subscription management, and admin functionality.

## 🌟 Features

### 🔐 Authentication & User Management
- **Firebase Authentication** integration with email/password
- **Class-based Registration** (Classes 6-10)
- **User Profile Management** with grade information
- **Session Management** with secure token handling
- **Admin Authentication** with JWT tokens

### 💳 Subscription System
- **3-Day Free Trial** for all new users
- **Razorpay Payment Integration** with multiple plans
- **Subscription Status Tracking** and renewal management
- **Payment History** and transaction records

### 📚 Dynamic Content Delivery
- **Class-Specific Content** (Classes 6-10)
- **Subject-wise Organization** with different subjects per class
- **Video Learning Content** with educational videos
- **Progress Tracking** and engagement metrics

### �️ Admin Dashboard API
- **User Management** - View, edit, and manage user accounts
- **Content Management** - Administer subjects and videos
- **Payment Analytics** - Monitor subscriptions and payments
- **System Administration** - Database migration and data population

## �🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB database
- Firebase project with Authentication enabled
- Razorpay account for payments

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your credentials:
   ```env
   # Environment Configuration
   NODE_ENV=development
   PORT=5000

   # Firebase Admin SDK Configuration
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_client_email

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # API Configuration
   API_VERSION=v1
   API_PREFIX=/api

   # Security
   BCRYPT_ROUNDS=12

   # Admin Authentication
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_secure_admin_password

   # JWT Secret for Admin Token Generation
   JWT_SECRET=your_jwt_secret_key_here
   ```

3. **Run database migrations (if needed):**
   ```bash
   npm run migrate
   ```

4. **Populate initial subjects data:**
   ```bash
   npm run populate-subjects
   ```

5. **Build and start the server:**
   ```bash
   npm run build
   npm run dev
   ```

   The backend will run on `http://localhost:5000`

## 🔧 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user with class info
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Content Routes (`/api/subjects`)
- `GET /subjects` - Get subjects for user's class
- `GET /videos/:subjectId?` - Get class-specific videos
- `GET /video/:videoId` - Get single video details

### Subscription Routes (`/api/subscription`)
- `GET /plans` - Get available subscription plans
- `POST /create-order` - Create Razorpay payment order
- `POST /verify-payment` - Verify payment and activate subscription
- `GET /status` - Get subscription status
- `POST /cancel` - Cancel subscription

### Admin Routes (`/api/admin`)
- `POST /login` - Admin login
- `GET /users` - Get all users
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /payments` - Get payment history
- `GET /subjects` - Get all subjects
- `POST /subjects` - Create subject
- `PUT /subjects/:id` - Update subject
- `DELETE /subjects/:id` - Delete subject
- `GET /videos` - Get all videos
- `POST /videos` - Create video
- `PUT /videos/:id` - Update video
- `DELETE /videos/:id` - Delete video

## 🎯 Class-Specific Content

### Supported Classes
- **Class 6**: Core subjects (Math, Science, English, Hindi, History, Geography)
- **Class 7**: Extended curriculum (+ Civics)
- **Class 8**: Comprehensive subjects
- **Class 9**: Advanced topics (+ Economics)
- **Class 10**: Complete secondary curriculum

### Content Organization
Each class has:
- **Subject-specific videos** with educational content
- **Progress tracking** and completion status
- **Subscription-gated access** after trial period

## 💡 Key Technologies

- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **MongoDB** with **Mongoose** for data storage
- **Firebase Admin SDK** for authentication
- **Razorpay** for payment processing
- **JWT** for admin token management
- **Bcrypt** for password hashing
- **Express Rate Limit** for API protection
- **tsx** for development with hot reload

## 🔒 Security Features

- **Firebase Authentication** with secure token verification
- **API Route Protection** with authentication middleware
- **Admin JWT Authentication** for dashboard access
- **Subscription Validation** on content access
- **CORS Configuration** for secure cross-origin requests
- **Rate Limiting** to prevent abuse
- **Environment Variable Protection** for sensitive data

## 🚀 Deployment

1. Build the TypeScript code: `npm run build`
2. Deploy to your preferred platform (Heroku, Railway, Vercel, etc.)
3. Set environment variables in production
4. Configure MongoDB database
5. Configure Firebase service account

## 🔧 Development Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript to JavaScript
npm run start      # Start production server
npm run clean      # Clean build directory
npm run lint       # Lint code
npm run test       # Run tests
npm run migrate    # Run database migrations
npm run populate-subjects  # Populate initial subjects data
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for education and learning**