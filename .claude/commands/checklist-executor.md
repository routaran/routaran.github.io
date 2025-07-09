# Checklist Executor

## Description

Executes a specified phase of the development checklist using a coordinated multi-agent approach with proper branch management and validation.

## Usage

`/checklist-executor <phase_number|phase_name> [--dry-run] [--verbose]`

## Parameters

- `phase_number|phase_name`: (Required) The phase number (e.g., 1, 2, 3) or exact phase name from the development checklist
- `--dry-run`: (Optional) Plan execution without making actual changes
- `--verbose`: (Optional) Provide detailed logging during execution

## Execution Process

### 1. Initialization

The master agent will:

- Validate the specified phase exists in the development checklist
- Generate a structured execution plan in `./temp/phase-<number>-plan.md`
- Identify dependencies between sections and create a directed acyclic graph (DAG)
- Determine which sections can be executed in parallel

### 2. Branch Management

For each section in the phase:

- Create a branch named `phase/<phase-number>/<section-name-kebab-case>`
- Track branch status in the execution plan

### 3. Task Distribution

The master agent will:

- Assign sections to subagents based on the dependency graph
- Provide each subagent with specific acceptance criteria from the checklist
- Monitor progress and update the execution plan with status (Not Started, In Progress, Review, Complete)

### 4. Validation Process

When a subagent completes work:

1. The master agent validates against:
    - Checklist requirements
    - Project specifications
    - Code quality standards
    - Test coverage requirements
2. If validation fails:
    - Provide specific feedback to the subagent
    - Request targeted changes
    - After 3 failed attempts, escalate to human with detailed context

### 5. Integration

For each validated section:

- Merge the branch into main using `--no-ff` to preserve history
- Update the checklist with completion status
- Generate section-specific documentation if required

### 6. Completion

When all sections are complete:

- Generate a phase completion report in `./docs/phases/phase-<number>-summary.md`
- Calculate and report metrics (time to completion, issues encountered, etc.)
- Clean up temporary documentation
- Update the main development checklist with completion percentages
- Provide recommendations for the next phase

## Example

/checklist-executor 2

Executes Phase 2 of the development checklist, creating branches for each section, distributing work to subagents, validating completed work, and merging validated sections back to main.

## Notes

- Ensure your development checklist is up-to-date before execution
- Each section should have clear acceptance criteria for validation
- The master agent will request human intervention if critical decisions are needed
- Progress is visible in real-time through the execution plan document
