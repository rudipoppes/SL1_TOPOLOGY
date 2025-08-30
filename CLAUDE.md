# SL1_TOPOLOGY - Claude Development Guide

**Living development guide - Updated regularly as we build iteratively**

---

## Quick Start for Claude

To get Claude up to speed with this project, tell Claude:  
**"Read through the CLAUDE.md file and provide me with your understanding"**

This will load all project context including architecture, configuration formats, deployment setup, and current development status.

### 🎯 **BASE APPLICATION REFERENCE**
- **Commit Hash**: `a27fdb5`  
- **Date**: August 30, 2025
- **Status**: Fully functional base application with all core features working + hierarchical layout bug fixes
- **Branch**: main
- **Note**: Use this as reference point for all future development

---

## Development Approach

### Iterative Development Process
This project is being built using an **iterative, incremental approach**:

1. **Phase-by-phase development** - Build core functionality first, then enhance
2. **Regular CLAUDE.md updates** - This file is updated after each major milestone
3. **Git-based version control** - All changes tracked and documented
4. **Test-driven validation** - Each phase validated before moving to next

### Current Status: **Phase 3 - BASE APPLICATION ESTABLISHED** 🎯
- ✅ **Complete System Integration**: Frontend ↔ Lambda ↔ SL1 fully working
- ✅ **Production Deployment**: Frontend on EC2, Lambda on AWS, real SL1 data
- ✅ **Device Inventory Interface**: Search, filter, pagination with cursor-based pagination  
- ✅ **Topology Visualization**: Interactive vis-network canvas with drag & drop
- ✅ **Real-time Device Data**: Loading live SL1 devices with proper device class names
- ✅ **Modern UI/UX**: Tailwind CSS responsive design with enhanced selection visibility
- ✅ **Performance Optimized**: Virtual scrolling, caching, efficient rendering
- ✅ **Configuration Management**: Proper handling of environment-specific configs
- ✅ **vis-network Implementation**: Using vis-network v9.1.9 for robust topology visualization
- ✅ **Cursor Pagination**: Implemented proper SL1 GraphQL cursor-based pagination (Dec 2024)
- ✅ **Phantom Connection Fix**: Eliminated fake edges between unrelated devices
- ✅ **Loading State Fix**: Single overlay loading indicator for smooth UX (Aug 30, 2025)
- ✅ **Hierarchical Layout Fix**: Corrected selected items to arrange horizontally (Aug 30, 2025)
- ✅ **Implementation Safeguards**: Added REJECTED_FEATURES.md to prevent floating panels re-implementation
- ✅ **Selection & Pan Behavior**: Fixed interaction conflicts between selection and canvas panning (Aug 30, 2025)
- ✅ **Canvas Pan Reversion**: Normal drag now pans canvas, removed shift+drag requirement (Aug 30, 2025)
- 🎯 **BASE APPLICATION**: Commit a27fdb5 - All core features working perfectly with bug fixes
- 🔄 **Next**: Phase 4 - Modern UI Enhancements (see TODO.md)

### **IMPORTANT: Visualization Library Status**
- **Current Implementation**: vis-network v9.1.9 for topology visualization
- **Architecture**: vis-network/standalone with vis-data for dataset management
- **Benefits**: Mature network visualization, built-in physics engine, extensive layout options
- **Note**: Documentation previously mentioned React Flow migration, but current production uses vis-network

### Important Note for Claude
**Always check the "Current Status" section above and the Git log to understand what has been completed and what needs to be done next. This project builds incrementally - don't skip phases or create advanced features before the foundation is complete.**

**CRITICAL DEVELOPMENT WORKFLOW (Updated Aug 2025):**
1. Claude works DIRECTLY on EC2 instance (/home/ubuntu/SL1_TOPOLOGY/)
2. All code changes are made directly on the EC2 server
3. Git commits/pushes only when explicitly requested by user
4. AWS credentials work automatically via IAM roles
5. Both development and deployment happen on the same EC2 instance

## 🚀 **Current System Capabilities** 

**The SL1_TOPOLOGY system is now fully functional with these working features:**

