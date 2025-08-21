# Git Workflow Template - Professional Best Practices

**Copy this file to any new project and customize the placeholders for your specific needs.**

---

## Quick Reference Commands

### Daily Git Commands
```bash
# Check status and recent commits
git status
git log --oneline -10

# Start new feature
git checkout main
git pull origin main
git checkout -b feature/descriptive-name

# Save and commit work
git add .
git commit -m "feat: clear description of what changed"
git push origin feature/descriptive-name

# Sync with latest changes
git fetch origin
git pull origin main
```

---

## Project Initialization (From Scratch)

### 1. Create New Project Repository

#### Option A: Start Locally
```bash
# Create project directory
mkdir your-project-name
cd your-project-name

# Initialize Git
git init
git branch -M main

# Create basic files
echo "# Your Project Name" > README.md
echo "node_modules/" > .gitignore  # Adjust for your tech stack
touch .env.example

# First commit
git add .
git commit -m "feat: initial project setup"

# Connect to GitHub (after creating repo on GitHub)
git remote add origin https://github.com/yourusername/your-project-name.git
git push -u origin main
```

#### Option B: Start from GitHub
```bash
# Clone from GitHub
git clone https://github.com/yourusername/your-project-name.git
cd your-project-name

# Verify connection
git remote -v
```

### 2. Project Setup Checklist
- [ ] README.md with project description
- [ ] .gitignore for your technology stack
- [ ] License file (if open source)
- [ ] Environment example file (.env.example)
- [ ] Contributing guidelines (CONTRIBUTING.md)
- [ ] This CLAUDE.md template file

---

## Branching Strategy (Feature Branch Workflow)

### Branch Types
- **`main`**: Production-ready code only
- **`feature/feature-name`**: New features and enhancements
- **`fix/bug-description`**: Bug fixes
- **`hotfix/critical-fix`**: Emergency production fixes
- **`release/version`**: Release preparation (optional)

### Standard Feature Development Workflow

```bash
# 1. Start from clean main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/user-authentication
# or: git checkout -b fix/login-validation-error

# 3. Develop feature (commit frequently)
git add .
git commit -m "feat: add user login form"
git add .
git commit -m "feat: add password validation"
git add .
git commit -m "test: add authentication tests"

# 4. Push feature branch
git push origin feature/user-authentication

# 5. Create Pull Request via GitHub web interface
# 6. After approval and merge, clean up
git checkout main
git pull origin main
git branch -d feature/user-authentication
```

### Working with Multiple Features
```bash
# Switch between feature branches
git checkout feature/user-authentication
git checkout feature/dashboard-ui

# Save work in progress temporarily
git stash save "WIP: login form styling"
git checkout other-branch
# ... do other work ...
git checkout feature/user-authentication
git stash pop
```

---

## Commit Message Standards (Conventional Commits)

### Format
```
type(scope): brief description

Optional longer explanation if needed

type: feat, fix, docs, style, refactor, test, chore, perf
scope: optional, specific area of codebase
```

### Examples
```bash
# Features
git commit -m "feat: add user registration endpoint"
git commit -m "feat(auth): implement JWT token validation"

# Bug fixes
git commit -m "fix: resolve login redirect issue"
git commit -m "fix(api): handle null user data gracefully"

# Documentation
git commit -m "docs: update API documentation"
git commit -m "docs: add deployment instructions"

# Code maintenance
git commit -m "refactor: simplify user validation logic"
git commit -m "test: add unit tests for auth service"
git commit -m "chore: update dependencies"
```

---

## Collaboration Workflow

### Pull Request Process
1. **Create Feature Branch**: Always branch from `main`
2. **Develop & Commit**: Make focused, logical commits
3. **Push Branch**: `git push origin feature/branch-name`
4. **Open Pull Request**: Via GitHub web interface
5. **Request Review**: Assign team members
6. **Address Feedback**: Make requested changes
7. **Merge**: After approval (squash and merge preferred)
8. **Clean Up**: Delete feature branch

### Code Review Best Practices
- **Review promptly**: Don't block teammates
- **Be constructive**: Suggest improvements, not just problems
- **Test locally**: Check out the branch if needed
- **Focus on**: Logic, security, performance, maintainability

