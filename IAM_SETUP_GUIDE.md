# 🔐 Complete IAM Setup Guide

This guide contains ALL the IAM permissions needed for the SL1_TOPOLOGY project to work correctly.

## 📋 Required IAM Policies for EC2 Instance

Your EC2 instance IAM role needs **SIX** inline policies to deploy and manage the SL1 Topology system.

### Option 1: Single Combined Policy (Easier)

You can create ONE policy with all permissions. Go to **AWS Console** → **IAM** → **Roles** → Your EC2 Role → **Add permissions** → **Create inline policy** → **JSON**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LambdaDeploymentPermissions",
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "dynamodb:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormationAccess",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:GetTemplate",
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:ListStacks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3SAMBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketVersioning",
        "s3:PutBucketVersioning",
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::aws-sam-cli-managed-default-*",
        "arn:aws:s3:::aws-sam-cli-managed-default-*/*"
      ]
    },
    {
      "Sid": "IAMRoleManagement",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:ListRoles",
        "iam:ListRolePolicies",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:ListRoleTags",
        "iam:PassRole"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ParameterStoreAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:PutParameter",
        "ssm:DeleteParameter",
        "ssm:DescribeParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/sl1-topology/*"
    },
    {
      "Sid": "KMSDecryption",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:FilterLogEvents",
        "logs:GetLogEvents",
        "logs:DescribeLogStreams",
        "logs:DescribeLogGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

**Policy Name**: `SL1TopologyCompleteAccess`

### Option 2: Six Separate Policies (More Granular)

If you prefer to separate concerns, create six policies:

#### Policy 1: Parameter Store & Credentials
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
**Name**: `SL1TopologyParameterStore`

#### Policy 2: Lambda & API Gateway
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "dynamodb:*"
      ],
      "Resource": "*"
    }
  ]
}
```
**Name**: `LambdaDeploymentPermissions`

#### Policy 3: CloudFormation
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
        "cloudformation:GetTemplate",
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:ListStacks"
      ],
      "Resource": "*"
    }
  ]
}
```
**Name**: `CloudFormationAccess`

#### Policy 4: S3 SAM Buckets
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketVersioning",
        "s3:PutBucketVersioning",
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject"
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

#### Policy 5: IAM Role Management
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
**Name**: `IAMRoleManagement`

#### Policy 6: CloudWatch Logs
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

## 🔍 What Each Permission Does

### **Lambda & API Gateway**
- Deploy and manage Lambda functions
- Create and configure API Gateway endpoints
- Required for `sam deploy` to work

### **IAM Role Management**
- Create IAM roles for Lambda functions
- Tag roles (required by CloudFormation)
- Delete roles during stack cleanup
- Without these, deployment fails with "UnauthorizedTaggingOperation"

### **Parameter Store**
- Store SL1 credentials securely
- Lambda functions retrieve credentials at runtime
- Required for secure credential management

### **KMS**
- Decrypt encrypted parameters
- Required because Parameter Store uses KMS encryption

### **CloudWatch Logs**
- View Lambda function logs
- Debug issues with API calls
- Monitor system health

### **DynamoDB**
- Create cache tables
- Lambda functions cache SL1 data

### **S3**
- Store Lambda deployment packages
- SAM creates buckets for code storage

## 🚨 Common Permission Errors and Solutions

| Error | Missing Permission | Solution |
|-------|-------------------|----------|
| `not authorized to perform: iam:TagRole` | IAM TagRole | Add IAM role management permissions |
| `not authorized to perform: ssm:PutParameter` | SSM PutParameter | Add Parameter Store permissions |
| `not authorized to perform: logs:FilterLogEvents` | CloudWatch Logs | Add logs permissions |
| `not authorized to perform: iam:DeleteRolePolicy` | IAM DeleteRolePolicy | Add full IAM role permissions |
| `S3 Bucket not specified` | S3 permissions | Add S3 permissions for SAM |
| `not authorized to perform: s3:PutObject` | S3 PutObject | Add S3 SAM bucket permissions |
| `not authorized to perform: cloudformation:CreateChangeSet` | CloudFormation | Add CloudFormation permissions |

## ✅ Verification Steps

After adding permissions, verify everything works:

1. **Test credential storage**:
   ```bash
   cd scripts
   ./setup-credentials.sh -e development
   ```

2. **Test deployment**:
   ```bash
   cd backend
   ./deploy.sh -e development
   ```

3. **Test API**:
   ```bash
   curl https://your-api-url/prod/devices
   ```

4. **Check logs**:
   ```bash
   aws logs tail /aws/lambda/your-function-name --follow
   ```

## 📝 Notes

- **Security Best Practice**: These permissions are broad for development. In production, restrict resources to specific ARNs
- **Region-Specific**: Some resources like Parameter Store paths include region/account
- **Incremental Setup**: Start with Parameter Store permissions, then add others as needed