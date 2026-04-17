// The agent that runs in a single Daytona sandbox.
// Spawns sandbox, clones repo, runs Claude, applies changes,
// starts dev-server, generates Live-Preview URL. KEEPS SANDBOX ALIVE.

import { Daytona, CreateSandboxFromSnapshotParams } from '@daytonaio/sdk'
import Anthropic from '@anthropic-ai/sdk'
import { Persona } from './personas'
import { AgentState, AgentStatus, Party } from './types'
import { partyStore } from './store'

const anthropic = new Anthropic()
const daytona = new Daytona()

// How long to keep the sandbox alive after success (for live preview).
// User has this long to inspect & pick. Then auto-stops.
const PREVIEW_LIFETIME_MINUTES = 15

export async function runAgent(
  party: Party,
  persona: Persona,
): Promise<void> {
  const emit = (state: Partial<AgentState>) => {
    partyStore.emit(party.id, {
      type: 'agent_update',
      persona: persona.id,
      state,
    })
    partyStore.update(party.id, (p) => ({
      ...p,
      agents: {
        ...p.agents,
        [persona.id]: { ...p.agents[persona.id], ...state },
      },
    }))
  }

  const setStatus = (status: AgentStatus, message: string) => {
    emit({ status, message })
  }

  let sandbox
  let success = false

  try {
    // 1. Spin up PUBLIC sandbox (so preview URLs work in iframes without auth)
    setStatus('initializing', 'Spinning up sandbox...')
    sandbox = await daytona.create(
      new CreateSandboxFromSnapshotParams({
        language: 'typescript',
        public: true,
        autoStopInterval: PREVIEW_LIFETIME_MINUTES,
      }),
    )

    // 2. Clone the repo (shallow for speed)
    setStatus('cloning', `Cloning ${party.repoOwner}/${party.repoName}...`)
    await sandbox.process.exec(
      `cd /home/daytona && git clone --depth 1 https://github.com/${party.repoOwner}/${party.repoName}.git repo`,
    )

    // 3. Read codebase context for Claude
    setStatus('reading', 'Reading codebase...')
    const fileList = await sandbox.process.exec(
      `cd /home/daytona/repo && find . -type f \\( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.css" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" | head -25`,
    )
    const filesForContext = fileList.result?.split('\n').filter(Boolean) ?? []

    const contextFiles: string[] = []
    for (const f of filesForContext.slice(0, 12)) {
      try {
        const content = await sandbox.fs.downloadFile(
          `/home/daytona/repo/${f.replace('./', '')}`,
        )
        const text = content.toString('utf-8').slice(0, 2500)
        contextFiles.push(`--- ${f} ---\n${text}`)
      } catch {
        // skip unreadable files
      }
    }

    // 4. Generate code with Claude using persona prompt
    setStatus('generating', `${persona.name} is thinking...`)
    const userPrompt = buildUserPrompt(party, contextFiles)

    const startGen = Date.now()
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      system: persona.systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // 5. Apply code changes to sandbox filesystem
    setStatus('writing', 'Applying changes...')
    const fileChanges = parseClaudeResponse(textContent.text, persona.id)

    let linesAdded = 0
    for (const change of fileChanges) {
      const fullPath = `/home/daytona/repo/${change.path}`
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      await sandbox.process.exec(`mkdir -p ${parentDir}`)
      await sandbox.fs.uploadFile(Buffer.from(change.content), fullPath)
      linesAdded += change.content.split('\n').length
    }

    // 6. Install deps + start dev server (THE LOVABLE MOMENT)
    setStatus('testing', 'Installing dependencies...')
    const installResult = await sandbox.process.exec(
      'cd /home/daytona/repo && npm install --no-audit --no-fund --prefer-offline',
      undefined,
      300_000, // 5 min timeout
    )

    if (installResult.exitCode !== 0) {
      console.error(`[${persona.id}] npm install failed:`, installResult.result)
      // Continue — preview won't work but PR data still useful
    }

    setStatus('committing', 'Starting dev server...')
    // Start dev server detached
    await sandbox.process.exec(
      'cd /home/daytona/repo && nohup npm run dev > /tmp/dev.log 2>&1 &',
    )

    // Wait for dev-server to bind to port 3000
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // 7. Get the Live Preview URL — THE MAGIC
    let previewUrl: string | undefined
    try {
      const preview = await sandbox.getPreviewLink(3000)
      previewUrl = preview.url
      console.log(`[${persona.id}] Preview live at:`, previewUrl)
    } catch (e) {
      console.error(`[${persona.id}] Could not get preview URL:`, e)
    }

    // 8. Branch + commit (for the eventual PR creation)
    const branchName = `patchparty/${persona.id}/${party.id.slice(0, 8)}`
    await sandbox.process.exec(
      `cd /home/daytona/repo && git config user.email "bot@patchparty.dev" && git config user.name "PatchParty ${persona.name}" && git checkout -b ${branchName} && git add -A && git commit -m "feat: ${party.issueTitle.replace(/"/g, "'")} (via PatchParty: ${persona.name})" --allow-empty`,
    )

    // Generate human-friendly summary using cheaper Haiku
    const summary = await generateSummary(persona, fileChanges, party.issueTitle)

    success = true

    emit({
      status: 'done',
      message: previewUrl ? `${persona.name} is live.` : `${persona.name} done.`,
      finishedAt: Date.now(),
      stats: {
        linesAdded,
        linesRemoved: 0,
        filesChanged: fileChanges.length,
        durationMs: Date.now() - startGen,
      },
      result: {
        files: fileChanges,
        branchName,
        summary,
        previewUrl,
        sandboxId: sandbox.id,
      },
    })
  } catch (err) {
    console.error(`[${persona.id}] Error:`, err)
    emit({
      status: 'error',
      message: 'Something went wrong.',
      error: err instanceof Error ? err.message : String(err),
    })
  } finally {
    // CRITICAL: only delete sandbox on FAILURE.
    // On success: keep alive so the user can see the preview.
    // autoStopInterval (15 min) cleans up automatically.
    if (sandbox && !success) {
      try {
        await daytona.delete(sandbox)
      } catch (e) {
        console.error('Cleanup failed:', e)
      }
    }
  }
}

