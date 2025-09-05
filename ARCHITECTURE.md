# Movie Night Bot - Architecture Documentation

## 📁 Project Structure

The bot has been refactored into a clean modular architecture for better maintainability and scalability.

```
discord_movie-night-bot/
├── index.js                 # Main entry point (bot initialization & routing)
├── database.js             # Database operations and connection management
├── package.json            # Dependencies and scripts
├── index-original-backup.js # Backup of original monolithic file
├── commands/               # Slash command definitions
│   ├── index.js            # Command registration and exports
│   ├── movie-night.js      # Movie recommendation commands
│   ├── movie-session.js    # Session management commands
│   ├── movie-configure.js  # Configuration commands
│   ├── movie-cleanup.js    # Cleanup commands
│   └── movie-stats.js      # Statistics commands
├── handlers/               # Interaction handlers
│   ├── index.js            # Main interaction router
│   ├── buttons.js          # Button interaction handlers
│   ├── modals.js           # Modal submission handlers
│   ├── selects.js          # Select menu handlers
│   └── votes.js            # Voting system handlers
├── services/               # Business logic services
│   ├── index.js            # Service exports
│   ├── imdb.js             # IMDb/OMDb API integration
│   ├── sessions.js         # Session management logic
│   ├── discord-events.js   # Discord scheduled events
│   ├── timezone.js         # Timezone utilities
│   └── permissions.js      # Permission checking
├── utils/                  # Utility functions
│   ├── index.js            # Utility exports
│   ├── embeds.js           # Embed builders
│   ├── components.js       # UI component builders
│   ├── formatters.js       # Text and data formatting
│   └── constants.js        # Constants and global state
└── config/                 # Configuration
    └── timezones.js        # Timezone definitions
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
- **Commands**: Define slash command structure and options
- **Handlers**: Process user interactions (buttons, modals, selects)
- **Services**: Contain business logic and external API calls
- **Utils**: Provide reusable utility functions
- **Config**: Store configuration data

### 2. **Modular Design**
- Each module has a single responsibility
- Clear interfaces between modules
- Easy to test individual components
- Facilitates parallel development

### 3. **Centralized State Management**
- Global state managed in `utils/constants.js`
- Database operations centralized in `database.js`
- Configuration centralized in `config/`

## 📋 Module Responsibilities

### **index.js** (Main Entry Point)
- Bot initialization and login
- Event handling setup
- Command routing
- Error handling and graceful shutdown
- ~200 lines (down from 2800+)

### **commands/** (Command Definitions)
- Slash command structure definitions
- Command options and choices
- Command registration with Discord API
- No business logic - just definitions

### **handlers/** (Interaction Processing)
- Route interactions to appropriate handlers
- Process button clicks, modal submissions, select menus
- Handle voting interactions
- Manage interaction state

### **services/** (Business Logic)
- Core application logic
- External API integrations (IMDb, Discord Events)
- Session management
- Permission checking
- Timezone handling

### **utils/** (Shared Utilities)
- Embed creation and formatting
- UI component builders
- Text formatting functions
- Constants and shared state
- Helper functions

### **config/** (Configuration)
- Static configuration data
- Timezone definitions
- Default settings

## 🔄 Data Flow

```
User Interaction
       ↓
   index.js (routing)
       ↓
   handlers/ (process interaction)
       ↓
   services/ (business logic)
       ↓
   database.js (data persistence)
       ↓
   utils/ (format response)
       ↓
   Discord API (send response)
```

## 🧪 Testing Strategy

With the modular structure, testing becomes much easier:

1. **Unit Tests**: Test individual services and utilities
2. **Integration Tests**: Test handler → service → database flows
3. **Mock Testing**: Mock external APIs (IMDb, Discord)
4. **Component Tests**: Test embed and component builders

## 🚀 Development Benefits

### **Before Refactor**
- ❌ Single 2800+ line file
- ❌ Difficult to navigate and maintain
- ❌ Hard to test individual features
- ❌ Merge conflicts in team development
- ❌ Tight coupling between components

### **After Refactor**
- ✅ Logical separation into focused modules
- ✅ Easy to find and modify specific functionality
- ✅ Individual modules can be unit tested
- ✅ Multiple developers can work simultaneously
- ✅ Loose coupling with clear interfaces
- ✅ Better code reusability
- ✅ Easier debugging and error isolation

## 📈 Future Extensibility

The modular structure makes it easy to:

- **Add new commands**: Create new files in `commands/`
- **Add new services**: Extend `services/` with new integrations
- **Modify UI components**: Update `utils/components.js`
- **Add new interaction types**: Extend `handlers/`
- **Implement new features**: Clear separation of concerns

## 🔧 Migration Notes

- Original code backed up as `index-original-backup.js`
- All functionality preserved in modular form
- Database schema and API unchanged
- Environment variables remain the same
- Deployment process unchanged

This architecture provides a solid foundation for continued development and maintenance of the Movie Night Bot.
