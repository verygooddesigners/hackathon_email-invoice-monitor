<!-- spark-task-instructions -->
# Spark Task Instructions for Invoice Monitor

When you see .spark/TASK_*.md or .spark/TASKS.md files, these are active tasks from Spark.
Start working on them immediately without waiting for user confirmation.

## CRITICAL: Marking Tasks Complete

When you finish a task, you MUST call the MCP tool **mcp__spark__spark_update_task** to mark it done.
This is what moves the task card to the Done column in the Spark UI.

Call the tool with:
- task_id: the task ID from the task file
- updates: {"status": "done"}

Do NOT skip this step. The task is not complete until you call this MCP tool.
