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

### **Step 1: Setup on EC2**
```bash
# Connect to EC2 via VSCode Remote SSH
cd ~/SL1_TOPOLOGY
git pull origin main

# Run secure credential setup
cd scripts
./setup-credentials.sh development
```

### **Step 2: Enter Credentials Securely**
The script will prompt for:
```
SL1 Username: rpoppes_gql
SL1 Password: [hidden]
```

### **Step 3: Deploy with Secure Credentials**
```bash
cd ../backend
./deploy.sh -e development
```

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

## 🔧 IAM Permissions Required

Your EC2 instance needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:PutParameter"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/sl1-topology/*"
    }
  ]
}
```

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

## 🚨 Troubleshooting

### **Problem: "Missing parameters in Parameter Store"**
**Solution:** Run `./scripts/setup-credentials.sh development`

### **Problem: "Failed to load credentials from Parameter Store"**
**Cause:** EC2 instance lacks SSM permissions  
**Solution:** Attach IAM role with SSM permissions to EC2

### **Problem: "No configuration file found"**
**Solution:** Template files missing, run `git pull origin main`

### **Problem: SL1 connection fails**
**Solution:** Verify credentials with manual test:
```bash
curl -k -u "username:password" https://52.3.210.190/gql
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

## 📞 Next Steps

1. **Setup credentials** using the secure script
2. **Deploy Lambda functions** with secure credential loading
3. **Test SL1 integration** with real encrypted credentials
4. **Monitor access** via CloudTrail logs

This approach follows AWS security best practices and enterprise-grade credential management!