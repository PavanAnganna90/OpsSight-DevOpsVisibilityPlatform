# How to Use BMAD Agents in Cursor

## Quick Start

### Step 1: Install BMAD

Run this command in your terminal:

```bash
npx bmad-method@alpha install
```

**Follow the prompts:**
1. Installation directory: Press `Enter` (uses current directory)
2. Confirm: Type `Y` and press `Enter`
3. Select modules: Choose BMM (BMAD Method Manager) for evaluation
4. IDE: Select Cursor

### Step 2: Load BMAD Agents in Cursor

Once installed, you can load agents directly in Cursor chat:

```
@pm        # Project Manager agent
@architect # Architect agent
@dev       # Developer agent
```

### Step 3: Run Evaluation Workflows

After loading an agent, use these commands:

```
*workflow-init          # Initialize workflow
@pm *evaluate           # Project evaluation
@architect *analyze     # Architecture analysis
@dev *review            # Code review
```

## Alternative: Direct Slash Commands

You can also use slash commands directly:

```
/bmad:bmm:workflows:workflow-init
/bmad:bmm:workflows:prd
/bmad:bmm:workflows:dev-story
```

## BMAD Agents Available

- **@pm** - Project Manager: Planning, task management, workflows
- **@architect** - Architect: Architecture review, design decisions
- **@dev** - Developer: Code quality, best practices, implementation
- **@qa** - Quality Assurance: Testing strategies, quality metrics
- **@ops** - Operations: Deployment, infrastructure, monitoring

## Reference

- [BMAD GitHub Repository](https://github.com/bmad-code-org/BMAD-METHOD.git)
- [BMAD Documentation](https://bmadcodes.com/user-guide/)

---

**Note:** BMAD requires interactive installation. Run `npx bmad-method@alpha install` in your terminal to complete the setup.

