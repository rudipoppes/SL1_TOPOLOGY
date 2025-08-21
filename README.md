# SL1_TOPOLOGY

Dynamic topology mapping system for SL1 (ScienceLogic) infrastructure visualization.

## 📋 Project Status
**Current Phase**: Project Setup  
**Last Updated**: 2025-08-21

## 🚀 Quick Start

For detailed development information, see [CLAUDE.md](./CLAUDE.md).

## 📁 Project Structure

```
SL1_TOPOLOGY/
├── frontend/           # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   └── public/
├── backend/           # AWS Lambda functions
│   ├── lambda-functions/
│   ├── sam-templates/
│   └── shared/
├── docs/             # Documentation
├── config/           # Configuration files
├── TEST/            # Testing data (git ignored)
├── Sample JSON Maps/ # Sample data (git ignored)
├── CLAUDE.md        # Development guide
└── README.md        # This file
```

## 🏗️ Architecture

**Frontend**: React + TypeScript + Cytoscape.js  
**Backend**: AWS Lambda + API Gateway + DynamoDB  
**Integration**: SL1 GraphQL + REST APIs

## 📖 Development Guide

See [CLAUDE.md](./CLAUDE.md) for complete development instructions, architecture decisions, and current progress.