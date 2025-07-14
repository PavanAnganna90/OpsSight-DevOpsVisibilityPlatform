# OpsSight Mobile App

React Native mobile application for OpsSight DevOps platform.

## Overview

Cross-platform mobile app providing:
- Real-time monitoring dashboards
- Push notifications for alerts
- Mobile-optimized UI/UX
- Offline data capabilities
- Biometric authentication
- Team-based collaboration
- Multi-tenant support

## Tech Stack

- **React Native 0.72** with Expo SDK 49
- **TypeScript** for type safety
- **Redux Toolkit** for state management
- **React Navigation 6** for navigation
- **React Native Paper** for UI components
- **React Query** for data fetching
- **Async Storage** for local data persistence
- **Expo Local Authentication** for biometric auth
- **Push Notifications** (FCM/APNs)
- **EAS Build** for CI/CD

## Features

### ✅ Completed Features
- **Project Structure**: Complete TypeScript setup with organized folder structure
- **Navigation**: Stack and tab navigation with type-safe routing
- **State Management**: Redux Toolkit with persistent storage
- **Authentication**: Login/register screens with biometric support
- **Dashboard**: Real-time monitoring with customizable widgets
- **Alerts**: System notifications and alerts management
- **Teams**: Team management and collaboration features
- **Settings**: Comprehensive app settings with theme support
- **Offline Support**: Data caching and offline action queuing
- **Error Handling**: Global error boundary and error management
- **Theme Support**: Light/dark theme with system preference support

### 🔄 In Progress
- Backend API integration
- Real-time WebSocket connections
- Push notification implementation
- Biometric authentication setup

### 📋 Pending
- E2E testing with Detox
- Performance optimization
- App store deployment
- Deep linking implementation

## Development

### Prerequisites
- Node.js 16+
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Emulator (for Android development)

### Setup
```bash
# Install dependencies
cd mobile && npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

### Scripts
```bash
# Development
npm start              # Start Expo development server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm run web           # Run on web browser

# Building
npm run build         # Build for production
npm run build:android # Build Android APK
npm run build:ios     # Build iOS app

# Testing
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

## Project Structure

```
mobile/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── ErrorBoundary.tsx
│   ├── screens/          # Screen components
│   │   ├── auth/         # Authentication screens
│   │   ├── DashboardScreen.tsx
│   │   ├── AlertsScreen.tsx
│   │   ├── TeamsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── NotificationsScreen.tsx
│   ├── navigation/       # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── store/           # Redux store and slices
│   │   ├── store.ts
│   │   └── slices/
│   ├── providers/       # React context providers
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── LoadingProvider.tsx
│   │   └── NetworkProvider.tsx
│   ├── services/        # API and external services
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── constants/       # App constants and configuration
├── assets/              # Images, fonts, and other assets
├── __tests__/           # Test files
├── App.tsx             # Main app component
├── app.json            # Expo configuration
├── eas.json            # EAS Build configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## State Management

The app uses Redux Toolkit with the following slices:
- **auth**: User authentication and session management
- **settings**: App settings and preferences
- **dashboard**: Dashboard widgets and configuration
- **notifications**: Push notifications and alerts
- **offline**: Offline data caching and sync

## Navigation Structure

```
AuthNavigator (when not authenticated)
├── Onboarding
├── Login
├── Register
├── ForgotPassword
└── BiometricSetup

AppNavigator (when authenticated)
├── MainTabNavigator
│   ├── Dashboard
│   ├── Alerts
│   ├── Teams
│   └── Profile
├── Notifications
└── Settings
```

## API Integration

The app is designed to work with the OpsSight backend API:
- Base URL: `http://localhost:8000/api/v1` (development)
- Authentication: JWT tokens with refresh mechanism
- Real-time updates: WebSocket connections
- Offline support: Request queuing and data caching

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

Test setup includes:
- Jest for unit testing
- React Native Testing Library
- Mocked dependencies (AsyncStorage, NetInfo, etc.)
- Coverage reporting

## Building and Deployment

### EAS Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for development
eas build --platform android --profile development

# Build for production
eas build --platform all --profile production
```

### Local Builds
```bash
# Build locally (requires setup)
npm run build:android
npm run build:ios
```

## Configuration

### Environment Variables
Create a `.env` file in the mobile directory:
```
API_BASE_URL=http://localhost:8000/api/v1
WEBSOCKET_URL=ws://localhost:8000/ws
SENTRY_DSN=your-sentry-dsn
```

### Deep Linking
The app supports deep linking with the `opssight://` scheme:
- `opssight://dashboard` - Navigate to dashboard
- `opssight://alerts` - Navigate to alerts
- `opssight://teams/:teamId` - Navigate to specific team

## Performance Optimization

- **Bundle Splitting**: Lazy loading for screens
- **Image Optimization**: Compressed assets and lazy loading
- **Memory Management**: Proper cleanup of listeners and subscriptions
- **Offline First**: Data caching and background sync

## Security Features

- **Biometric Authentication**: Fingerprint and Face ID support
- **Secure Storage**: Encrypted token storage
- **Certificate Pinning**: API request security
- **App Lock**: Auto-lock with timeout options

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run linting and tests
6. Submit a pull request

## Troubleshooting

### Common Issues
- **Metro bundler issues**: Clear cache with `npx expo start --clear`
- **iOS simulator issues**: Reset simulator and rebuild
- **Android emulator issues**: Check AVD configuration
- **Package conflicts**: Delete node_modules and reinstall

### Debug Mode
```bash
# Enable debug mode
npm start -- --dev-client

# View logs
npx expo logs
```

## License

MIT License - see the [LICENSE](../LICENSE) file for details. 