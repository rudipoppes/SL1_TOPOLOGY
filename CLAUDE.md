# SL1_TOPOLOGY - Claude Development Guide

**Living development guide - Updated regularly as we build iteratively**

---

## Quick Start for Claude

To get Claude up to speed with this project, tell Claude:  
**"Read through the CLAUDE.md file and provide me with your understanding"**

This will load all project context including architecture, configuration formats, deployment setup, and current development status.

---

## Development Approach

### Iterative Development Process
This project is being built using an **iterative, incremental approach**:

1. **Phase-by-phase development** - Build core functionality first, then enhance
2. **Regular CLAUDE.md updates** - This file is updated after each major milestone
3. **Git-based version control** - All changes tracked and documented
4. **Test-driven validation** - Each phase validated before moving to next

### Current Status: **Project Setup Phase**
- ✅ Git repository initialized
- ✅ Basic project structure defined
- ✅ .gitignore configured (excludes TEST/ and Sample JSON Maps/ folders)
- 🔄 **Next**: Create folder structure and basic scaffolding

### Important Note for Claude
**Always check the "Current Status" section above and the Git log to understand what has been completed and what needs to be done next. This project builds incrementally - don't skip phases or create advanced features before the foundation is complete.**

---

## Git Repository Setup

### Repository Information
- **Location**: `/Users/rudipoppes/Documents/VSC/SL1_TOPOLOGY`
- **Status**: Initialized Git repository
- **Ignored Folders**: `TEST/`, `Sample JSON Maps/`

### Git Workflow