function buildUserPrompt(party: Party, contextFiles: string[]): string {
  return `# GitHub Issue to Implement

**Title:** ${party.issueTitle}

**Description:**
${party.issueBody}

---

# Codebase Context (selected files)

${contextFiles.join('\n\n')}

---

# Your Task

Implement this issue according to your philosophy. Return ONLY a JSON response in the format specified in your system prompt — no markdown fences, no explanation outside the JSON.

CRITICAL: After your changes, the dev server (npm run dev) will be started automatically and shown to the user as a LIVE PREVIEW. Make sure your code COMPILES and the dev server boots without errors. Don't introduce missing dependencies — use only what's already in package.json.`
}

function parseClaudeResponse(
  text: string,
  personaId: string,
): Array<{ path: string; action: 'create' | 'modify'; content: string }> {
  let cleaned = text.trim()
  // Strip ``` fences if Claude added them despite instructions
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

  try {
    const parsed = JSON.parse(cleaned)
    if (personaId === 'innovator' && parsed.base) {
      return parsed.base
    }
    if (Array.isArray(parsed)) {
      return parsed
    }
    throw new Error('Unexpected response shape')
  } catch (e) {
    // Last-resort: extract first JSON block from anywhere in response
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) return parsed
        if (parsed.base) return parsed.base
      } catch {}
    }
    throw new Error(`Could not parse Claude response: ${e}`)
  }
}

async function generateSummary(
  persona: Persona,
  files: Array<{ path: string; action: string; content: string }>,
  issueTitle: string,
): Promise<string> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `${persona.name} (${persona.tagline}) implemented "${issueTitle}" by changing ${files.length} file(s): ${files.map((f) => f.path).join(', ')}. In 2 sentences, explain what this implementation prioritizes and what tradeoffs it makes. Match the persona's philosophy.`,
        },
      ],
    })
    const text = resp.content.find((c) => c.type === 'text')
    return text && text.type === 'text' ? text.text : 'Implementation complete.'
  } catch {
    return `${persona.name} implementation: ${files.length} files changed.`
  }
}
