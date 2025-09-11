# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables Setup
Create a `.env.production` file with all required variables:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sonipainting?retryWrites=true&w=majority

# Authentication
NEXTAUTH_SECRET=your-super-secure-secret-key-minimum-32-characters
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Redis
REDIS_URL=https://your-redis-instance.upstash.io
REDIS_TOKEN=your-redis-token

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google APIs
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key
GOOGLE_PLACE_ID=your-google-place-id

# Frontend
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com

# Twilio (Optional - for SMS verification)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

### 2. Security Configuration

#### SSL/TLS Certificate
- Ensure SSL certificate is properly configured
- Use HTTPS for all communications
- Set up HSTS headers

#### Security Headers
The application includes comprehensive security headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Content-Security-Policy: Configured for your domain

#### Rate Limiting
- API endpoints are protected with rate limiting
- Contact form: 3 submissions per hour
- Reviews: 1 review per day per IP
- General API: 100 requests per minute

### 3. Database Setup

#### MongoDB Atlas Configuration
1. Create a MongoDB Atlas cluster
2. Set up database user with appropriate permissions
3. Configure IP whitelist
4. Enable backup and monitoring

#### Database Indexes
Ensure these indexes are created for optimal performance:
```javascript
// Contact collection
db.contact.createIndex({ "status": 1, "createdAt": -1 })
db.contact.createIndex({ "email": 1 })
db.contact.createIndex({ "createdAt": -1 })

// Review collection
db.review.createIndex({ "status": 1, "createdAt": -1 })
db.review.createIndex({ "phone": 1, "serviceType": 1 })
db.review.createIndex({ "rating": 1 })
db.review.createIndex({ "serviceType": 1, "status": 1 })

// Quotation collection
db.quotation.createIndex({ "quotationNumber": 1 })
db.quotation.createIndex({ "createdAt": -1 })

// Project collection
db.project.createIndex({ "projectId": 1 })
db.project.createIndex({ "quotationNumber": 1 })

// Invoice collection
db.invoice.createIndex({ "invoiceId": 1 })
db.invoice.createIndex({ "projectId": 1 })

// Portfolio collection
db.portfolio.createIndex({ "createdAt": -1 })

// Audit Log collection
db.auditlog.createIndex({ "createdAt": -1 })
db.auditlog.createIndex({ "userId": 1, "createdAt": -1 })
```

### 4. Redis Setup

#### Upstash Redis Configuration
1. Create Upstash Redis database
2. Configure connection settings
3. Set up monitoring and alerts
4. Configure backup strategy

### 5. Cloudinary Setup

#### Image Optimization
1. Configure automatic image optimization
2. Set up responsive image transformations
3. Configure secure upload settings
4. Set up backup and monitoring

## 🏗️ Deployment Options

### Option 1: Vercel (Recommended)

#### Prerequisites
- Vercel account
- GitHub repository
- All environment variables configured

#### Deployment Steps
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

#### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Option 2: AWS Amplify

#### Prerequisites
- AWS account
- GitHub repository
- All environment variables configured

#### Deployment Steps
1. Connect GitHub repository to AWS Amplify
2. Configure build settings
3. Set environment variables
4. Deploy

#### Build Settings
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Option 3: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - REDIS_URL=${REDIS_URL}
      - REDIS_TOKEN=${REDIS_TOKEN}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - NEXT_PUBLIC_GOOGLE_API_KEY=${NEXT_PUBLIC_GOOGLE_API_KEY}
      - GOOGLE_PLACE_ID=${GOOGLE_PLACE_ID}
      - NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL}
    restart: unless-stopped
```

## 🔧 Post-Deployment Configuration

### 1. Domain Configuration
- Set up custom domain
- Configure DNS settings
- Set up SSL certificate
- Configure redirects

### 2. Monitoring Setup

#### Application Monitoring
- Set up error tracking (Sentry, LogRocket)
- Configure performance monitoring
- Set up uptime monitoring
- Configure log aggregation

#### Database Monitoring
- Set up MongoDB monitoring
- Configure Redis monitoring
- Set up alerting for performance issues

### 3. Backup Strategy

#### Database Backups
- Configure automated MongoDB backups
- Set up Redis backup strategy
- Test backup restoration process

#### Application Backups
- Set up code repository backups
- Configure environment variable backups
- Set up configuration backups

### 4. Security Hardening

#### Additional Security Measures
- Set up Web Application Firewall (WAF)
- Configure DDoS protection
- Set up intrusion detection
- Configure security scanning

#### Access Control
- Set up admin access controls
- Configure API access limits
- Set up monitoring for suspicious activity

## 📊 Performance Optimization

### 1. Caching Strategy
- Redis caching is implemented for frequently accessed data
- Browser caching is configured for static assets
- CDN caching for images and static files

### 2. Database Optimization
- Indexes are configured for optimal query performance
- Connection pooling is implemented
- Query optimization is in place

### 3. Image Optimization
- Cloudinary integration for automatic image optimization
- Responsive images with proper sizing
- Lazy loading for better performance

## 🔍 Monitoring and Maintenance

### 1. Health Checks
- Set up health check endpoints
- Configure monitoring alerts
- Set up automated testing

### 2. Log Management
- Configure log aggregation
- Set up log analysis
- Configure log retention policies

### 3. Performance Monitoring
- Set up performance metrics
- Configure alerting for performance issues
- Set up capacity planning

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
- Check MongoDB connection string
- Verify network connectivity
- Check authentication credentials

#### Redis Connection Issues
- Verify Redis URL and token
- Check network connectivity
- Verify Redis instance status

#### Image Upload Issues
- Check Cloudinary configuration
- Verify API keys and secrets
- Check file size and type restrictions

#### Authentication Issues
- Verify Google OAuth configuration
- Check NextAuth configuration
- Verify session configuration

### Support and Maintenance

#### Regular Maintenance Tasks
- Update dependencies regularly
- Monitor security vulnerabilities
- Review and update security configurations
- Monitor performance metrics
- Review and update backup strategies

#### Emergency Procedures
- Incident response plan
- Rollback procedures
- Data recovery procedures
- Communication plan

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Vercel Documentation](https://vercel.com/docs)

## 🎯 Success Metrics

### Performance Metrics
- Page load time < 2 seconds
- API response time < 500ms
- 99.9% uptime
- Error rate < 0.1%

### Security Metrics
- Zero security vulnerabilities
- All security headers properly configured
- Rate limiting working effectively
- Input validation preventing attacks

### User Experience Metrics
- Accessibility score > 95%
- Mobile responsiveness score > 95%
- User satisfaction score > 4.5/5
- Contact form conversion rate > 5%
