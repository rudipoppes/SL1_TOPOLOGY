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

# Check if samconfig.toml exists with S3 bucket info
if [[ -f "samconfig.toml" ]] && grep -q "s3_bucket" samconfig.toml; then
  echo "📦 Using existing SAM configuration..."
  sam deploy \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region "$REGION" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
      Environment="$ENVIRONMENT" \
    --no-fail-on-empty-changeset
else
  echo "📦 No S3 bucket configured. Creating managed S3 bucket..."
  # Use --resolve-s3 to auto-create S3 bucket and save config
  sam deploy \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region "$REGION" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
      Environment="$ENVIRONMENT" \
    --resolve-s3 \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset
fi

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
      # Create backup
      cp "$FRONTEND_CONFIG" "${FRONTEND_CONFIG}.backup"
      
      # Update baseUrl with actual API Gateway URL
      jq --arg url "$API_URL" '.api.baseUrl = $url' "$FRONTEND_CONFIG" > "${FRONTEND_CONFIG}.tmp" && mv "${FRONTEND_CONFIG}.tmp" "$FRONTEND_CONFIG"
      
      echo "✅ Frontend config updated with API URL: $API_URL"
      echo "📄 Backup saved: ${FRONTEND_CONFIG}.backup"
    else
      echo "⚠️  jq not installed. Manual step required:"
      echo "   Update $FRONTEND_CONFIG"
      echo "   Change: \"baseUrl\": \"PLACEHOLDER_LAMBDA_API_URL\""
      echo "   To:     \"baseUrl\": \"$API_URL\""
    fi
  fi
  
  # Also create environment file for frontend development
  FRONTEND_ENV="../frontend/.env.local"
  echo "VITE_API_URL=$API_URL" > "$FRONTEND_ENV"
  echo "📄 Created frontend environment file: $FRONTEND_ENV"
  
else
  echo "⚠️  Could not retrieve API Gateway URL"
  echo "❌ Frontend will continue using fallback URL until deployment succeeds"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test API endpoints: curl $API_URL/devices"
echo "2. Update frontend API configuration if needed"
echo "3. Deploy frontend application"