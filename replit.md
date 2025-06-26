# Discord Bot with Web Dashboard

## Overview

This is a full-stack Discord bot application with a modern web dashboard built using React, Express, and PostgreSQL. The bot features moderation tools, fun commands, utility functions, and a comprehensive web interface for monitoring and management.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Bot Framework**: Discord.js v14 for Discord API integration
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: Connect-pg-simple for PostgreSQL sessions
- **Runtime**: Node.js 20 with ES modules

### Bot Architecture
- **Command System**: Slash commands with modular organization
- **Event Handling**: Centralized event management system
- **Permission System**: Role-based access control with rate limiting
- **Logging**: Custom logger with timestamps and levels
- **Categories**: Basic, Moderation, Fun, and Utility commands

## Key Components

### Database Schema (Drizzle ORM)
- **Users**: Authentication and user management
- **Guilds**: Discord server configuration and settings
- **Moderation Logs**: Action tracking for moderation events
- **Bot Stats**: Command usage analytics and metrics
- **User Levels**: Experience points and level progression tracking
- **Message Stats**: Daily/weekly/monthly message count tracking
- **Giveaways & Entries**: Complete giveaway management system
- **Server Boosts**: Boost tracking with announcements
- **Guild Configs**: Role assignment and channel configurations

### Discord Bot Features
- **Moderation Commands**: Kick, ban, timeout with reason logging
- **Fun Commands**: Dice rolling, games, and entertainment
- **Utility Commands**: Server info, user info, help system
- **Basic Commands**: Ping, help, and status monitoring
- **Giveaway System**: Create, manage, end, list, and reroll giveaways
- **Level System**: Automatic XP gain, level tracking, and leaderboards
- **Message Tracking**: Track user messages with period-based leaderboards
- **Configuration**: Role assignment based on levels, messages, or boost status

### Web Dashboard
- **Statistics API**: Real-time bot and command usage metrics
- **Health Monitoring**: Bot status and performance tracking
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Component Library**: Comprehensive UI kit with shadcn/ui

## Data Flow

1. **Discord Events** → Bot Event Handlers → Database Storage
2. **Web Requests** → Express Routes → Database Queries → JSON Response
3. **Command Execution** → Permission Validation → Action Execution → Logging
4. **Frontend Queries** → TanStack Query → API Endpoints → State Updates

## External Dependencies

### Core Dependencies
- **Discord.js**: Discord API wrapper and bot framework
- **Drizzle ORM**: Type-safe database operations
- **Neon Database**: Serverless PostgreSQL hosting
- **TanStack Query**: Server state management
- **Radix UI**: Headless component primitives

### Development Tools
- **TypeScript**: Type safety across the entire stack
- **Vite**: Fast development server and bundling
- **Tailwind CSS**: Utility-first styling framework
- **ESBuild**: Fast JavaScript bundling for production

## Deployment Strategy

### Environment Configuration
- **Development**: `npm run dev` - Concurrent bot and web server
- **Production**: `npm run build && npm run start` - Optimized builds
- **Database**: Environment-based connection strings

### Hosting Platform
- **Platform**: Replit with autoscale deployment
- **Port Configuration**: External port 80 mapping to internal port 5000
- **Build Process**: Vite build for frontend, ESBuild for backend
- **Process Management**: Single process handling both bot and web server

### Environment Variables Required
- `DISCORD_TOKEN`: Bot authentication token
- `DISCORD_CLIENT_ID`: Application client ID
- `DATABASE_URL`: PostgreSQL connection string
- `BOT_OWNERS`: Comma-separated owner user IDs

## Changelog

- June 26, 2025: Complete Discord bot implementation with 24 slash commands
- June 26, 2025: Web dashboard for monitoring bot statistics and usage
- June 26, 2025: Successfully connected to Discord and serving 1 guild
- June 26, 2025: Added comprehensive giveaway system with reroll functionality
- June 26, 2025: Implemented user progression tracking (levels and messages)
- June 26, 2025: Added server boost monitoring with announcement channels
- June 26, 2025: Created automated role assignment system based on activity

## User Preferences

Preferred communication style: Simple, everyday language.