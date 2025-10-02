# 🧠 Brainac Backend

Node.js TypeScript backend for the Brainac educational platform, providing REST API for authentication, content delivery, and subscription management.

## 🌟 Features

### 🔐 Authentication & User Management
- **Firebase Authentication** integration with email/password
- **Class-based Registration** (Classes 5-10)
- **User Profile Management** with grade information
- **Session Management** with secure token handling

### 💳 Subscription System
- **3-Day Free Trial** for all new users
- **Razorpay Payment Integration** with multiple plans:
  - Monthly Plan: ₹499/month
  - Quarterly Plan: ₹1,299/3 months (13% off)
  - Yearly Plan: ₹4,999/year (17% off)
- **Subscription Status Tracking** and renewal management

### 📚 Dynamic Content Delivery
- **Class-Specific Content** (Classes 5-10)
- **Subject-wise Organization** with different subjects per class
- **Video Learning Content** with dummy educational videos
- **Progress Tracking** and engagement metrics

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
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

   Update `.env` with your Firebase and Razorpay credentials:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_service_account_email

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Server Configuration
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

3. **Build and start the server:**
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

## 🎯 Class-Specific Content

### Supported Classes
- **Class 5**: Basic subjects (Math, Science, English, Hindi, Social Studies)
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
- **Firebase Admin SDK** for authentication
- **Razorpay** for payment processing
- **tsx** for development with hot reload

## 🔒 Security Features

- **Firebase Authentication** with secure token verification
- **API Route Protection** with authentication middleware
- **Subscription Validation** on content access
- **CORS Configuration** for secure cross-origin requests
- **Environment Variable Protection** for sensitive data

## 🚀 Deployment

1. Build the TypeScript code: `npm run build`
2. Deploy to your preferred platform (Heroku, Railway, Vercel, etc.)
3. Set environment variables in production
4. Configure Firebase service account

## 🔧 Development Scripts

```bash
npm run dev        # Start development server
npm run build      # Build TypeScript to JavaScript
npm run start      # Start production server
npm run clean      # Clean build directory
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for education and learning**