---

## Production Deployment Workflow

### Development → Staging → Production

#### Development Environment
```bash
# Regular feature development
git checkout -b feature/new-feature
# ... develop and test locally ...
git push origin feature/new-feature
# Create Pull Request → merge to main
```

#### Staging Deployment
```bash
# Deploy main branch to staging
git checkout main
git pull origin main
./deploy-staging.sh  # Your staging deployment script
```

#### Production Deployment
```bash
# Create release tag
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# Deploy tagged version
./deploy-production.sh v1.2.0
```

### Hotfix Workflow (Emergency Production Fixes)
```bash
# Create hotfix from production tag
git checkout v1.2.0
git checkout -b hotfix/critical-security-fix

# Make minimal fix
git add .
git commit -m "fix: resolve critical security vulnerability"

# Merge to main and create new tag
git checkout main
git merge hotfix/critical-security-fix
git tag -a v1.2.1 -m "Hotfix: security patch"
git push origin main
git push origin v1.2.1

# Deploy immediately
./deploy-production.sh v1.2.1
```

---

## Common Git Operations

### Undoing Changes
```bash
# Undo uncommitted changes
git restore filename.txt           # Restore single file
git restore .                      # Restore all files

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert a committed change (safe for shared branches)
git revert abc123def
```

### Branch Management
```bash
# List branches
git branch                         # Local branches
git branch -r                      # Remote branches
git branch -a                      # All branches

# Delete branches
git branch -d feature/completed    # Delete local branch
git push origin --delete feature/completed  # Delete remote branch

# Rename branch
git branch -m old-name new-name
```

### Syncing and Updates
```bash
# Get latest from all remotes
git fetch origin

# Update main branch
git checkout main
git pull origin main

# Rebase feature branch onto latest main
git checkout feature/my-feature
git rebase main

# Sync fork (if working with forks)
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git checkout main
git merge upstream/main
```

---

## Troubleshooting Common Issues

### Merge Conflicts
```bash
# When conflicts occur during merge/rebase
git status                         # See conflicted files
# Edit files to resolve conflicts
git add .                         # Stage resolved files
git commit                        # Complete merge
# or: git rebase --continue        # Continue rebase
```

### Accidentally Committed to Wrong Branch
```bash
# Move commits to correct branch
git checkout correct-branch
git cherry-pick abc123def          # Move specific commit
git checkout wrong-branch
git reset --hard HEAD~1            # Remove from wrong branch
```

### Lost Changes
```bash
# Find lost commits
git reflog                         # Shows recent HEAD changes
git checkout abc123def             # Recover lost commit

# Recover deleted branch
git checkout -b recovered-branch abc123def
```

### Large Files or Sensitive Data
```bash
# Remove file from history (use carefully!)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch sensitive-file.txt' \
  --prune-empty --tag-name-filter cat -- --all

# Better: Use BFG Repo-Cleaner for large operations
```

---

## Git Configuration Best Practices

### Initial Setup (One Time)
```bash
# Set identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Useful defaults
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global core.autocrlf input        # Linux/Mac
git config --global core.autocrlf true         # Windows

# Better diff and merge tools
git config --global diff.tool vscode
git config --global merge.tool vscode
```

### Repository-Specific Configuration
```bash
# For work vs personal projects
git config user.email "work.email@company.com"  # No --global

# Ignore file permissions (useful for shared development)
git config core.filemode false
```

### Useful Aliases
```bash
# Add to ~/.gitconfig or use git config --global alias.name command
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
git config --global alias.tree 'log --graph --oneline --all'
```

---

## Security Best Practices

### What NOT to Commit
- **Passwords, API keys, tokens**
- **Environment variables** (create .env.example instead)
- **Large binary files** (use Git LFS)
- **Dependencies** (node_modules, vendor, etc.)
- **IDE-specific files** (.vscode/, .idea/)
- **OS-specific files** (.DS_Store, Thumbs.db)

### .gitignore Template
```bash
# Environment variables
.env
.env.local
.env.production

# Dependencies
node_modules/
vendor/
venv/

# Build outputs
dist/
build/
*.log

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Project-specific
[ADD YOUR PROJECT-SPECIFIC IGNORES HERE]
```

