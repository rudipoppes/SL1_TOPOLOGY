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

### Current Status: **Phase 1 - COMPLETE ✅**
- ✅ Git repository initialized
- ✅ Basic project structure defined  
- ✅ .gitignore configured (excludes TEST/, Sample JSON Maps/, SL1 DOCS/)
- ✅ GitHub repository connected (https://github.com/rudipoppes/SL1_TOPOLOGY)
- ✅ SAM template for Lambda deployment created
- ✅ SL1 GraphQL client implemented and tested with Python
- ✅ getDevices and getTopology Lambda functions implemented
- ✅ React app initialized with TypeScript
- ✅ Device inventory components created (search, filter, virtual scrolling)
- ✅ EC2 development environment with VSCode Remote SSH
- ✅ **DEPLOYMENT WORKING**: Lambda functions deployed with Parameter Store integration
- ✅ **API FUNCTIONAL**: REST API returns SL1 device data successfully
- ✅ **SECURITY**: Enterprise-grade credential management with AWS Parameter Store
- 🔄 **Next**: Phase 2 - Frontend Integration and Advanced Features

### Important Note for Claude
**Always check the "Current Status" section above and the Git log to understand what has been completed and what needs to be done next. This project builds incrementally - don't skip phases or create advanced features before the foundation is complete.**

---

## Git Repository Setup

### Repository Information
- **Location**: `/Users/rudipoppes/Documents/VSC/SL1_TOPOLOGY`
- **Status**: Active Git repository
- **GitHub**: https://github.com/rudipoppes/SL1_TOPOLOGY
- **Ignored Folders**: `TEST/`, `Sample JSON Maps/`
- **Remote**: origin configured and synced

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

### Development Workflow

**Daily Development Process:**
1. **Connect**: Open VSCode → Remote-SSH → Connect to EC2
2. **Code**: Edit files directly on EC2 instance
3. **Test Backend**: Deploy Lambda functions from EC2 (no credential issues)
4. **Test Frontend**: Run React dev server on EC2
5. **Git**: Use normal Git workflow for version control

**Backend Development:**
```bash
# On EC2 via VSCode terminal
# Path depends on your AMI:
# Ubuntu: /home/ubuntu/SL1_TOPOLOGY/backend
# Amazon Linux: /home/ec2-user/SL1_TOPOLOGY/backend

cd ~/SL1_TOPOLOGY/backend

# Build and deploy Lambda functions
sam build
sam deploy --guided  # First time only
# OR: sam deploy  # Subsequent deployments

# Test Lambda functions
curl https://your-api-gateway-url/devices
```

**Frontend Development:**
```bash
# On EC2 via VSCode terminal  
cd ~/SL1_TOPOLOGY/frontend

# Start development server
npm run dev -- --host 0.0.0.0

# Access via: http://your-ec2-ip:5173
```

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
