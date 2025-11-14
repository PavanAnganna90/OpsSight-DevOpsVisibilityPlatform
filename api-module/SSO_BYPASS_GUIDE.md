# SSO Bypass Guide

This guide explains how to bypass SSO authentication for development and testing purposes.

## 🔧 Quick Setup

### 1. Backend Configuration

Add these environment variables to your `.env` file:

```env
# SSO Configuration
ENABLE_SSO=false
SSO_BYPASS_DEV=true

# Development Authentication
DEV_AUTO_LOGIN=false
DEV_DEFAULT_USER_EMAIL=dev@example.com
DEV_DEFAULT_USER_PASSWORD=DevPassword123
```

### 2. Start the API

```bash
cd api-module
npm run dev
```

The API will automatically create a development user and enable bypass mode.

### 3. Frontend Integration

Add this to your frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🚀 Using SSO Bypass

### Method 1: Development Authentication Page

Visit the development authentication page in your frontend:

```
http://localhost:3000/dev-auth
```

Click "🔓 Bypass SSO" to automatically authenticate with the development user.

### Method 2: API Endpoint

Get a development token directly from the API:

```bash
curl http://localhost:3001/api/auth/dev-token
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "dev@example.com",
      "name": "Development User",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "message": "Development authentication successful",
    "bypass": true
  }
}
```

### Method 3: Auto-Login (Frontend Hook)

Use the React hook in your components:

```typescript
import { useAuthBypass } from '@/lib/auth-bypass';

function MyComponent() {
  const { autoLogin, isAuthenticated } = useAuthBypass();
  
  useEffect(() => {
    if (!isAuthenticated()) {
      autoLogin();
    }
  }, []);
  
  // Component code...
}
```

## 📡 API Endpoints

### Check SSO Status
```http
GET /api/auth/sso-status
```

Response:
```json
{
  "success": true,
  "data": {
    "ssoEnabled": false,
    "ssoBypassDev": true,
    "environment": "development",
    "authType": "bypass"
  }
}
```

### Get Development Token
```http
GET /api/auth/dev-token
```

Available only in development mode when `SSO_BYPASS_DEV=true`.

## 🔒 Security Considerations

### Development Only
- SSO bypass only works when `NODE_ENV=development`
- Bypass endpoints return 403 in production
- Development user is created with admin privileges for testing

### Production Safety
- Set `ENABLE_SSO=true` in production
- Set `SSO_BYPASS_DEV=false` in production
- Development endpoints are automatically disabled

### Environment Variables

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `ENABLE_SSO` | `false` | `true` | Enable/disable SSO authentication |
| `SSO_BYPASS_DEV` | `true` | `false` | Allow development bypass |
| `NODE_ENV` | `development` | `production` | Environment mode |

## 🛠 Frontend Components

### DevBypass Component
A React component that provides a UI for SSO bypass:

```jsx
import { DevBypassComponent } from '@/components/auth/DevBypass';

function AuthPage() {
  return <DevBypassComponent />;
}
```

Features:
- Check bypass availability
- Authenticate with development user
- Display current user info
- Auto-login functionality
- Logout capability

### Auth Bypass Hook
A React hook for programmatic access:

```jsx
import { useAuthBypass } from '@/lib/auth-bypass';

const {
  checkBypassAvailability,
  performBypass,
  autoLogin,
  isAuthenticated,
  getCurrentUser,
  logout
} = useAuthBypass();
```

## 🔄 How It Works

### Backend Flow
1. Environment variables are validated on startup
2. If `SSO_BYPASS_DEV=true` and `NODE_ENV=development`:
   - Development endpoints are enabled
   - Conditional auth middleware is applied
   - Development user is created automatically

### Frontend Flow
1. Check if bypass is available via `/api/auth/sso-status`
2. If available, call `/api/auth/dev-token` to get JWT
3. Store token in localStorage
4. Include token in subsequent API requests

### Middleware Behavior
- **Development**: Uses bypass middleware that auto-authenticates
- **Production**: Uses regular JWT authentication middleware
- **Conditional**: Switches based on environment variables

## 🧪 Testing

### Unit Tests
The bypass functionality includes comprehensive tests:

```bash
npm run test:unit -- --grep="bypass"
```

### Integration Tests
Test the bypass endpoints:

```bash
npm run test:integration -- --grep="auth bypass"
```

### Manual Testing

1. **Verify bypass availability**:
   ```bash
   curl http://localhost:3001/api/auth/sso-status
   ```

2. **Get development token**:
   ```bash
   curl http://localhost:3001/api/auth/dev-token
   ```

3. **Test protected endpoint**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3001/api/users/profile
   ```

## 🔧 Troubleshooting

### Bypass Not Available
- Check `NODE_ENV=development`
- Verify `SSO_BYPASS_DEV=true`
- Ensure API is running on correct port

### Token Issues
- Clear localStorage: `localStorage.clear()`
- Check token expiration
- Verify JWT_SECRET is consistent

### Database Issues
- Run migrations: `npm run prisma:migrate`
- Seed database: `npm run prisma:seed`
- Check database connection

### CORS Issues
- Set `CORS_ORIGIN=http://localhost:3000`
- Check frontend port matches CORS setting
- Verify API is accessible from frontend

## 📝 Example Usage

### Complete Development Setup

1. **Backend Setup**:
   ```bash
   cd api-module
   cp .env.example .env
   # Edit .env with bypass settings
   npm install
   npm run prisma:migrate
   npm run dev
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Test Bypass**:
   ```bash
   # Open browser
   http://localhost:3000/dev-auth
   # Click "Bypass SSO"
   # Navigate to dashboard
   ```

### Integration with Existing Auth

If you have existing authentication, you can integrate bypass:

```typescript
// Check if bypass is available
const bypassAvailable = await authBypass.checkBypassAvailability();

if (bypassAvailable && process.env.NODE_ENV === 'development') {
  // Use bypass in development
  await authBypass.autoLogin();
} else {
  // Use regular SSO in production
  redirectToSSO();
}
```

## 🎯 Best Practices

1. **Environment Separation**: Never enable bypass in production
2. **Token Management**: Use short-lived tokens even in development
3. **User Permissions**: Test with both USER and ADMIN roles
4. **Documentation**: Keep bypass usage documented for team
5. **Cleanup**: Remove bypass tokens when switching to production

---

This bypass system provides a seamless development experience while maintaining production security. The bypass is automatically disabled in production environments, ensuring your application remains secure.