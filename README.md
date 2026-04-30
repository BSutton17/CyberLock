# Senior Capstone: Cyberpunk TTRPG Game

A full-stack, multiplayer Tabletop RPG (TTRPG) game set in a cyberpunk universe, featuring AI-driven NPCs, real-time combat, character creation, and dynamic storytelling powered by machine learning.

## 🎮 Project Overview

This capstone project is a three-tier application that combines modern web technologies with AI/ML capabilities:

- **Client**: React-based web interface with Vite for fast development
- **Server**: Node.js/Express backend handling authentication, game state, and real-time communication
- **AI API**: Python FastAPI service providing AI-driven NPC interactions, combat logic, and dynamic event generation

### Key Features

✅ **Authentication System** - User registration, login, and JWT-based session management  
✅ **Real-time Multiplayer** - Socket.IO for live game updates and player synchronization  
✅ **Character Creation** - Customizable cyberpunk-themed characters with attributes and abilities  
✅ **Dynamic Combat** - Turn-based combat with AI enemies and ability-based strategies  
✅ **AI NPCs** - Machine learning models generating contextual dialogue and decisions  
✅ **Persistent Memory** - Vector database (Chroma) for NPC memory and world context  
✅ **Level Progression** - Character advancement, ability unlocking, and stat scaling  
✅ **Real-time Chat** - In-game communication with AI-powered NPCs

## Prerequisites

- **Node.js** v18 or higher
- **Python** 3.10 or higher
- **Git** for repository management
- **CUDA 12.1** (optional, for GPU acceleration in AI model inference)

## Project Structure

```
cs-capstone/
├── Client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── Components/              # Auth, context, UI components
│   │   ├── GameComponents/          # Game screens and gameplay
│   │   │   ├── Main/                # Core game loop and combat
│   │   │   ├── CharacterBuilder/    # Character creation flow
│   │   │   ├── ChooseAbilities/     # Ability selection
│   │   │   ├── ChatBot/             # NPC chat interface
│   │   │   └── LevelUp/             # Progression screen
│   │   ├── Utils/                   # Game logic utilities
│   │   └── styles/                  # CSS styling
│   ├── public/                      # Static assets (audio, images)
│   └── package.json
│
├── Server/                          # Node.js/Express backend
│   ├── routes/                      # API route handlers
│   ├── middleware/                  # Auth and request middleware
│   ├── config/                      # Database and auth configuration
│   └── package.json
│
├── SeniorCapstone-Ai-API/           # Python AI/ML service
│   ├── app/
│   │   ├── model.py                 # ML model loading and inference
│   │   ├── memory.py                # Vector database integration
│   │   ├── combat.py                # Combat mechanics
│   │   ├── prompts.py               # LLM prompt engineering
│   │   └── schemas.py               # Data validation
│   ├── Training/                    # Model training scripts
│   ├── requirements.txt
│   └── main.py                      # FastAPI application
│
└── SETUP-RUN.md                     # Detailed setup guide
```

## Installation & Setup

### 1. Clone and Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd cs-capstone

# Install Server dependencies
cd Server
npm install

# Install Client dependencies
cd ../Client
npm install

# Install AI API dependencies
cd ../SeniorCapstone-Ai-API
pip install -r requirements.txt
```

### 2. Environment Configuration

#### Server Setup (`.env`)

The server configuration is set up for development by default. For custom settings:

```env
NODE_ENV=development
PORT=5000
DB_TYPE=sqlite              # Use 'mysql' for production
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
```

For **MySQL** (production):

```env
DB_TYPE=mysql
MYSQL_HOST=your-host
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DB=capstone
```

#### Client Setup (`.env`)

```env
VITE_API_URL=http://localhost:5000
```

#### AI API Setup

Create a `.env` file in `SeniorCapstone-Ai-API/`:

```env
MODEL_NAME=Meta-Llama-3-8B-Instruct      # HuggingFace model
HF_TOKEN=your-huggingface-token          # For private models
LOG_LEVEL=info
```

## Running the Application

### Development Mode (3 terminals required)

**Terminal 1 - Backend Server:**

```bash
cd Server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend Client:**