### **Backend (AWS Lambda + API Gateway)**
- ✅ **Secure SL1 Integration**: Parameter Store credential management
- ✅ **Device API**: `/devices` endpoint returning real SL1 device data
- ✅ **Search API**: `/search` for device name/IP filtering  
- ✅ **DynamoDB Caching**: 15-minute TTL for performance
- ✅ **CloudWatch Logging**: Full observability and debugging

### **Frontend (React + TypeScript)**
- ✅ **Device Inventory**: Search, filter, pagination with virtual scrolling
- ✅ **Interactive Topology**: React Flow visualization with drag & drop
- ✅ **Real-time Data**: Connected to live Lambda API
- ✅ **Modern UI**: Tailwind CSS responsive design
- ✅ **Topology Controls**: Layout switching, zoom, center view

### **User Experience**
- ✅ **Drag & Drop Workflow**: Select devices from inventory → drag to canvas
- ✅ **Visual Feedback**: Status-based node coloring (online/offline/warning)
- ✅ **Performance**: Virtual scrolling for large device lists
- ✅ **Resilience**: Fallback to mock data if API unavailable

### **Live Production System**
- **API Endpoint**: `https://swmtadnpui.execute-api.us-east-1.amazonaws.com/prod/devices`
- **Frontend URL**: `http://ec2-52-23-186-235.compute-1.amazonaws.com:3000/`
- **Real SL1 Data**: Authenticated with `admin` user on selab.sciencelogic.com
- **Status**: Fully operational with real device data and proper UI

---

## 🚨 Critical Lambda Deployment Information

### **Existing Stack Name**
- **IMPORTANT**: Always use existing stack name: `sl1-topology-backend-development`
- **Never create new stacks** - this causes DynamoDB table conflicts

### **Correct Deployment Commands (From EC2)**
```bash
cd ~/SL1_TOPOLOGY/backend
sam build
sam deploy --stack-name sl1-topology-backend-development --capabilities CAPABILITY_IAM --no-confirm-changeset --region us-east-1 --resolve-s3
```

### **GraphQL Schema Lessons Learned**
- **Device Class Field**: Use `deviceClass.class` NOT `deviceClass.name`
- **Organization Field**: Use `organization.id` NOT `organization.name`
- **Always check SL1 GraphQL schema before adding fields**
- **Never hardcode device class mappings** - use actual SL1 data

### **Configuration Management Critical Rules**

#### **Environment Variable Priority (Frontend)**
1. `VITE_API_URL` in `.env.local` (highest priority)
2. `baseUrl` in `config/frontend-config.json`
3. `fallbackUrl` as last resort

#### **Git Sync Issues Prevention**
- **`.env.local` is in `.gitignore`** - can cause local/EC2 differences
- **Always use config files for shared settings**
- **Use environment variables only for deployment-specific overrides**

#### **Config File Troubleshooting**
```bash
# Check EC2 config
cat ~/SL1_TOPOLOGY/config/frontend-config.json | grep baseUrl

# Check for hidden .env.local files
ls -la ~/SL1_TOPOLOGY/frontend/.env*

# Remove problematic .env.local if needed
rm ~/SL1_TOPOLOGY/frontend/.env.local
```

## 🔧 Common Issues & Solutions

### **Lambda 500 Errors**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/sl1-topology-backend-developmen-GetDevicesFunction-[ID] --region us-east-1 --since 5m

# Common causes:
# 1. GraphQL field doesn't exist (check SL1 schema)
# 2. SL1 credentials expired (check Parameter Store)
# 3. Network connectivity issues
```

### **Frontend Shows Mock Data**
```bash
# Check browser console for API errors
# Common causes:
# 1. Wrong API URL in config/frontend-config.json
# 2. .env.local overriding with old URL
# 3. Lambda function returning 500 errors
# 4. CORS issues

