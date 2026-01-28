# Setup & Run Guide

## Prerequisites
- Install [Node.js](https://nodejs.org/en/download) (v18 or higher)
- Git for cloning the repository

## Initial Setup

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd SeniorCapstone

# Install Server dependencies
cd Server
npm install

# Install Client dependencies
cd ../Client
npm install
```

### 2. Environment Configuration

#### Server (.env)
The Server/.env file is already configured for development. Key variables:
- `NODE_ENV=development` - Development mode
- `DB_TYPE=sqlite` - Use SQLite for local development
- `PORT=5000` - Server port
- `JWT_SECRET` - JWT secret key (change in production)
- `JWT_REFRESH_SECRET` - Refresh token secret (change in production)

For production with MySQL:
```env
DB_TYPE=mysql
MYSQL_HOST=your-host
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DB=capstone
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:5000
```

## Running the Application

### Development Mode

**Terminal 1 - Server:**
```bash
cd Server
npm start
# Or with nodemon for auto-reload:
npm run dev
```

The server will start on `http://localhost:5000`

**Terminal 2 - Client:**
```bash
cd Client
npm run dev
```

The client will start on `http://localhost:5173`

## Features Implemented

### Authentication System
- ✅ User Registration with email validation
- ✅ User Login with JWT tokens
- ✅ Refresh token mechanism (7-day expiry)
- ✅ Access token expiry (15 minutes)
- ✅ Logout with token invalidation
- ✅ Protected routes
- ✅ Automatic token refresh

### Database
- ✅ SQLite for development (automatic database initialization)
- ✅ MySQL support for production
- ✅ User table with password hashing (bcrypt)
- ✅ Session management table for refresh tokens

### API Endpoints

**Authentication Routes** (`/api/auth`)
- `POST /register` - Register new user
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string (min 6 chars)"
  }
  ```
- `POST /login` - Login user
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- `POST /refresh-token` - Get new access token
  ```json
  {
    "refreshToken": "string"
  }
  ```
- `POST /logout` - Logout user (requires auth)
  ```json
  {
    "refreshToken": "string"
  }
  ```
- `GET /profile` - Get user profile (requires auth)

### Client Components

**AuthContext.jsx**
- Manages authentication state globally
- Provides `useAuth()` hook
- Available methods: `login`, `register`, `logout`, `refreshAccessToken`

**Login.jsx**
- Combined login/register form
- Email validation
- Password confirmation
- Error handling

**ProtectedRoute.jsx**
- Wrapper component for protected routes
- Redirects unauthenticated users to login
- Shows loading state during auth check

## Project Structure

```
SeniorCapstone/
├── Server/
│   ├── config/
│   │   ├── auth.js           # JWT generation & verification
│   │   └── database.js       # Database initialization & queries
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   ├── routes/
│   │   └── auth.js           # Authentication endpoints
│   ├── data/
│   │   └── database.db       # SQLite database (auto-created)
│   ├── index.js              # Main server file
│   ├── package.json
│   └── .env                  # Environment variables
│
└── Client/
    ├── src/
    │   ├── Components/
    │   │   ├── AuthContext.jsx    # Auth context provider
    │   │   ├── Login.jsx          # Login/Register component
    │   │   └── ProtectedRoute.jsx # Route protection
    │   ├── styles/
    │   │   └── Login.css          # Login page styles
    │   ├── GameComponents/        # Existing game components
    │   ├── App.jsx                # Main app with routing
    │   └── main.jsx
    ├── package.json
    └── .env                       # Environment variables
```

## Troubleshooting

### "CORS error" when logging in
- Ensure `CLIENT_URL` in Server .env matches your client URL
- Default is `http://localhost:5173` for development

### "Database initialization error"
- Check that `/Server/data` directory exists
- Ensure write permissions in the data directory
- For SQLite, the database.db file is created automatically

### "Port already in use"
- Server: Change `PORT` in `.env` (default: 5000)
- Client: Vite will use next available port (default: 5173)

### Login not working
- Verify the server is running (`http://localhost:5000/api/health`)
- Check browser console for CORS errors
- Verify credentials are correct (min 6 character password)

## Next Steps

1. **Customize Login Page** - Add your branding and styling
2. **Add User Profile Page** - Show user information
3. **Implement OAuth** - Add Google/Microsoft authentication
4. **Add Email Verification** - Send verification emails on registration
5. **Implement Password Reset** - Allow users to reset forgotten passwords

## Security Notes

⚠️ **Important for Production:**
- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` in .env
- Use HTTPS instead of HTTP
- Implement rate limiting on auth endpoints
- Add CSRF protection
- Use strong database passwords for MySQL
- Enable HTTPS-only cookies
- Implement account lockout after failed login attempts

## Support

For issues or questions:
1. Check the browser console for error messages
2. Check the server terminal for console logs
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed (`npm install`)

