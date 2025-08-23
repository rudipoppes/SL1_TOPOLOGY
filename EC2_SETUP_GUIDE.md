# EC2 Development Environment Setup Guide

## Quick Start Checklist

### Step 1: Launch EC2 Instance (AWS Console)
1. **AMI**: **Ubuntu 22.04 LTS** (recommended) or Amazon Linux 2
2. **Instance Type**: t3.medium (recommended for development)
3. **Key Pair**: Create or use existing SSH key pair
4. **Security Group**: Create with these rules:
   - SSH (22) - Your IP only
   - HTTP (80) - 0.0.0.0/0
   - Custom TCP (3000) - 0.0.0.0/0 (API Gateway local testing)
   - Custom TCP (5173) - 0.0.0.0/0 (Vite dev server)

### Step 2: Create IAM Role for EC2
1. **Service**: EC2
2. **Policies**: Create custom policy with these permissions:
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
        "iam:PassRole",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "*"
    }
  ]
}
```
3. **Attach** the role to your EC2 instance

### Step 3: Connect and Install Tools

**For Ubuntu 22.04 LTS (Recommended):**
```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

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

# Verify installations
node --version  # Should be 18+
npm --version
aws --version
sam --version
```

**For Amazon Linux 2:**
```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Update system
sudo yum update -y

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Install AWS CLI v2 and SAM CLI (same as Ubuntu above)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install

# Verify installations
node --version
npm --version
aws --version
sam --version
```

### Step 4: Setup VSCode Remote SSH
1. **Install Extension**: "Remote - SSH" in VSCode
2. **Connect**: Cmd/Ctrl+Shift+P → "Remote-SSH: Connect to Host"
3. **Add Host**: 
   - Ubuntu: `ubuntu@your-ec2-public-ip`
   - Amazon Linux: `ec2-user@your-ec2-public-ip`
4. **Select SSH Key**: Choose your private key file

### Step 5: Clone and Setup Project
```bash
# In VSCode terminal (connected to EC2)
git clone https://github.com/rudipoppes/SL1_TOPOLOGY.git
cd SL1_TOPOLOGY

# Setup backend
cd backend
npm install

# Setup frontend
cd ../frontend
npm install
```

### Step 6: Deploy and Test
```bash
# Deploy Lambda functions (from backend directory)
cd backend
sam build
sam deploy --guided

# Start frontend dev server (from frontend directory)
cd ../frontend
npm run dev -- --host 0.0.0.0

# Access frontend: http://your-ec2-public-ip:5173
```

## Next Steps After Setup
1. Update frontend API URL to use deployed Lambda endpoint
2. Test device loading with real SL1 data
3. Implement React Flow topology visualization
4. Add drag-and-drop functionality

## Troubleshooting
- **Permission Denied**: Ensure IAM role is attached to EC2 instance
- **Port Access**: Check security group allows inbound on ports 5173, 3000
- **SSH Connection**: Verify key permissions: `chmod 400 your-key.pem`
- **Node/NPM Issues**: Use Node.js LTS version (18.x)

## Benefits of This Setup
- ✅ No AWS credential expiration issues
- ✅ Real cloud environment testing
- ✅ Fast deployment and testing cycles
- ✅ Production-like architecture
- ✅ Team collaboration ready
