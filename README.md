<<<<<<< HEAD
# 🎶 DJ Thrift Marketplace

A peer-to-peer DJ track trading platform built with modern web technologies. Trade, buy, and sell DJ tracks with built-in audio analysis, real-time trading, and community features.

## ✨ Features

### 🎵 Core Features
- **Track Upload & Management**: Upload tracks with automatic metadata extraction
- **Audio Analysis**: Automatic BPM, key detection, and waveform generation
- **Peer-to-Peer Trading**: Trade tracks directly with other DJs using credits or cash
- **Marketplace**: Browse and search tracks with advanced filtering
- **Real-time Features**: Live chat, notifications, and trading updates

### 🔧 Technical Features
- **Modern Stack**: React, Next.js, Node.js, PostgreSQL, Redis
- **Real-time**: WebSocket integration for live updates
- **Audio Processing**: FFmpeg integration for audio analysis
- **Cloud Storage**: AWS S3 integration for file storage
- **Payments**: Stripe integration for secure payments
- **Docker**: Containerized deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/dj-thrift-marketplace.git
   cd dj-thrift-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration
   
   # Frontend
   cp frontend/.env.local.example frontend/.env.local
   # Edit frontend/.env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Docker Deployment

1. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

2. **Run in background**
   ```bash
   docker-compose up -d
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## 📁 Project Structure

```
dj-thrift-marketplace/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   ├── migrations/          # Database migrations
│   └── tests/               # Backend tests
├── frontend/                # React/Next.js frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── shared/                  # Shared types and utilities
└── docker-compose.yml       # Docker configuration
```

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=dj_thrift

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-s3-bucket

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## 📊 API Documentation

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `PATCH /api/v1/auth/me/profile` - Update profile

### Tracks
- `GET /api/v1/tracks` - Search tracks
- `POST /api/v1/tracks` - Create track
- `GET /api/v1/tracks/:id` - Get track details
- `POST /api/v1/tracks/:id/upload-init` - Initialize upload
- `POST /api/v1/tracks/:id/upload-complete` - Complete upload

### Trading
- `GET /api/v1/trades` - Get user trades
- `POST /api/v1/trades` - Create trade
- `GET /api/v1/trades/:id` - Get trade details
- `POST /api/v1/trades/:id/respond` - Respond to trade

### Payments
- `POST /api/v1/payments/purchase` - Create purchase
- `GET /api/v1/payments/credits` - Get credits balance
- `POST /api/v1/payments/credits/add` - Add credits

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
```

### Frontend Tests
```bash
cd frontend
npm test                   # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Environment Setup
1. Set up PostgreSQL database
2. Set up Redis instance
3. Configure AWS S3 bucket
4. Set up Stripe account
5. Configure environment variables
6. Run database migrations
7. Deploy application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Express.js](https://expressjs.com/) - Node.js framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Redis](https://redis.io/) - Caching
- [Stripe](https://stripe.com/) - Payments
- [AWS S3](https://aws.amazon.com/s3/) - File storage
- [FFmpeg](https://ffmpeg.org/) - Audio processing

## 📞 Support

For support, email support@djthrift.com or join our Discord community.

---

Built with ❤️ for the DJ community
=======
# dj-thrift-marketplace
🎶 DJ Thrift Marketplace - Peer-to-peer DJ track trading platform with real-time features, audio analysis, and community tools
>>>>>>> 7b4fdedce9ab29492fa475e3f5ac5e3dfca45cdc
