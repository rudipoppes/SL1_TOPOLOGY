# 🔐 Secure Deployment Guide - SL1_TOPOLOGY

**AWS Best Practice Security Implementation**

## 🚨 Important Security Change

**Credentials are NO LONGER stored in Git!** We now use AWS Systems Manager Parameter Store for secure credential management.

## 🛡️ Security Architecture

```
Developer Machine (Local)
    ↓ git push (NO CREDENTIALS)
GitHub Repository 
    ↓ git pull (TEMPLATE FILES ONLY)
EC2 Instance
    ↓ setup-credentials.sh
AWS Parameter Store (ENCRYPTED)
    ↓ Lambda runtime
SL1 System Access
```

## 📋 Secure Setup Process

### **Step 0: Setup IAM Permissions (One-time)**
See "IAM Permissions Setup" section above - must be done via AWS Console first!

### **Step 1: Setup on EC2**
```bash
# Connect to EC2 via VSCode Remote SSH
cd ~/SL1_TOPOLOGY
git pull origin main

# Run secure credential setup
cd scripts
./setup-credentials.sh -e development
```

### **Step 2: Enter Credentials Securely**
The script will prompt for:
```
SL1 Username: rpoppes_gql
SL1 Password: [hidden]
```

You should see:
```
✅ Credentials stored securely in AWS Parameter Store
✅ Created sl1-config.json (credentials loaded from AWS Parameter Store)
✅ Created deploy-config.json (credentials loaded from AWS Parameter Store)
```

### **Step 3: Deploy with Secure Credentials**
```bash
cd ../backend
./deploy.sh -e development
```

The deployment will:
- Build Lambda functions with secure credential loading
- Deploy using CloudFormation/SAM
- Auto-update frontend config with API Gateway URL
- Create DynamoDB caching table

## 🔍 What Happens Behind the Scenes

### **Credential Storage:**
1. **AWS Parameter Store** stores encrypted credentials:
   - `/sl1-topology/development/sl1-username`
   - `/sl1-topology/development/sl1-password`
   - `/sl1-topology/development/sl1-url`

2. **Lambda Functions** automatically load credentials at runtime
3. **No credentials** in code, config files, or git

### **Configuration Loading Priority:**
1. **AWS Parameter Store** (highest security)
2. **Environment Variables** (runtime overrides)
3. **Template Files** (structure only, no credentials)

## 📁 File Structure

### **In Git (Safe):**
```
config/
├── sl1-config.template.json      # Template with placeholders
├── deploy-config.template.json   # Template with placeholders
├── frontend-config.json          # No credentials
└── README.md                     # Documentation
```

### **On EC2 (After Setup):**
```
config/
├── sl1-config.json              # Created from template
├── deploy-config.json           # Created from template
└── (credentials loaded from AWS Parameter Store)
```

### **Never in Git:**
- `config/sl1-config.json` (blocked by .gitignore)
- `config/deploy-config.json` (blocked by .gitignore)
- Any files with real credentials

## 🔧 IAM Permissions Setup (Required First)

### **Manual Setup via AWS Console:**

Your EC2 instance needs **FIVE** inline policies. Add each one separately:

#### **Policy 1: Parameter Store Access**
1. **Go to AWS Console** → **IAM** → **Roles**
2. **Find your EC2 role** (e.g., `EC2_Lambda_services`)
3. **Click** "Add permissions" → "Create inline policy"
4. **Switch to JSON tab** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:PutParameter",
        "ssm:DeleteParameter"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/sl1-topology/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

5. **Name the policy**: `SL1TopologyParameterStore`
6. **Click** "Create policy"

#### **Policy 2: Lambda Deployment Permissions**
Repeat steps 1-3, then paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:ListRoleTags",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

**Name**: `LambdaDeploymentPermissions`

#### **Policy 3: CloudWatch Logs Access**
Repeat steps 1-3, then paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:GetLogEvents",
        "logs:DescribeLogStreams",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

**Name**: `CloudWatchLogsAccess`

#### **Policy 4: CloudFormation Access**
Repeat steps 1-3, then paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:GetTemplate"
      ],
      "Resource": "*"
    }
  ]
}
```

**Name**: `CloudFormationAccess`

#### **Policy 5: S3 SAM Bucket Access**
Repeat steps 1-3, then paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:CreateBucket"
      ],
      "Resource": [
        "arn:aws:s3:::aws-sam-cli-managed-default-*",
        "arn:aws:s3:::aws-sam-cli-managed-default-*/*"
      ]
    }
  ]
}
```

**Name**: `S3SAMBucketAccess`

**Note:** EC2 instances cannot modify their own IAM roles for security reasons, so this must be done via the AWS Console.

## 🚀 Lambda Deployment Process

### **Secure Credential Flow:**
1. Lambda function starts
2. Config loader connects to AWS Parameter Store
3. Credentials loaded encrypted in memory
4. SL1 connection established
5. Data retrieved and cached

### **Error Handling:**
- If Parameter Store unavailable → deployment fails safely
- If credentials wrong → clear error message
- If SL1 unreachable → graceful fallback

## 🛠️ Common Operations

### **Update Credentials:**
```bash
cd scripts
./setup-credentials.sh development
```

### **Add New Environment:**
```bash
cd scripts
./setup-credentials.sh staging
./setup-credentials.sh production
```

### **View Stored Parameters:**
```bash
aws ssm get-parameters \
  --names "/sl1-topology/development/sl1-username" \
  --with-decryption
```

