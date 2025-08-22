#!/bin/bash

# SL1 Topology - Secure Credential Setup Script
# Uses AWS Systems Manager Parameter Store for secure credential storage

set -e

echo "🔐 SL1 Topology Secure Credential Setup"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Parse command line arguments
ENVIRONMENT="development"

while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    *)
      ENVIRONMENT="$1"
      shift
      ;;
  esac
done

echo "📋 Setting up credentials for environment: $ENVIRONMENT"

# Get SL1 credentials from user
echo ""
echo "🔑 Please enter your SL1 credentials:"
read -p "SL1 Username: " SL1_USERNAME
echo -n "SL1 Password: "
read -s SL1_PASSWORD
echo ""

# Store credentials in AWS Systems Manager Parameter Store
echo "💾 Storing credentials in AWS Parameter Store..."

aws ssm put-parameter \
    --name "/sl1-topology/$ENVIRONMENT/sl1-username" \
    --value "$SL1_USERNAME" \
    --type "SecureString" \
    --overwrite \
    --description "SL1 username for topology application"

aws ssm put-parameter \
    --name "/sl1-topology/$ENVIRONMENT/sl1-password" \
    --value "${SL1_PASSWORD}" \
    --type "SecureString" \
    --overwrite \
    --description "SL1 password for topology application"

aws ssm put-parameter \
    --name "/sl1-topology/$ENVIRONMENT/sl1-url" \
    --value "https://52.3.210.190/gql" \
    --type "String" \
    --overwrite \
    --description "SL1 GraphQL endpoint URL"

echo "✅ Credentials stored securely in AWS Parameter Store"
echo ""

# Create local config files from templates
echo "📄 Creating local config files from templates..."

CONFIG_DIR="../config"

# Copy template files and replace placeholders
if [[ -f "$CONFIG_DIR/sl1-config.template.json" ]]; then
    cp "$CONFIG_DIR/sl1-config.template.json" "$CONFIG_DIR/sl1-config.json"
    # Note: Actual credentials will be loaded from Parameter Store
    echo "✅ Created sl1-config.json (credentials loaded from AWS Parameter Store)"
fi

if [[ -f "$CONFIG_DIR/deploy-config.template.json" ]]; then
    cp "$CONFIG_DIR/deploy-config.template.json" "$CONFIG_DIR/deploy-config.json"
    echo "✅ Created deploy-config.json (credentials loaded from AWS Parameter Store)"
fi

echo ""
echo "🎉 Credential setup complete!"
echo ""
echo "📋 What was created:"
echo "   • Secure credentials stored in AWS Parameter Store"
echo "   • Local config files created from templates"
echo "   • Lambda functions will automatically load credentials from Parameter Store"
echo ""
echo "🚀 Next steps:"
echo "   1. cd ../backend"
echo "   2. ./deploy.sh -e $ENVIRONMENT"
echo ""
echo "🔒 Security notes:"
echo "   • Credentials are encrypted in AWS Parameter Store"
echo "   • Local config files do not contain real credentials"
echo "   • Only authorized AWS IAM roles can access the credentials"