```bash
cd Client
npm run dev
# Client runs on http://localhost:5173
```

**Terminal 3 - AI API Service:**

```bash
cd SeniorCapstone-Ai-API
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# API runs on http://localhost:8000
```

### Production Build

```bash
# Build the React application
cd Client
npm run build

# Deploy built files and run server
cd ../Server
NODE_ENV=production npm start
```

## 🔧 Technology Stack

### Frontend

- **React 19** - UI framework
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Icons** - Icon library
- **Typewriter Effect** - Text animation

### Backend

- **Node.js/Express** - Server framework
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **SQLite/MySQL** - Database
- **Socket.IO** - WebSocket communication
- **CORS** - Cross-origin resource sharing

### AI/ML

- **FastAPI** - Python web framework
- **PyTorch** - Deep learning framework
- **Transformers** - HuggingFace model library
- **ChromaDB** - Vector database for memory
- **Sentence Transformers** - Text embeddings
- **Pydantic** - Data validation

## Game Flow

1. **Authentication** - Users register/login to access the game
2. **Character Creation** - Players build their cyberpunk character with attributes and abilities
3. **Home Screen** - Main hub to join multiplayer sessions or view profile
4. **Waiting Room** - Real-time player synchronization before combat
5. **Combat** - Turn-based battles with AI enemies
6. **NPC Interaction** - Chat with AI-powered characters for story progression
7. **Level Up** - Gain experience and unlock new abilities

## Authentication

The project uses JWT (JSON Web Tokens) with:

- **Access Token**: 15-minute expiry for API requests
- **Refresh Token**: 7-day expiry for obtaining new access tokens
- **Secure Refresh**: Automatic token rotation on the client
- **Password Security**: Bcrypt hashing with salt rounds

### Protected Routes

All game routes require valid authentication. Failed authentication redirects to login.

## 📡 API Endpoints

### Auth Endpoints (`/api/auth`)

- `POST /register` - Create new user account
- `POST /login` - Authenticate user and return tokens
- `POST /logout` - Invalidate session
- `POST /refresh` - Get new access token

### Game Endpoints

- Real-time game state updates via Socket.IO
- WebSocket namespaces for game rooms and combat

### AI API Endpoints (`/api`)

- `POST /game-event` - Generate NPC responses and game events
- `POST /memory/add` - Store NPC memories
- `POST /memory/retrieve` - Fetch contextual memories
- `GET /health` - Service health check

## 📊 Database Schema

### Users Table

- User ID, username, email, password hash
- Created/updated timestamps
- JWT session management

### Game State (In-Memory/Sessions)

- Player data, character stats, inventory
- Current combat state, opponent data
- Ability usage and cooldowns

### Vector Database (ChromaDB)

- NPC memory embeddings
- World context and lore
- Dialogue history

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 5000 (Server)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or use different ports
npm run dev -- --port 3000
```

### CORS Errors

Ensure `CORS_ORIGIN` in Server `.env` matches your client URL (default: `http://localhost:5173`)

### Database Connection Issues

- For SQLite: Database file created automatically in `Server/` directory
- For MySQL: Verify credentials and database exists
- Check `DB_TYPE` setting matches actual database

### AI Model Loading

- First run downloads model (~7-8GB) - requires internet connection
- GPU memory needed for inference (~6-8GB VRAM)
- Set `bitsandbytes` for 4-bit quantization to reduce memory usage

## Development Workflow

### Code Style

- Frontend: ESLint configuration in `Client/eslint.config.js`
- Backend: Standard Node.js conventions
- AI: PEP 8 Python style guide

### Running Linter

```bash
cd Client
npm run lint
```

### Building for Production

```bash
# Build frontend
cd Client
npm run build

# Ensure Server is configured for production
cd Server
NODE_ENV=production npm start
```

## Team & Credits

This is a senior capstone project developed as part of a computer science degree program. It demonstrates full-stack development, AI/ML integration, real-time communication, and game design principles.

## License

ISC

## Support

For issues or questions, refer to:

- `SETUP-RUN.md` for detailed setup instructions
- Individual component documentation in source files
- API route handlers for endpoint specifications