### Sensitive Data Recovery
```bash
# If you accidentally committed secrets:
# 1. Change/revoke the exposed credentials immediately
# 2. Remove from history:
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
# 3. Force push (if repository is private and you coordinate with team)
git push origin --force --all
```

---

## Team Collaboration Guidelines

### Repository Setup
- **Protect main branch**: Require pull requests, reviews
- **Use branch naming conventions**: feature/, fix/, hotfix/
- **Require status checks**: CI/CD, tests, linting
- **Set up automated testing**: Run tests on every PR

### Communication Best Practices
- **Descriptive PR titles**: Summarize the change clearly
- **Detailed PR descriptions**: What, why, how, testing done
- **Link issues**: Connect PRs to issue tracking
- **Review thoroughly**: Check logic, security, performance
- **Discuss in PRs**: Use PR comments for technical discussions

### Code Quality Standards
- **Consistent formatting**: Use automated formatters
- **Testing requirements**: Unit tests for new features
- **Documentation**: Update docs with code changes
- **Small, focused PRs**: Easier to review and merge

---

## Advanced Git Workflows

### Git Flow (For Complex Projects)
```bash
# Install git-flow extensions
brew install git-flow        # macOS
apt install git-flow          # Ubuntu

# Initialize git flow
git flow init

# Start new feature
git flow feature start user-authentication

# Finish feature (merges to develop)
git flow feature finish user-authentication

# Create release
git flow release start 1.2.0
git flow release finish 1.2.0
```

### Semantic Versioning with Tags
```bash
# Create semantic version tags
git tag -a v1.0.0 -m "Initial release"
git tag -a v1.1.0 -m "Minor feature release"
git tag -a v1.1.1 -m "Patch release"

# Push tags
git push origin v1.1.1
git push origin --tags

# List tags
git tag -l
git show v1.1.0
```

---

## Integration with Development Tools

### GitHub CLI (Recommended)
```bash
# Install GitHub CLI
brew install gh              # macOS
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg

# Authenticate
gh auth login

# Create repository
gh repo create your-project-name --public

# Create pull request
gh pr create --title "Add user authentication" --body "Implements login and registration"

# Review pull requests
gh pr list
gh pr checkout 123
gh pr review --approve
```

### VS Code Integration
```json
// .vscode/settings.json
{
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,
  "gitlens.currentLine.enabled": false,
  "gitlens.hovers.currentLine.over": "line"
}
```

---

## Project-Specific Customization

**Customize these sections for your specific project:**

### [PROJECT NAME] Specific Workflows
```bash
# Add your project-specific commands here
# Example:
# npm run dev          # Start development server
# npm run build        # Build for production
# npm test             # Run test suite
```

### [PROJECT NAME] Deployment Commands
```bash
# Add your deployment-specific commands here
# Example:
# ./deploy-staging.sh
# ./deploy-production.sh
# docker build -t myapp .
```

### [PROJECT NAME] Testing Strategy
- [ ] Unit tests run on every commit
- [ ] Integration tests run on pull requests
- [ ] Manual testing checklist for releases
- [ ] Performance testing for major releases

---

## Resources and Learning

### Essential Reading
- [Pro Git Book](https://git-scm.com/book) - Comprehensive Git guide
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials) - Visual explanations
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/) - Simple workflow
- [Conventional Commits](https://conventionalcommits.org/) - Commit message standard

### Interactive Learning
- [Learn Git Branching](https://learngitbranching.js.org/) - Visual Git tutorial
- [GitHub Learning Lab](https://lab.github.com/) - Hands-on GitHub training
- [Git Immersion](https://gitimmersion.com/) - Step-by-step Git tutorial

### Tools and Extensions
- **GitHub Desktop**: Visual Git interface
- **GitKraken**: Advanced Git GUI
- **VS Code GitLens**: Enhanced Git integration for VS Code
- **Git Flow**: Branching model implementation

---

**Created: [DATE]**  
**Last Updated: [DATE]**  
**Project: [PROJECT_NAME]**  
**Team: [TEAM_MEMBERS]**

---

*This template is designed to be copied to any new project. Remove this note and customize the placeholders above for your specific project needs.*