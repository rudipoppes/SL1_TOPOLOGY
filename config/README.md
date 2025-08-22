# Configuration Guide - SL1_TOPOLOGY

This guide explains all the URLs and configuration settings in the SL1_TOPOLOGY project. Perfect for someone new to Lambda/AWS.

## 🔧 Configuration Files Overview

### **1. `sl1-config.json` - Main Configuration**
Contains the core settings for the entire system.

```json
{
  "sl1": {
    "url": "https://52.3.210.190/gql",        // ← SL1 System IP Address
    "username": "rpoppes_gql",                // ← Your SL1 username  
    "password": "T3stSL!pwd",                 // ← Your SL1 password
    "timeout": 30000,                         // ← Request timeout (30 seconds)
    "retryAttempts": 3                        // ← Retry failed requests 3 times
  }
}
```

**What is this URL?**
- This is the IP address of your ScienceLogic (SL1) server
- The `/gql` path is the GraphQL API endpoint
- Lambda functions use this to fetch device data from SL1

### **2. `frontend-config.json` - Frontend Settings**
Controls how the React frontend behaves.

```json
{
  "api": {
    "baseUrl": "PLACEHOLDER_LAMBDA_API_URL",  // ← Gets replaced after Lambda deployment
    "fallbackUrl": "http://localhost:3000",   // ← Development fallback
    "timeout": 10000
  }
}
```

**What is baseUrl?**
- This will become something like: `https://abc123def.execute-api.us-east-1.amazonaws.com/prod`
- AWS automatically generates this URL when you deploy Lambda functions
- The deploy script automatically updates this placeholder

### **3. `deploy-config.json` - Environment-Specific Settings**
Different settings for development, staging, and production.

```json
{
  "development": {
    "sl1": {
      "url": "https://52.3.210.190/gql",      // ← Same SL1 IP for all environments
      "username": "rpoppes_gql",
      "password": "T3stSL!pwd"
    },
    "cors": {
      "allowedOrigins": [
        "http://localhost:5173",              // ← Where your React dev server runs
        "http://localhost:3000"               // ← Alternative dev server port
      ]
    }
  }
}
```

**What are CORS origins?**
- These are the URLs where your React frontend will run
- Lambda functions need to know these to allow API calls
- During development: `http://localhost:5173` (Vite dev server)
- In production: your actual domain

## 🚀 URL Flow During Deployment

### **Before Lambda Deployment:**
```
Frontend Config: "baseUrl": "PLACEHOLDER_LAMBDA_API_URL"
Status: Frontend uses fallback URL (localhost:3000) 
Result: Mock data works, but no real SL1 integration
```

### **After Lambda Deployment:**
```
1. Deploy script runs: ./backend/deploy.sh -e development
2. AWS creates Lambda functions
3. AWS auto-generates API Gateway URL: https://abc123def.execute-api.us-east-1.amazonaws.com/prod
4. Deploy script updates frontend config with real URL
5. Frontend can now call Lambda functions
6. Lambda functions fetch real data from SL1 (https://52.3.210.190/gql)
```

## 📋 Complete URL Reference

| URL Type | Example | Purpose | When Available |
|----------|---------|---------|----------------|
| **SL1 GraphQL** | `https://52.3.210.190/gql` | Lambda fetches device data | Always (your SL1 server) |
| **API Gateway** | `https://abc123def.execute-api.us-east-1.amazonaws.com/prod` | Frontend calls Lambda | After deployment |
| **Frontend Dev** | `http://localhost:5173` | React development server | When running `npm run dev` |
| **Frontend Prod** | `https://topology.your-domain.com` | Production website | When deployed to hosting |

## 🔄 Configuration Priority

The system loads configuration in this order (highest priority first):

1. **Environment Variables** (e.g., `VITE_API_URL`, `SL1_URL`)
2. **Deploy Config** (environment-specific settings)
3. **Base Config** (sl1-config.json, frontend-config.json)

## ⚙️ Common Configuration Tasks

### **Update SL1 Credentials**
Edit `config/sl1-config.json`:
```json
{
  "sl1": {
    "url": "https://YOUR_SL1_IP/gql",
    "username": "your_username",
    "password": "your_password"
  }
}
```

### **Add New Environment**
Edit `config/deploy-config.json`:
```json
{
  "my-environment": {
    "sl1": { ... },
    "cors": {
      "allowedOrigins": ["https://my-domain.com"]
    }
  }
}
```

### **Override Config for Testing**
Create `.env.local` in frontend folder:
```bash
VITE_API_URL=https://different-api-url.com
```

## 🚨 Troubleshooting URLs

### **Problem: Frontend shows "Loading devices..." forever**
**Cause:** API URL not configured or Lambda not deployed  
**Solution:** Check frontend config, run deploy script

### **Problem: CORS errors in browser**
**Cause:** Frontend URL not in CORS allowedOrigins  
**Solution:** Add your frontend URL to deploy-config.json

### **Problem: Lambda can't connect to SL1**
**Cause:** Wrong SL1 URL or credentials  
**Solution:** Verify SL1 IP address and credentials in config

### **Problem: "PLACEHOLDER_LAMBDA_API_URL" in API calls**
**Cause:** Deploy script hasn't run or failed  
**Solution:** Run `./backend/deploy.sh -e development`

## 📝 Next Steps

1. **Verify SL1 URL:** Test that `https://52.3.210.190/gql` is accessible
2. **Deploy Lambda:** Run `./backend/deploy.sh -e development`
3. **Check Frontend:** See if API URL was automatically updated
4. **Test Integration:** Try loading devices in the React app

## 🆘 Getting Help

If URLs are confusing:
1. Check this documentation
2. Look at console messages (browser/terminal)
3. Verify each URL type is properly configured
4. Test one component at a time (SL1 → Lambda → Frontend)