# Solution:
curl "https://swmtadnpui.execute-api.us-east-1.amazonaws.com/prod/devices?limit=1"
# Should return real device data, not error
```

### **Recent Issues Fixed (December 2024)**
- ✅ **Cursor Pagination**: Fixed infinite loading of same devices by implementing SL1 GraphQL cursor pagination
- ✅ **Phantom Connections**: Eliminated fake edges between unrelated devices with strict validation
- ✅ **Build Errors**: Resolved TypeScript compilation issues with unused imports/variables
- ✅ **Device Loading**: Fixed API failures by removing unsupported GraphQL fields (totalCount)

### **CloudFormation Stack Conflicts**
```bash
# NEVER create new stacks - always update existing
# Error: "sl1-topology-cache-v2 already exists"
# Solution: Use correct stack name
sam deploy --stack-name sl1-topology-backend-development ...
```

### **EC2 SSH Connection Issues**
```bash
# If pkill -f serve kills SSH session:
# Use specific process killing:
ps aux | grep "serve -s dist"
kill [specific-PID]

# Or use more specific pattern:
pkill -f "node.*serve -s dist"
```

---

## Git Repository Setup

### Repository Information
- **Location**: `/home/ubuntu/SL1_TOPOLOGY` (EC2 instance)
- **Status**: Active Git repository
- **GitHub**: https://github.com/rudipoppes/SL1_TOPOLOGY
- **Ignored Folders**: `TEST/`, `Sample JSON Maps/`
- **Remote**: origin configured and synced
- **Workflow**: Changes made directly on EC2, git push only when requested

### GitHub Setup
```bash
# First, create a new repository on GitHub (without README)
# Then add remote:
git remote add origin https://github.com/YOUR_USERNAME/SL1_TOPOLOGY.git

# Push existing code
git branch -M main
git push -u origin main

# Verify remote
git remote -v
```

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

**Recommended: Lambda + React + React Flow**

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
- **Visualization**: vis-network for topology rendering with advanced layout algorithms
---

## Development Environment Setup

### Recommended Approach: VSCode Remote SSH with EC2

**Why EC2 Development Environment:**
- ✅ **No AWS credential issues**: IAM roles handle all AWS access
- ✅ **Real cloud environment**: Test against actual AWS services
- ✅ **Fast iteration**: Direct access to Lambda, DynamoDB, API Gateway
- ✅ **Team collaboration**: Shared development environment
- ✅ **Production-like**: Same network/security context as production

### Prerequisites
- **AWS Account**: EC2, Lambda, API Gateway, DynamoDB permissions
- **SL1 Instance**: GraphQL endpoint (https://selab.sciencelogic.com/gql)
- **VSCode**: With Remote-SSH extension installed
- **SSH Key Pair**: For EC2 access

**SL1 Credentials (working):**
- URL: `https://selab.sciencelogic.com/gql`
- User: `admin`
- Pass: `Abc123!!`

### EC2 Instance Setup

**1. Launch EC2 Instance:**
```bash
# Recommended: t3.medium for development
# AMI: Amazon Linux 2 or Ubuntu 22.04 LTS
# Security Group: SSH (22), HTTP (80), Custom (3000, 5173)
```

**2. Create IAM Role for EC2:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "cloudformation:*",
        "s3:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

**3. Install Development Tools on EC2:**

**For Ubuntu 22.04 LTS (Recommended):**
```bash
# Connect to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git and other tools
sudo apt install -y git unzip

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install SAM CLI
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

**For Amazon Linux 2:**
```bash
# Connect to EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Update system
sudo yum update -y

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# AWS CLI and SAM CLI installation (same as Ubuntu)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

### VSCode Remote SSH Setup

**1. Install VSCode Extension:**
- Install "Remote - SSH" extension in local VSCode

**2. Configure SSH Connection:**
```bash
# In local VSCode, open Command Palette (Cmd/Ctrl+Shift+P)
# Type: "Remote-SSH: Connect to Host"
# Add new SSH target based on your AMI:

# For Ubuntu: ubuntu@your-ec2-ip
# For Amazon Linux: ec2-user@your-ec2-ip

# Or edit ~/.ssh/config:

Host sl1-topology-dev
    HostName your-ec2-ip
    User ubuntu  # Use 'ec2-user' for Amazon Linux
    IdentityFile ~/.ssh/your-key.pem
    ServerAliveInterval 60
```