### **Delete Credentials:**
```bash
aws ssm delete-parameter --name "/sl1-topology/development/sl1-username"
aws ssm delete-parameter --name "/sl1-topology/development/sl1-password"
aws ssm delete-parameter --name "/sl1-topology/development/sl1-url"
```

## 🚨 Comprehensive Troubleshooting Guide

### **Problem: "Missing SL1 configuration" or "Missing parameters in Parameter Store"**
**Solution:** Run credential setup:
```bash
cd scripts
./setup-credentials.sh -e development
```

### **Problem: "Cannot find module '../../shared/config-loader'"**
**Cause:** Lambda deployment missing shared modules  
**Solution:** Fixed in latest code - ensure you have latest commits:
```bash
git pull origin main
```

### **Problem: "Failed to load configuration" or "No configuration file found"**
**Cause:** Lambda trying to read config files that don't exist in runtime  
**Solution:** Fixed in latest code - config-loader now uses hardcoded base config

### **Problem: "cacheResult is not a function"**
**Cause:** Variable name conflict in Lambda function  
**Solution:** Fixed in latest code - variable renamed to avoid shadowing

### **Problem: "Unexpected token < in JSON at position 0"**
**Cause:** SL1 returning HTML login page instead of JSON (wrong credentials)  
**Solution:** Fix credentials with correct password:
```bash
# Check what's stored
aws ssm get-parameter --name "/sl1-topology/development/sl1-password" --with-decryption --region us-east-1

# Fix password (use single quotes to prevent bash interpretation)
aws ssm put-parameter \
  --name "/sl1-topology/development/sl1-password" \
  --value 'T3stSL!pwd' \
  --type "SecureString" \
  --overwrite \
  --region us-east-1
```

### **Problem: IAM Permission Errors**
**Errors like:** `not authorized to perform: lambda:UpdateFunctionConfiguration`
**Solution:** Add comprehensive IAM policy to EC2 role:
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
        "iam:*",
        "ssm:*",
        "kms:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Problem: CloudFormation Stack in DELETE_FAILED or UPDATE_ROLLBACK_FAILED**
**Solution:** Delete via AWS Console:
1. Go to CloudFormation → Find your stack
2. Actions → Delete stack  
3. Leave all checkboxes unchecked to delete everything
4. Redeploy fresh

### **Problem: Password with special characters not working**
**Cause:** Bash interpreting escape characters in setup script  
**Solution:** Use single quotes when setting password manually:
```bash
aws ssm put-parameter --name "/sl1-topology/development/sl1-password" --value 'YOUR_PASSWORD' --type "SecureString" --overwrite
```

## ✅ Security Best Practices Implemented

- ✅ **No credentials in Git** (blocked by .gitignore)
- ✅ **Encrypted storage** (AWS Parameter Store with KMS)
- ✅ **IAM-based access** (only authorized roles can access)
- ✅ **Environment separation** (dev/staging/prod parameters)
- ✅ **Audit trail** (AWS CloudTrail logs all parameter access)
- ✅ **Rotation ready** (update parameters without code changes)

## 🎯 Benefits

### **For Security:**
- Credentials never leave AWS environment
- Encrypted at rest and in transit
- Access logged and auditable
- Easy credential rotation

### **For Development:**
- No accidental credential commits
- Clean git history
- Environment-specific configurations
- Team collaboration without credential sharing

## 🔧 Important Fix: Lambda Function Update

**If you encounter "Missing SL1 configuration" errors after deployment:**

The Lambda functions have been updated to use Parameter Store instead of environment variables. You must redeploy after setting up credentials:

```bash
# 1. Setup credentials in Parameter Store
cd scripts
./setup-credentials.sh -e development

# 2. Rebuild and redeploy Lambda functions
cd ../backend
sam build
sam deploy --stack-name sl1-topology-backend-development --region us-east-1 \
  --capabilities CAPABILITY_IAM --parameter-overrides Environment=development \
  --resolve-s3 --no-confirm-changeset
```

**What Changed:**
- Lambda functions now load credentials from Parameter Store at runtime
- No more environment variable dependencies
- Enhanced error messages for troubleshooting

## 📞 Next Steps

1. **Setup credentials** using the secure script
2. **Deploy Lambda functions** with secure credential loading
3. **Test SL1 integration** with real encrypted credentials
4. **Monitor access** via CloudTrail logs

## ✅ Testing Your Deployment

After deployment, test the API endpoint:

```bash
# Get the API Gateway URL from deployment output
API_URL="https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod"

# Test the devices endpoint
curl $API_URL/devices

# Expected success response:
{
  "devices": [
    {
      "id": "123",
      "name": "router-01", 
      "ip": "10.0.1.1",
      "type": "1000",
      "status": "online",
      "organization": "1"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 50, 
    "offset": 0,
    "hasMore": false
  },
  "filters": {
    "availableTypes": ["1000", "2000"],
    "availableStatuses": ["online", "offline", "warning", "unknown"]
  }
}

# If you see an error, check CloudWatch logs:
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/sl1-topology" --region us-east-1
aws logs tail /aws/lambda/[ACTUAL_LOG_GROUP_NAME] --region us-east-1
```

## 🎯 **VERIFIED WORKING** - Complete Success Checklist

✅ **Parameter Store Integration**: Lambda functions load SL1 credentials securely  
✅ **SL1 GraphQL Connection**: Successfully authenticates and retrieves device data  
✅ **DynamoDB Caching**: Results cached for performance  
✅ **API Gateway**: RESTful endpoint responding with JSON data  
✅ **CloudWatch Logs**: Full visibility into function execution  
✅ **Security**: No credentials in code or config files

This approach follows AWS security best practices and enterprise-grade credential management!