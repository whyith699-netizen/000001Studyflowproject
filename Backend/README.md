# StudyFlow Backend API

This is the backend API for StudyFlow, built with Express.js and MariaDB.

## Stack
- Node.js + Express
- MariaDB
- JSON Web Tokens (JWT) for Authentication

## Setup

1. Copy `.env.example` to `.env` and fill in the database credentials.
2. Initialize the database:
   ```bash
   cd studyflow-api
   npm install
   npm run init-db
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Authentication

Authentication is handled via JWT. The API supports Email/Password login and Google Sign-In.

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/google` - Login with a Google Access Token

## Endpoints

All authenticated endpoints require a valid JWT token in the `Authorization` header:
`Authorization: Bearer <jwt_token>`

- `/api/auth` - Authentication routes
- `/api/users` - User profile routes
- `/api/classes` - Class management
- `/api/tasks` - Task management
- `/api/study-tools` - Study tools configuration
- `/api/study-sessions` - Study sessions tracking
- `/api/calendar-events` - Calendar events
- `/api/uniforms` - Uniform settings
- `/api/achievements` - User achievements
- `/api/friends` - Friends management
- `/api/inbox` - Notifications inbox