**3. Connect and Setup Project:**
```bash
# Once connected to EC2 via VSCode Remote SSH:

# Clone repository
git clone https://github.com/rudipoppes/SL1_TOPOLOGY.git
cd SL1_TOPOLOGY

# Setup backend
cd backend
npm install

# Setup frontend  
cd ../frontend
npm install

# Verify installations
node --version  # Should be 18+
npm --version
aws --version
sam --version
```

## 🚀 Complete Deployment Process

### **IMPORTANT: Fix Git Configuration First (One-time setup)**
```bash
# If you encounter "divergent branches" error:
git config pull.rebase false  # Set merge as default strategy
# OR globally:
git config --global pull.rebase false
```

### **Frontend Deployment (Production)**
```bash
# On EC2 - Complete frontend deployment process
cd ~/SL1_TOPOLOGY

# 1. Pull latest changes
git pull origin main

# 2. Build frontend for production
cd frontend
rm -rf dist
npm run build

# 3. Stop existing serve process (be specific to avoid killing SSH)
ps aux | grep "serve -s dist"
kill [PID]  # Use specific PID, NOT pkill -f serve

# 4. Start production server
serve -s dist -l 3000

# 5. Verify deployment
curl http://localhost:3000
# Frontend accessible at: http://ec2-ip:3000
```

### **Backend Deployment (Lambda)**

**UPDATED Development Workflow (Direct EC2 Editing)**

Since we now edit directly on EC2:

**Step 1: Deploy Lambda functions (when backend changes are made):**
```bash
# From EC2 instance
cd ~/SL1_TOPOLOGY/backend
sam build
sam deploy --stack-name sl1-topology-backend-development --capabilities CAPABILITY_IAM --no-confirm-changeset --region us-east-1 --resolve-s3
```

**Step 2: Test deployment:**
```bash
curl "https://swmtadnpui.execute-api.us-east-1.amazonaws.com/prod/devices?limit=1"
# Should return JSON with device data, not an error
```

**Git Operations**: Only perform git add/commit/push when explicitly requested by user.

### **Quick Deployment (Both Frontend & Backend)**
```bash
# Complete deployment script (no git pull needed when editing directly on EC2)
cd ~/SL1_TOPOLOGY

# Deploy backend (if Lambda functions changed)
cd backend
sam build
sam deploy --stack-name sl1-topology-backend-development --capabilities CAPABILITY_IAM --no-confirm-changeset --region us-east-1 --resolve-s3

# Deploy frontend (if UI changed)
cd ../frontend
npm run build
ps aux | grep "serve -s dist" # Find PID
kill [PID]
serve -s dist -l 3000
```

### **Development Workflow (Updated)**
1. **Edit**: Make changes directly on EC2 instance
2. **Test**: Deploy backend and/or rebuild frontend as needed
3. **Git**: Only commit/push when explicitly requested by user
4. **Deploy**: Follow deployment processes above

### Environment Configuration

**EC2 Environment (automatic via IAM role):**
- No AWS credentials needed - IAM role handles access
- SL1 credentials configured in Lambda environment variables
- CORS configured for EC2 public IP access

**Lambda Environment Variables:**
- `SL1_URL`: `https://selab.sciencelogic.com/gql`
- `SL1_USER`: `admin`
- `SL1_PASS`: `Abc123!!`
- `CORS_ORIGIN`: `http://your-ec2-ip:5173`
- `CACHE_TABLE`: DynamoDB table name (auto-created)
---

## Technology Stack

### Frontend Framework: React + TypeScript
- **React 18**: Component-based UI with modern hooks
- **TypeScript**: Type safety for complex device/relationship data
- **Vite**: Fast development server and optimized builds

### Topology Visualization: vis-network
- **Performance**: Handles thousands of nodes/edges smoothly with viewport rendering
- **Layouts**: Hierarchical (Sugiyama + Reingold-Tilford), Physics-based (Barnes-Hut), Grid
- **Interactions**: Built-in pan, zoom, selection, drag-drop, node positioning
- **Physics Engine**: Configurable force-directed layouts with spring physics
- **Data Management**: vis-data DataSets for efficient node/edge updates

### Hierarchical Layout Algorithm Implementation

