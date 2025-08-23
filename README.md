# SL1 Topology Visualization System

**Production-ready system for visualizing ScienceLogic SL1 device topologies**

[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange)](https://aws.amazon.com/lambda/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![React Flow](https://img.shields.io/badge/React%20Flow-Visualization-green)](https://reactflow.dev/)

## 🚀 Live System

- **Frontend**: [http://ec2-52-23-186-235.compute-1.amazonaws.com:3000/](http://ec2-52-23-186-235.compute-1.amazonaws.com:3000/)
- **API**: `https://swmtadnpui.execute-api.us-east-1.amazonaws.com/prod`
- **Status**: ✅ Production Ready with Real SL1 Data

## ✨ Features

### Current Capabilities
- 🔍 **Device Search & Filtering** - Real-time search through SL1 device inventory
- 🎯 **Drag & Drop Interface** - Intuitive device selection and topology building
- 📊 **Interactive Visualization** - React Flow powered topology canvas
- 🔄 **Live SL1 Integration** - Direct connection to ScienceLogic GraphQL API
- ⚡ **Performance Optimized** - Virtual scrolling, caching, responsive design
- 🛡️ **Secure Authentication** - AWS Parameter Store credential management

### User Workflow
1. **Browse Devices** - Search and filter through SL1 device inventory
2. **Select & Drag** - Choose devices and drag them to the topology canvas
3. **Visualize Relationships** - Interactive topology map with status indicators
4. **Explore** - Pan, zoom, and interact with the topology visualization

## 🏗️ Architecture

```
Frontend (React)     ←→     AWS Lambda     ←→     SL1 GraphQL
     ↕                         ↕                    ↕
  EC2 Server              API Gateway         ScienceLogic
     ↕                         ↕
Static Assets            DynamoDB Cache
```

### Components
- **Frontend**: React + TypeScript + Tailwind CSS (hosted on EC2)
- **Backend**: AWS Lambda functions with Node.js
- **API**: AWS API Gateway with CORS support
- **Database**: DynamoDB for caching (15-min TTL)
- **Integration**: Direct SL1 GraphQL queries with secure authentication

## 🚀 Quick Start

### Prerequisites
- AWS Account with EC2, Lambda, API Gateway access
- SL1 instance with GraphQL endpoint
- Node.js 18+ and SAM CLI

### Deployment

#### 1. Backend (Lambda Functions)
```bash
cd backend
sam build
sam deploy --stack-name sl1-topology-backend-development --capabilities CAPABILITY_IAM --region us-east-1 --resolve-s3
```

#### 2. Frontend (Production Build)
```bash
cd frontend
npm install
npm run build
serve -s dist -l 3000
```

#### 3. Configuration
Set up AWS Parameter Store with SL1 credentials:
- `sl1-url`: SL1 GraphQL endpoint
- `sl1-username`: SL1 username  
- `sl1-password`: SL1 password

## 📁 Project Structure

```
SL1_TOPOLOGY/
├── backend/
│   ├── lambda-functions/
│   │   ├── getDevices/         # Device inventory API
│   │   ├── getTopology/        # Topology relationships API
│   │   └── searchDevices/      # Device search API
│   └── template.yaml           # SAM CloudFormation template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DeviceInventory/ # Device list, search, filters
│   │   │   └── TopologyCanvas/  # React Flow visualization
│   │   └── services/
│   │       ├── api.ts          # Lambda API client
│   │       └── config.ts       # Configuration management
│   └── dist/                   # Production build
├── config/
│   └── frontend-config.json    # Frontend configuration
└── CLAUDE.md                   # Development guide
```

## 🔧 Configuration

### Frontend Configuration (`config/frontend-config.json`)
```json
{
  "api": {
    "baseUrl": "https://your-api-gateway-url/prod",
    "timeout": 10000
  },
  "topology": {
    "canvas": {
      "defaultLayout": "force-directed",
      "layouts": ["force-directed", "hierarchical", "circular", "grid"],
      "maxNodes": 1000
    }
  },
  "ui": {
    "theme": "light", 
    "animations": true
  }
}
```

## 🔍 SL1 Integration

### GraphQL Queries
The system uses these SL1 GraphQL queries:
- **Devices**: `devices(first: $limit)` with device class and organization info
- **Search**: Device name and IP filtering  
- **Device Classes**: Maps device class IDs to readable names

### Authentication
- Secure credential storage in AWS Parameter Store
- Basic authentication with SL1 GraphQL endpoint
- Automatic credential retrieval in Lambda functions

## 🛠️ Development

For detailed development information, see [CLAUDE.md](./CLAUDE.md).

### Quick Commands
```bash
# Frontend development
cd frontend && npm run dev

# Backend deployment  
cd backend && sam build && sam deploy --stack-name sl1-topology-backend-development ...

# Production frontend build
cd frontend && npm run build && serve -s dist -l 3000
```

## 🚨 Troubleshooting

### Common Issues
- **Lambda 500 Errors**: Check SL1 GraphQL schema compatibility
- **Mock Data**: Verify API URL in config files
- **Stack Conflicts**: Always use existing stack name `sl1-topology-backend-development`

See [CLAUDE.md](./CLAUDE.md) for comprehensive troubleshooting guide.

## 📄 Status

**Version**: Phase 2 - Production Ready ✅  
**Last Updated**: August 2025  
**Live System**: Fully operational with real SL1 data