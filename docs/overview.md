# Open Interval

Open Interval is a web-based interval timer application that allows users to create, share, and follow custom interval workouts with spoken audio cues. Similar to "Seconds Pro" on mobile, but with enhanced web capabilities and social features.

## Core Features

### Timer Creation and Playback
- Create custom interval sequences with precise timing
- Add spoken audio cues for intervals, countdowns, and instructions
- Multiple audio channels support (e.g., separate channels for countdown, encouragement, tutorial)
- Real-time timer visualization
- Channel muting capabilities

### Audio Integration
- High-quality voice generation using ElevenLabs API
- Multiple audio channels for different types of cues:
  - Countdown vocals (3, 2, 1, GO)
  - Exercise instructions
  - Encouragement/motivation
  - Tutorial explanations
- Audio mixing and channel control

### Social Features
- Public sharing of timer sequences
- Browse and use public sequences without login
- User profiles and sequence collections
- Rating and feedback system

## Technical Architecture

### Database Schema
```typescript
// Timer Sequence
{
  id: string
  userId: string
  title: string
  description: string
  isPublic: boolean
  sequence: JSON // Stores the interval sequence structure
  audioFiles: {
    countdown: Blob[]
    instructions: Blob[]
    encouragement: Blob[]
    tutorial: Blob[]
  }
  createdAt: DateTime
  updatedAt: DateTime
}

// User Profile
{
  id: string        // Clerk Auth ID
  name: string
  email: string
  createdSequences: Relation[]
  favoriteSequences: Relation[]
}
```

### Audio Implementation
- Audio files stored as Blobs in the database
- Web Audio API for multi-channel playback
- Channel mixing and volume control
- Preloading of audio assets for smooth playback

### Authentication
- Clerk Authentication for user management
- Public routes for viewing and using public sequences
- Protected routes for sequence creation and management

### API Routes
- `/api/sequences` - CRUD operations for timer sequences
- `/api/sequences/public` - Browse public sequences
- `/api/audio` - Audio file management
- `/api/users` - User profile management

## User Flows

### Anonymous Users
1. Browse public sequences
2. Use public sequences
3. View sequence details
4. Sign up/Login for additional features

### Authenticated Users
1. Create custom sequences
2. Manage audio cues
3. Publish sequences publicly
4. Favorite sequences
5. Rate and provide feedback

## Future Considerations

### Potential Features
- Sequence categories and tags
- Custom voice selection
- Sequence templates
- Mobile app version
- Offline support
- Collaborative sequence creation

### Technical Challenges
- Audio synchronization across devices
- Efficient blob storage and retrieval
- Real-time audio mixing
- Mobile browser compatibility
- Performance optimization for audio playback

## Development Roadmap

### Phase 1: Core Timer
- Basic interval timer functionality
- Simple audio integration
- User authentication

### Phase 2: Audio Enhancement
- ElevenLabs integration
- Multi-channel audio support
- Audio management system

### Phase 3: Social Features
- Public sequence sharing
- User profiles
- Ratings and feedback

### Phase 4: Advanced Features
- Templates
- Categories
- Enhanced audio controls
- Mobile optimization 