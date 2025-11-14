# BMAD Setup for OpsSight Project Evaluation

## Quick Installation

Run this command in your terminal:

```bash
npx bmad-method@alpha install
```

### Installation Prompts

1. **Installation directory**: Press `Enter` (uses current directory)
2. **Confirm**: Type `Y` and press `Enter`
3. **Module Selection**: Select all modules (BMM, BMB, CIS) or just BMM for evaluation
4. **IDE Integration**: Select Cursor (or your IDE)

## Using BMAD Agents for Evaluation

Once installed, you can use these agents:

### Available Agents

- **@pm** - Project Manager: Project planning, task management, workflow orchestration
- **@architect** - Architect: System architecture review and design decisions  
- **@dev** - Developer: Code quality, best practices, implementation review
- **@qa** - Quality Assurance: Testing strategies, quality metrics
- **@ops** - Operations: Deployment, infrastructure, monitoring

### Evaluation Workflows

After installation, load an agent and run:

```bash
# Initialize workflow
*workflow-init

# Project evaluation
@pm *evaluate

# Architecture analysis
@architect *analyze

# Code review
@dev *review
```

### Alternative: Direct Slash Commands

```bash
/bmad:bmm:workflows:workflow-init
/bmad:bmm:workflows:prd
/bmad:bmm:workflows:dev-story
```

## Reference

- [BMAD GitHub Repository](https://github.com/bmad-code-org/BMAD-METHOD.git)
- [BMAD Documentation](https://bmadcodes.com/user-guide/)

