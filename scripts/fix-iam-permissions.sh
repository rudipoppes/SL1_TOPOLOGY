#!/bin/bash

# Fix IAM permissions for EC2 instance
# This script updates the IAM role to include SSM Parameter Store permissions

set -e

echo "🔧 Fixing IAM permissions for SL1 Topology"
echo ""

# Get current instance ID and IAM role
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
INSTANCE_PROFILE=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text)

if [[ "$INSTANCE_PROFILE" == "None" ]]; then
    echo "❌ No IAM instance profile attached to this EC2 instance"
    echo "💡 Please attach an IAM role to your EC2 instance with the following permissions:"
    echo ""
    cat ../aws-iam-policy.json
    exit 1
fi

# Extract role name from instance profile ARN
ROLE_NAME=$(echo $INSTANCE_PROFILE | cut -d'/' -f2)
echo "📋 Current IAM Role: $ROLE_NAME"

# Check if the role exists
if ! aws iam get-role --role-name $ROLE_NAME &>/dev/null; then
    echo "❌ IAM role $ROLE_NAME not found"
    exit 1
fi

echo "✅ IAM role found"

# Create/update policy for SSM Parameter Store access
POLICY_NAME="SL1TopologyParameterStoreAccess"
POLICY_DOCUMENT=$(cat ../aws-iam-policy.json)

echo "📝 Creating/updating IAM policy for Parameter Store access..."

# Try to create or update the policy
aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name $POLICY_NAME \
    --policy-document "$POLICY_DOCUMENT"

if [[ $? -eq 0 ]]; then
    echo "✅ IAM policy updated successfully"
    echo ""
    echo "🔐 Your EC2 instance now has permissions to:"
    echo "   • Access AWS Systems Manager Parameter Store"
    echo "   • Store and retrieve encrypted SL1 credentials"
    echo "   • Deploy Lambda functions with secure credential access"
    echo ""
    echo "🚀 You can now run: ./setup-credentials.sh -e development"
else
    echo "❌ Failed to update IAM policy"
    echo "💡 Please manually add these permissions to your EC2 IAM role:"
    echo ""
    cat ../aws-iam-policy.json
    exit 1
fi