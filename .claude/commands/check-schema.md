# Check-Schema: Align Source Files with Database Schema

Analyzes source files for database interactions and suggests updates to match the current schema.

## Current DB Schema

The existing schema in SQL format is located at: `/mnt/podman-dev/ci_projects/routaran.github.io/app/supabase/current_db_schema.sql`

## Usage

`/check-schema <path> [options]`

## Parameters

- `path`: (Required) Path to a source file or directory to check against the DB schema.
  - If a directory is provided, all relevant files will be checked.
  - You must stay with in the provided patha and not go outside of it.
  - Supported file types: .ts, .js, .jsx, .tsx, .sql

## Options

- `--dry-run`: Generate report without making changes
- `--no-git`: Skip Git operations
- `--verbose`: Show detailed analysis during processing

## Execution Process

### 1. Initialization

- The master agent will:
  - Validate the specified source path exists
  - Load the current DB schema from the schema file
  - Parse the schema to extract table definitions, columns, data types, and relationships
  - If the schema file doesn't exist or can't be parsed, prompt the user for an alternative
  - Identify all source files to be analyzed (recursively if a directory is provided)
  - Group files into batches for parallel processing

### 2. Source Analysis (Parallel Processing)

- The master agent will:
  - Create multiple sub-agents to process files in parallel
  - Distribute file batches among sub-agents
  - Provide each sub-agent with the parsed schema information
  - Coordinate the parallel execution and collect results

- Each sub-agent will:
  - Process its assigned batch of files
  - For each source file:
    - Read the file content
    - Parse the file to identify database interaction code:
      - SQL queries (string literals, template literals)
      - Table/column references in ORM models
      - Database function calls
      - API endpoint handlers that interact with the database
    - Extract database entities referenced (tables, columns, types, relationships)
    - If no database interactions are found, mark the file as "no interactions" in its report
  - Return analysis results to the master agent

- The master agent will:
  - Aggregate results from all sub-agents
  - Compile a comprehensive list of files with and without database interactions
  - Prepare the aggregated data for the comparison phase

### 3. Comparison & Recommendations

- For each file with database interactions:
  - Compare the extracted database references with the parsed schema
  - Identify discrepancies:
    - Missing or renamed tables
    - Missing, renamed, or type-mismatched columns
    - Incorrect relationships or constraints
  - Generate specific recommendations to align the code with the schema
  - Classify each recommendation by risk level (low, medium, high)
  - The recommendations MUST NOT change the business logic of the source file

### 4. Reporting

- Generate a comprehensive report including:
  - Summary of files analyzed
  - Files with no issues found
  - Files with discrepancies, grouped by severity
  - Specific recommendations for each file
  - Risk assessment for each recommendation

### 5. User Confirmation

- Present the report to the user
- If not in dry-run mode:
  - Ask for confirmation before applying changes
  - Allow selective application of changes (all, by file, or by specific recommendation)

### 6. Implementation

- If the user confirms:
  - Apply the approved changes to the source files
  - Format the updated files using Prettier
  - Notify the user of successful updates
  - If any changes couldn't be applied, explain why

### 7. Verification

- If test files exist for the modified sources:
  - Suggest running relevant tests to verify functionality
  - If the user agrees, execute the tests and report results
  - Flag any test failures for manual review

### 8. Git Integration (if --no-git is not specified)

- If Git is available:
  - Show a diff of the changes made
  - Ask if the user wants to commit the changes
  - If confirmed, commit with a descriptive message
  - Ask if the user wants to push the changes
  - If confirmed, push to the current branch

## Limitations

- Cannot reliably detect dynamically constructed SQL queries (e.g., string concatenation)
- Limited support for highly abstracted database access patterns
- May not identify all database interactions in complex code structures
- Cannot automatically fix issues that would require logic changes
- Does not handle database migrations or schema evolution

## Examples

### Check a single file

`/check-schema app/models/user.ts`

### Check all files in a directory with detailed output

`/check-schema app/src --verbose`

### Generate a report without making changes

`/check-schema app/api --dry-run`

### Check files without Git operations

`/check-schema app/components --no-git`

## Error Handling

- **Schema File Missing**: Prompt user to provide correct path
- **Schema Parse Error**: Show specific parsing errors and line numbers
- **Source File Access Error**: Report inaccessible files and continue with accessible ones
- **No Database Interactions**: Report files without detectable database interactions
- **Complex Pattern Detection**: Flag code patterns too complex for reliable analysis
- **Git Operation Failure**: Report Git errors and continue without Git integration

## Troubleshooting

- If the command fails to detect database interactions in your code:
  - Check if your database access is through a custom abstraction layer
  - Consider analyzing the abstraction layer files directly
  - Use more explicit database access patterns in critical code

- If recommendations seem incorrect:
  - Use `--verbose` to see the detailed analysis
  - Check if your schema file is up-to-date
  - Consider running in `--dry-run` mode and manually implementing changes
