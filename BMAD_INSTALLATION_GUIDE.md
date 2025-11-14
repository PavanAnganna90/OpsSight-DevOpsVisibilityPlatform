# BMAD Installation Guide for OpsSight

## Overview

BMAD (Build-Measure-Analyze-Deploy) Method is an AI-driven development framework that provides agents for project evaluation, architecture review, and development workflows.

## Installation Steps

### Prerequisites
- Node.js v20 or higher
- npm 8 or higher

### Manual Installation (Required)

BMAD requires interactive installation. Please run this command **manually in your terminal**:

```bash
npx bmad-method@alpha install
```

### Installation Process

When you run the command, you'll be prompted:

1. **Installation directory**: 
   - Press `Enter` to accept the default (current directory)
   - Or type a custom path

2. **Confirm installation**:
   - Type `Y` and press `Enter` to confirm

3. **Module selection**:
   - Select which BMAD modules you want to install:
     - **BMM** (BMAD Method Manager) - Core framework
     - **BMB** (BMAD Builder) - Build tools
     - **CIS** (Continuous Integration System) - CI/CD integration

4. **IDE Integration**:
   - Choose your IDE (Cursor, VS Code, etc.)
   - Follow prompts to configure integration

### After Installation

Once installed, BMAD will create:
- `bmad/` directory with core components
- Configuration files in `bmad/_cfg/`
- Agent definitions in `bmad/_cfg/agents/`

## Using BMAD Agents for Project Re-Evaluation

### 1. Load an Agent

In your IDE, load a BMAD agent:

```bash
# Project Manager agent
@pm

# Architect agent  
@architect

# Developer agent
@dev
```

### 2. Initialize Workflow

Run the workflow initialization:

```bash
*workflow-init
```

This will guide you through:
- Setting up project workflow paths
- Configuring evaluation criteria
- Defining project goals and metrics

### 3. Run Project Evaluation

Use BMAD agents to re-evaluate your project:

```bash
# Architecture evaluation
@architect *evaluate

# Code quality assessment
@dev *analyze

# Project planning
@pm *plan
```

## BMAD Agents Available

- **@pm** - Project Manager: Project planning, task management, workflow orchestration
- **@architect** - Architect: System architecture review and design decisions
- **@dev** - Developer: Code quality, best practices, implementation review
- **@qa** - Quality Assurance: Testing strategies, quality metrics
- **@ops** - Operations: Deployment, infrastructure, monitoring

## Configuration

After installation, customize agents in:
- `bmad/_cfg/agents/` - Agent configurations
- `bmad/_cfg/workflows/` - Workflow definitions

## Documentation

BMAD documentation is installed locally at:
- `bmad/bmm/docs/` - Core documentation
- `bmad/_cfg/README.md` - Configuration guide

## Troubleshooting

### Installation Issues

If installation fails:
1. Ensure Node.js v20+ is installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Try with stable version: `npx bmad-method@latest install`

### Memory Issues

If you encounter memory errors:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npx bmad-method@alpha install
```

## Next Steps

After installation:
1. Review `bmad/` directory structure
2. Load an agent in your IDE
3. Run `*workflow-init` to set up project workflows
4. Use agents to re-evaluate your OpsSight project architecture and codebase

## Resources

- [BMAD GitHub Repository](https://github.com/bmad-code-org/BMAD-METHOD)
- [BMAD Documentation](https://bmadcodes.com/user-guide/)
- [BMAD Community](https://github.com/bmad-code-org/BMAD-METHOD/discussions)

---

**Note**: BMAD installation must be run manually in your terminal due to interactive prompts. The automated installation attempts failed because BMAD requires user interaction for directory selection and module configuration.

