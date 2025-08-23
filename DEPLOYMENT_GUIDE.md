# 🚀 SL1_TOPOLOGY Deployment Guide

**Complete step-by-step guide for someone new to Lambda/AWS**

## 📋 Prerequisites

### **1. AWS Account Setup**
- AWS account with appropriate permissions
- AWS CLI installed and configured
- SAM CLI installed

### **2. EC2 Instance (Recommended)**
- t3.medium instance with Ubuntu 22.04 LTS
- IAM role with Lambda/API Gateway/DynamoDB permissions
- Security group allowing ports 22, 80, 5173

### **3. Development Tools**
- Node.js 18+
- Git
- VSCode with Remote-SSH extension

## 🔧 Configuration Verification

Before deployment, verify your configuration:

### **1. Check SL1 Settings**
```bash
# Verify SL1 endpoint is accessible
curl -k https://52.3.210.190/gql

# Should return GraphQL schema information
```

### **2. Review Config Files**
```bash
# Check main config
cat config/sl1-config.json

# Verify SL1 URL is: https://52.3.210.190/gql
# Verify credentials are correct
```

### **3. Validate AWS Setup**
```bash
# Test AWS credentials
aws sts get-caller-identity

# Should show your AWS account info
```

## 🚀 Step-by-Step Deployment

### **Step 1: Clone and Setup**
```bash
# On your EC2 instance (via VSCode Remote SSH)
git clone https://github.com/rudipoppes/SL1_TOPOLOGY.git
cd SL1_TOPOLOGY

# Setup backend dependencies
cd backend
npm install

# Setup frontend dependencies
cd ../frontend
npm install
```

### **Step 2: Deploy Lambda Backend**
```bash
# From backend directory
cd backend

# Make deploy script executable (if not already)
chmod +x deploy.sh

# Deploy to development environment
./deploy.sh -e development

# Expected output:
# 📦 Building Lambda functions...
# ✅ Build completed
# 🚀 Deploying to AWS...
# ✅ Deployment completed successfully!
# 🌐 API Gateway URL: https://abc123def.execute-api.us-east-1.amazonaws.com/prod
# ✅ Frontend config updated with API URL
```

### **Step 3: Verify Backend Deployment**
```bash
# Test API endpoints (replace with your actual API URL)
API_URL="https://abc123def.execute-api.us-east-1.amazonaws.com/prod"

# Test device endpoint
curl "$API_URL/devices"

# Should return JSON with device data from SL1
```

### **Step 4: Start Frontend Development**
```bash
# From frontend directory
cd frontend

# Start development server
npm run dev -- --host 0.0.0.0

# Expected output:
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://172.31.x.x:5173/
```

### **Step 5: Access Application**
```bash
# Open browser to:
http://YOUR_EC2_PUBLIC_IP:5173

# You should see:
# - Device inventory loading real SL1 data
# - Search and filtering working
# - Drag & drop ready for topology canvas
```

## 🔍 What Happens During Deployment

### **Backend Deployment Process:**
1. **SAM Build:** Packages Lambda functions and dependencies
2. **CloudFormation Deploy:** Creates AWS resources:
   - 3 Lambda functions (getDevices, getTopology, searchDevices)
   - API Gateway with REST endpoints
   - DynamoDB table for caching
3. **Auto-Configuration:** Deploy script automatically:
   - Gets generated API Gateway URL
   - Updates `config/frontend-config.json`
   - Creates `frontend/.env.local`

### **Frontend Integration:**
1. **Config Loading:** React app loads configuration
2. **URL Resolution:** If API URL is placeholder, uses fallback
3. **API Calls:** Makes requests to Lambda functions
4. **SL1 Integration:** Lambda functions fetch data from SL1

## 📊 Understanding the Data Flow

```
React Frontend (EC2:5173)
    ↓ HTTP requests
API Gateway (AWS)
    ↓ Invokes
Lambda Functions (AWS)
    ↓ GraphQL queries  
SL1 System (52.3.210.190/gql)
    ↓ Returns device data
Lambda Functions
    ↓ Cache in DynamoDB
    ↓ Return JSON
React Frontend (displays devices)
```

## 🛠️ Configuration After Deployment

### **Check Frontend Config**
```bash
# Verify API URL was updated
cat config/frontend-config.json

# Should show:
# "baseUrl": "https://abc123def.execute-api.us-east-1.amazonaws.com/prod"
```

### **Check Environment File**
```bash
# Verify environment override
cat frontend/.env.local

# Should show:
# VITE_API_URL=https://abc123def.execute-api.us-east-1.amazonaws.com/prod
```

## 🔄 Redeployment

### **Update Lambda Functions**
```bash
# After making code changes
cd backend
./deploy.sh -e development

# Only deploys changed functions
```

### **Reset Configuration**
```bash
# If you need to reset API URL
cd config
cp frontend-config.json.backup frontend-config.json

# Then redeploy to get fresh URL
```

## 🚨 Troubleshooting

### **Deployment Issues**

**Problem:** `sam command not found`
```bash
# Install SAM CLI
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

**Problem:** AWS permissions denied
```bash
# Verify IAM role attached to EC2
aws sts get-caller-identity

# Check if role has required permissions
```

**Problem:** SL1 connection failed
```bash
# Test SL1 connectivity
curl -k https://52.3.210.190/gql

# Verify credentials in config/sl1-config.json
```

### **Frontend Issues**

**Problem:** CORS errors
```bash
# Check CORS origins in deploy-config.json
# Add your EC2 IP to allowedOrigins
```

**Problem:** API calls fail
```bash
# Check browser console for errors
# Verify API URL in frontend config
# Test API endpoint with curl
```

### **Runtime Issues**

**Problem:** Devices not loading
1. Check browser console for API errors
2. Test Lambda endpoint directly
3. Verify SL1 credentials and connectivity
4. Check CloudWatch logs for Lambda errors

**Problem:** Empty device list
1. Verify SL1 has devices
2. Check GraphQL query format
3. Review Lambda function logs

## 📈 Performance Optimization

### **Caching Configuration**
```json
// Adjust cache TTL in deploy-config.json
"cache": {
  "ttlSeconds": 300  // 5 minutes for development
}
```

### **Lambda Timeout**
```yaml
# Adjust in backend/template.yaml
Globals:
  Function:
    Timeout: 30  # Increase if SL1 is slow
```

## 🎯 Next Steps After Deployment

1. **Verify Integration:** Confirm real SL1 data appears in frontend
2. **Add Topology Canvas:** Implement React Flow visualization
3. **Test Relationships:** Implement device relationship queries
4. **Production Deployment:** Deploy to staging/production environments
5. **Monitoring:** Set up CloudWatch alarms and logging

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs for Lambda functions
2. Review browser console for frontend errors
3. Verify configuration files are correct
4. Test individual components (SL1 → Lambda → Frontend)

Remember: The system is designed to be config-driven. All URLs and credentials come from configuration files, making it easy to update and maintain.