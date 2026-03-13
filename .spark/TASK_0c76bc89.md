# CURSOR AI: START TASK IMMEDIATELY

You are now working on this task. Begin implementation immediately without waiting for user input.

---

# Task: Add Export tools

**Status:** to_do
**Priority:** medium
**Feature Area:** General
**Task ID:** 0c76bc89-1726-4b91-88e1-9e6c8e67fc92
**Project:** Invoice Monitor

## Description

Add the ability export reports on a monthly/annual basis. Use AskUserQuestion to interview me on what I want the export workflow to look like.

## Tech Stack
{
  "ai": "Anthropic Claude API",
  "auth": "NextAuth.js",
  "email": "Microsoft Graph API (Outlook)",
  "styling": "Tailwind CSS",
  "database": "Neon Serverless Postgres (Prisma ORM)",
  "language": "TypeScript",
  "framework": "Next.js 14",
  "workspace": "GDC",
  "deployment": "Vercel"
}


---

## Your Instructions

**START WORKING NOW.** Complete this task by:

1. Reading relevant files from this codebase
2. Understanding the current implementation
3. Writing/updating code to complete the task
4. Testing your changes logically
5. **CRITICAL**: When done, call the spark_update_task MCP tool (see below)

**Important:** 
- This is a medium priority task
- Write production-quality code
- Follow the project's existing patterns
- Be thorough and test your logic

### Mark Task Complete

When you finish this task, **IMMEDIATELY call the spark_update_task MCP tool**:

```
spark_update_task task_id="0c76bc89-1726-4b91-88e1-9e6c8e67fc92" updates={"status": "done"}
```

This is an MCP tool call - execute it directly, don't just write it as a comment. This will update the task status in Spark's UI in real-time.

**BEGIN IMPLEMENTATION NOW.**