#### Branch Strategy
- **main**: Production-ready code only
- **develop**: Integration branch for features
- **feature/***: Individual feature branches
- **fix/***: Bug fix branches

#### Commit Guidelines
- Use clear, descriptive commit messages
- Follow conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

```bash
# Check current status
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat(frontend): add topology visualization component"

# View project history
git log --oneline --graph --all
```

#### Best Practices
- ✅ Commit early and often (atomic commits)
- ✅ Write meaningful commit messages
- ✅ Never commit sensitive data (API keys, passwords)
- ✅ Review changes before committing (`git diff`)
- ✅ Keep commits focused on single changes

---

## Project Overview

### System Purpose
SL1_TOPOLOGY is a system that is capable of dynamically map components from SL1 onto a topology map based on user input:
- Device selection: User selects a device or group of devices and drags it/them onto the canvas where the system will show its direct relationships (based on default settings) if any for each selected device
- Search map: User can search in the map for devices by name or ip address
- Levels of parent/child: user can hide and expose levels of parent/cild relationships
- Selectable parent/child: user can select direction to be show (towards parent(s) or towards child(ren)). default is children
- All standard UI functions that one would expect from topology maps. 

### Key Features
- **User friendly**: Everything needs to be accessible within limited clicks.
- **Modern**: Modern looks and feel
- **Dynamic updating**: maps need to be smooth and almost instantly drawn
- **No hardcoding of values**: All values come from user input or from config files
- **SL1 architecture**: Direct GraphQL and API integration to SL1 

### Architecture

**Recommended: Lambda + React + Cytoscape.js**

```
Frontend (React) ←→ AWS Lambda ←→ SL1 GraphQL/API
     ↕                 ↕
CloudFront          DynamoDB
(Static Assets)     (Caching)
```

**Components:**
- **Frontend**: React + TypeScript hosted on existing AWS server
- **API Layer**: AWS Lambda functions + API Gateway
- **Data Layer**: DynamoDB for caching, direct SL1 integration
- **Visualization**: Cytoscape.js for topology rendering
---

## Development Environment Setup

### Prerequisites
- **SL1 Instance**: GraphQL and REST API access with credentials
- **AWS Account**: Lambda, API Gateway, DynamoDB access
- **Node.js**: v18+ for development
- **AWS CLI**: Configured with appropriate permissions
- **SAM CLI**: For Lambda deployment (recommended)

**Required SL1 Permissions:**
- Device read access via GraphQL
- Relationship/topology data access
- Search capabilities

### Backend Startup

**Lambda Functions Development:**
```bash
# Install SAM CLI
npm install -g @aws-sam/cli

# Initialize SAM project
sam init --runtime nodejs18.x

# Local development
sam local start-api
```

**Frontend Development:**
```bash
# Create React app
npm create vite@latest sl1-topology -- --template react-ts
cd sl1-topology
npm install

# Install dependencies
npm install cytoscape tailwindcss @headlessui/react framer-motion
```

### Environment Configuration

**Lambda Environment Variables:**
- `SL1_GRAPHQL_URL`: SL1 GraphQL endpoint
- `SL1_API_KEY`: SL1 authentication token
- `DYNAMODB_TABLE`: Cache table name
- `CORS_ORIGIN`: Frontend origin URL
---

## Technology Stack

### Frontend Framework: React + TypeScript
- **React 18**: Component-based UI with modern hooks
- **TypeScript**: Type safety for complex device/relationship data
- **Vite**: Fast development server and optimized builds

### Topology Visualization: Cytoscape.js
- **Performance**: Handles thousands of nodes/edges smoothly
- **Layouts**: Force-directed, hierarchical, circular options
- **Interactions**: Built-in pan, zoom, selection, drag-drop
- **Extensible**: Rich plugin ecosystem for advanced features

### UI Framework: Tailwind CSS + Headless UI
- **Tailwind CSS**: Utility-first styling, highly customizable
- **Headless UI**: Accessible components (modals, dropdowns, search)
- **Framer Motion**: Smooth animations for topology interactions

### Backend: AWS Lambda Functions
1. **`getDevices`**: Fetch device list with filtering capabilities
2. **`getTopology`**: Retrieve relationships for selected devices
3. **`searchDevices`**: Real-time device search functionality
4. **`cacheManager`**: Handle data caching and invalidation

## Lambda Functions Architecture

### Data Caching Strategy
- **DynamoDB**: Cache topology data to reduce SL1 load
- **TTL**: 15-minute cache expiration for dynamic data
- **Intelligent Invalidation**: Update cache when relationships change

### Security & Performance
- **Credential Management**: SL1 credentials stored securely in Lambda
- **Rate Limiting**: Protect SL1 from request overload
- **Data Processing**: Server-side filtering and aggregation
- **Progressive Loading**: Load relationships on-demand

## UX/UI Design Guidelines

### Interface Layout
```
┌─────────────────────────────────────────────────┐
│ [🔍 Search] [⚙️ Settings] [📊 Filters]    [👤] │
├─────────────────────────────────────────────────┤
│ 📋 Device List    │        Topology Canvas      │
│ ┌─ Ungrouped      │    ┌─────────┐              │
│ ├─ Routers        │    │ Device  │──┐           │
│ ├─ Switches       │    │  Node   │  │           │
│ └─ Servers        │    └─────────┘  │           │
│                   │         │       ▼           │
│ [Expand Depth: 2] │    ┌─────────┐              │
│ [◀ Parents ▶]     │    │ Related │              │
│                   │    │ Device  │              │
└───────────────────┴────└─────────┘──────────────┘
```

### Modern UX Features
- **Smart Search**: Real-time filtering with autocomplete
- **Visual Breadcrumbs**: Show current exploration path
- **Contextual Toolbar**: Tools appear based on selection
- **Progressive Disclosure**: Load relationships on-demand
- **Floating Actions**: Quick access to center, reset, export

### Interaction Patterns
- **Drag & Drop**: Devices from list to canvas
- **Click to Expand**: Reveal parent/child relationships
- **Hover Details**: Show device information on hover
- **Gesture Support**: Touch-friendly on tablets

## Development Phases

### Phase 1: Core Infrastructure (1-2 weeks)
- Set up Lambda functions for SL1 integration
- Basic React app with Cytoscape.js setup
- Device list display and simple topology rendering
- Basic drag-and-drop functionality

### Phase 2: Advanced Features (2-3 weeks)
- Implement search functionality with autocomplete
- Parent/child relationship controls
- Caching layer with DynamoDB integration
- Modern UI polish with Tailwind CSS
- Performance optimization for large datasets

### Phase 3: Performance & Polish (1-2 weeks)
- Advanced filtering and device grouping
- Export capabilities (PNG, SVG, JSON)
- User preferences and settings persistence
- Comprehensive error handling and loading states
- Documentation and deployment automation

## Configuration System

### Frontend Configuration
```json
{
  "api": {
    "baseUrl": "https://api.your-domain.com",
    "timeout": 10000
  },
  "topology": {
    "defaultLayout": "force-directed",
    "maxNodes": 500,
    "defaultDepth": 2
  },
  "ui": {
    "theme": "light",
    "animations": true
  }
}
```

### Lambda Configuration
```yaml
# template.yaml (SAM)
Globals:
  Function:
    Runtime: nodejs18.x
    Environment:
      Variables:
        SL1_GRAPHQL_URL: !Ref SL1GraphQLUrl
        DYNAMODB_TABLE: !Ref TopologyCache
```

## Web Interface

### Overview
Modern, responsive web application optimized for topology visualization and exploration. Built with performance and usability as primary concerns, capable of handling enterprise-scale device inventories.

### Key Capabilities
- **Scalable Visualization**: Smooth rendering of 1000+ device relationships
- **Intelligent Data Loading**: Progressive disclosure prevents information overload
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support
