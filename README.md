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
- Node.js 18+ and npm 8+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/masochist666/dj-thrift-marketplace.git
   cd dj-thrift-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   
   # Frontend environment
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

4. **Database Setup**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

### Docker Setup (Alternative)

```bash
# Start all services with Docker
npm run docker:up

# Or build and start
npm run docker:build
npm run docker:up
```

## 📁 Project Structure

```
dj-thrift-marketplace/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   └── package.json
├── frontend/               # Next.js React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Next.js pages
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── services/      # API services
│   └── package.json
├── scripts/               # Setup and deployment scripts
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev          # Start with nodemon
npm run build        # Build for production
npm test            # Run tests
```

### Frontend Development
```bash
cd frontend
npm run dev         # Start Next.js dev server
npm run build       # Build for production
npm test           # Run tests
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dj_thrift
DB_USER=your_username
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## 📊 Database Schema

The application uses PostgreSQL with the following main entities:
- **Users**: User accounts and profiles
- **Tracks**: Audio files with metadata
- **Trades**: Peer-to-peer trading system
- **Payments**: Stripe payment integration
- **Groups**: DJ record pools
- **Notifications**: Real-time notifications

## 🔐 Security Features

- JWT-based authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- Secure file uploads with presigned URLs
- Encrypted password storage
- CORS protection
- Helmet.js security headers

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker-compose up -d
```

### Environment Variables for Production
Ensure all environment variables are properly configured for your production environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.djthrift.com](https://docs.djthrift.com)
- **Issues**: [GitHub Issues](https://github.com/masochist666/dj-thrift-marketplace/issues)
- **Email**: support@djthrift.com

## 🙏 Acknowledgments

- Built with ❤️ for the DJ community
- Powered by modern web technologies
- Inspired by peer-to-peer trading platforms

---

**🎶 Happy Trading! 🎶**