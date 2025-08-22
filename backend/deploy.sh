#!/bin/bash

# SL1 Topology Backend Deployment Script
# Uses configuration files instead of hardcoded values

set -e

# Default values
ENVIRONMENT="development"
STACK_NAME="sl1-topology-backend"
REGION="us-east-1"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -s|--stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment    Deployment environment (development|staging|production)"
      echo "  -s, --stack-name     CloudFormation stack name"
      echo "  -r, --region         AWS region"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo "🚀 Deploying SL1 Topology Backend"
echo "   Environment: $ENVIRONMENT"
echo "   Stack Name: $STACK_NAME"
echo "   Region: $REGION"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  echo "❌ Error: Environment must be development, staging, or production"
  exit 1
fi

# Check if config files exist
CONFIG_FILE="../config/sl1-config.json"
DEPLOY_CONFIG_FILE="../config/deploy-config.json"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ Error: Config file not found: $CONFIG_FILE"
  exit 1
fi

if [[ ! -f "$DEPLOY_CONFIG_FILE" ]]; then
  echo "❌ Error: Deploy config file not found: $DEPLOY_CONFIG_FILE"
  exit 1
fi

echo "✅ Configuration files found"
echo ""

# Build the application
echo "📦 Building Lambda functions..."
sam build

if [[ $? -ne 0 ]]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build completed"
echo ""

# Deploy the application
echo "🚀 Deploying to AWS..."

# Deploy with environment parameter
sam deploy \
  --stack-name "$STACK_NAME-$ENVIRONMENT" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
  --no-fail-on-empty-changeset

if [[ $? -ne 0 ]]; then
  echo "❌ Deployment failed"
  exit 1
fi

echo "✅ Deployment completed successfully!"
echo ""

# Get the API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME-$ENVIRONMENT" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

if [[ -n "$API_URL" ]]; then
  echo "🌐 API Gateway URL: $API_URL"
  
  # Update frontend config with API URL
  FRONTEND_CONFIG="../config/frontend-config.json"
  if [[ -f "$FRONTEND_CONFIG" ]]; then
    echo "📝 Updating frontend config with API URL..."
    # Use jq if available, otherwise show manual instruction
    if command -v jq &> /dev/null; then
      jq --arg url "$API_URL" '.api.baseUrl = $url' "$FRONTEND_CONFIG" > "${FRONTEND_CONFIG}.tmp" && mv "${FRONTEND_CONFIG}.tmp" "$FRONTEND_CONFIG"
      echo "✅ Frontend config updated"
    else
      echo "⚠️  Manual step: Update frontend config with API URL: $API_URL"
    fi
  fi
else
  echo "⚠️  Could not retrieve API Gateway URL"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test API endpoints: curl $API_URL/devices"
echo "2. Update frontend API configuration if needed"
echo "3. Deploy frontend application"