#### **Primary Technique: Sugiyama Method (Layered Graph Drawing)**
- **Purpose**: Proper hierarchical level assignment for Directed Acyclic Graph (DAG) structures
- **Key Feature**: Handles nodes that can be both parents AND children simultaneously
- **Phases**: 
  1. Layer assignment using topological sorting
  2. Crossing minimization for clean edges
  3. Coordinate assignment for optimal spacing

#### **Secondary Technique: Reingold-Tilford Algorithm**
- **Purpose**: Parent-centered positioning within each hierarchical level
- **Key Principle**: "Parents must be centered above their children"
- **Implementation**: Calculates midpoint between leftmost and rightmost child, positions parent directly above

#### **Combined Approach in Production**
1. Sugiyama method determines which hierarchical level each node belongs to
2. Reingold-Tilford principle ensures parents are perfectly centered above their children
3. Collision resolution maintains proper spacing while preserving the centering
4. This combination is specifically designed for network topology where nodes have multiple roles

**Also Known As**: "Layered Tree Layout" or "Hierarchical DAG Layout" in visualization literature

### UI Framework: Tailwind CSS + Headless UI
- **Tailwind CSS**: Utility-first styling, highly customizable
- **Headless UI**: Accessible components (modals, dropdowns, search)
- **Framer Motion**: Smooth animations for topology interactions

### Backend: AWS Lambda Functions
1. **`getDevices`**: Fetch device list with filtering capabilities
2. **`getTopology`**: Retrieve relationships for selected devices
3. **`searchDevices`**: Real-time device search functionality
4. **`cacheManager`**: Handle data caching and invalidation

## SL1 Integration Details

### GraphQL Endpoints
- **Endpoint**: `<sl1-instance>/gql`
- **Authentication**: Basic Auth (username/password)
- **API Endpoint**: `<sl1-instance>/api` (if needed)

### Working GraphQL Queries (Tested)

```graphql
# Get Devices (Working)
query GetDevices($limit: Int!) {
  devices(first: $limit) {
    edges {
      node {
        id
        name
        ip
        state
        deviceClass {
          id
        }
        organization {
          id
        }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}

# Search Devices (Working)
query SearchDevices($searchTerm: String!, $limit: Int!) {
  devices(first: $limit, search: { name: { contains: $searchTerm } }) {
    edges {
      node {
        id
        name
        ip
        state
        deviceClass {
          id
        }
        organization {
          id
        }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}

# Device Relationships (Structure - needs testing)
query DeviceRelationships {
  deviceRelationships(first: 500, order: {direction: asc, field: ID}) {
    edges {
      node {
        id
        parentDevice { id name }
        childDevice { id name }
      }
    }
  }
}
```

**Important Notes:**
- ✅ `deviceClass` and `organization` return **IDs only**, not names
- ✅ Search requires `DeviceSearch` object format: `{ name: { contains: "term" } }`
- ✅ Basic fields work: `id`, `name`, `ip`, `state`
- 🔄 Relationship queries need further testing on SL1 instance

### Data Structure
- **Devices**: id, name (expandable with more fields)
- **Relationships**: Parent-child hierarchical structure
- **Pagination**: Uses Relay-style cursor pagination

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
- Basic React app with React Flow setup
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

---

## 🚫 **REJECTED FEATURES - DO NOT IMPLEMENT**

**CRITICAL: Certain features have been explicitly rejected and must NEVER be re-implemented.**

### **Floating/Draggable Panels** ❌
- **Status**: PERMANENTLY REJECTED (August 30, 2025)
- **User Feedback**: "Nah don't like it. Revert back to previous version"
- **Files Blocked**: `FloatingPanel.tsx`, `DraggablePanel.*`, `MovablePanel.*`
- **Safeguards**: Added to `.gitignore` and documented in `REJECTED_FEATURES.md`
- **Required Approach**: Use fixed positioned controls in sidebar only

### **Implementation Guidelines**
1. **NEVER** implement floating or draggable UI elements
2. **ALWAYS** use fixed positioning for control panels  
3. **STICK** to the current sidebar layout approach
4. **ASK** the user before implementing any major UI layout changes
5. **REFER** to `REJECTED_FEATURES.md` when considering panel/control modifications

---
