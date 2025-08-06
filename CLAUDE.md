# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linting

### Database
- Database is PostgreSQL via Drizzle ORM
- Connection via `POSTGRES_URL` environment variable
- Schema defined in `lib/db/db.ts`

### Environment Setup
Required environment variables:
- `POSTGRES_URL` - PostgreSQL connection string
- LiveKit connection details (fetched via `/api/connection-details`)

## Architecture Overview

This is a Next.js 14 multimodal chatbot application with:
- **Authentication**: NextAuth.js with credentials provider
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: LiveKit for voice/video communication
- **UI**: React with Radix UI components and Tailwind CSS

### Key Components

#### Database Schema (`lib/db/db.ts`)
- **spark_users**: User accounts with email/password
- **spark_chats**: Chat sessions per user
- **spark_messages**: Individual messages in chats
- **spark_documents**: File attachments (PDF, DOC, TXT)
- **spark_picture**: Image attachments
- **spark_root**: Admin accounts (separate from regular users)

#### LiveKit Integration
- **LiveKitProvider** (`components/livekit/LiveKitProvider.tsx`): Manages LiveKit room connection
- **useChatAndTranscription** (`hooks/useChatAndTranscription.ts`): Combines chat messages and voice transcriptions
- Real-time voice communication with AI agent

#### Main Application Flow
1. **Authentication**: Users log in via NextAuth.js
2. **Chat Management**: Users create/select chat sessions
3. **Message Exchange**: Text/voice messages via LiveKit
4. **File Upload**: Support for images and documents
5. **Persistent Storage**: All data saved to PostgreSQL

### API Routes
- `/api/auth/*` - NextAuth.js authentication
- `/api/chat` - Chat session management (CRUD)
- `/api/message` - Message management (CRUD)
- `/api/upload` - File upload handling
- `/api/picture` - Image metadata management
- `/api/document` - Document metadata management
- `/api/connection-details` - LiveKit connection tokens

### Key Features
- **Multimodal Input**: Text, voice, images, documents
- **Real-time Voice**: LiveKit WebRTC integration
- **File Upload**: Support for PDF, DOC, TXT, images
- **Persistent Storage**: PostgreSQL with Drizzle ORM
- **Responsive Design**: Mobile-friendly interface
- **Session Management**: Chat history per user

### File Structure
- `/app` - Next.js app router pages and API routes
- `/components` - React components (UI and business logic)
- `/lib` - Shared libraries (database, types, utilities)
- `/hooks` - Custom React hooks
- `/upload` - User-uploaded files (organized by email)

### Development Notes
- Uses TypeScript throughout
- Tailwind CSS for styling with custom components
- Radix UI for accessible components
- Lucide React for icons
- File uploads limited to 10MB
- Real-time status indicators for LiveKit connection