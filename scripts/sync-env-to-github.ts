#!/usr/bin/env tsx
/**
 * Sync an env file to GitHub repo/environment variables & secrets.
 *
 * Default: .env.production -> production environment.
 *
 * Secrets are determined heuristically (keys containing SECRET/TOKEN/KEY/PASSWORD/PRIVATE/CERT/DSN and
 * not prefixed with PUBLIC_/VITE_/NEXT_PUBLIC_/REACT_APP_). Everything else is treated as a variable.
 * Prefix REPO_ to force repo scope (e.g., REPO_SOME_FLAG=true). Prefix ENV_ to force env scope.
 */
import { Octokit } from '@octokit/rest'
import { execSync } from 'child_process'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { parse } from 'dotenv'

type Scope = 'repo' | 'env'
type Kind = 'var' | 'secret'

interface ParsedEnv {
  envVars: Record<string, string>
  envSecrets: Record<string, string>
  repoVars: Record<string, string>
  repoSecrets: Record<string, string>
}

const SECRET_HINTS = ['SECRET', 'TOKEN', 'KEY', 'PASSWORD', 'PRIVATE', 'CERT', 'DSN']
const PUBLIC_PREFIXES = ['PUBLIC_', 'VITE_', 'NEXT_PUBLIC_', 'REACT_APP_']

const log = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  section: (msg: string) => console.log(`\n${msg}`),
}

const isPublicKey = (key: string) => PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix))
const isSecretKey = (key: string) =>
  SECRET_HINTS.some((hint) => key.toUpperCase().includes(hint)) && !isPublicKey(key)

const classify = (rawKey: string): { scope: Scope; kind: Kind; key: string } => {
  let scope: Scope = 'env'
  let key = rawKey

  if (rawKey.startsWith('REPO_')) {
    scope = 'repo'
    key = rawKey.replace(/^REPO_/, '')
  } else if (rawKey.startsWith('ENV_')) {
    scope = 'env'
    key = rawKey.replace(/^ENV_/, '')
  }

  const kind: Kind = isSecretKey(key) ? 'secret' : 'var'
  return { scope, kind, key }
}

const parseEnvFile = (filePath: string): ParsedEnv => {
  const content = readFileSync(filePath, 'utf-8')
  const parsed = parse(content)

  const result: ParsedEnv = { envVars: {}, envSecrets: {}, repoVars: {}, repoSecrets: {} }

  for (const [rawKey, value] of Object.entries(parsed)) {
    if (!rawKey || value === undefined) continue
    const { scope, kind, key } = classify(rawKey.trim())
    if (scope === 'env' && kind === 'var') result.envVars[key] = value
    if (scope === 'env' && kind === 'secret') result.envSecrets[key] = value
    if (scope === 'repo' && kind === 'var') result.repoVars[key] = value
    if (scope === 'repo' && kind === 'secret') result.repoSecrets[key] = value
  }

  return result
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.svelte-kit', 'coverage'])

const discoverEnvProductionFiles = (root: string): string[] => {
  const found: string[] = []
  const walk = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(full)
        }
      } else if (entry.isFile() && entry.name === '.env.production') {
        found.push(full)
      }
    }
  }
  walk(root)
  return found
}

const loadEnvFiles = (paths: string[]): { merged: ParsedEnv; files: string[] } => {
  const merged: ParsedEnv = { envVars: {}, envSecrets: {}, repoVars: {}, repoSecrets: {} }
  const files: string[] = []

  for (const rawPath of paths) {
    const filePath = resolve(process.cwd(), rawPath)
    try {
      const stats = statSync(filePath)
      if (stats.isDirectory()) {
        const candidate = join(filePath, '.env.production')
        statSync(candidate) // throws if missing
        files.push(candidate)
      } else {
        files.push(filePath)
      }
    } catch (error) {
      log.warn(`Skipping ${rawPath}: ${(error as Error).message}`)
    }
  }

  if (files.length === 0) {
    const discovered = discoverEnvProductionFiles(process.cwd())
    files.push(...discovered)
  }

  for (const file of files) {
    const parsed = parseEnvFile(file)
    Object.assign(merged.envVars, parsed.envVars)
    Object.assign(merged.envSecrets, parsed.envSecrets)
    Object.assign(merged.repoVars, parsed.repoVars)
    Object.assign(merged.repoSecrets, parsed.repoSecrets)
  }

  return { merged, files }
}

const resolveOwnerRepo = (): { owner: string; repo: string } => {
  const envRepo = process.env.GITHUB_REPOSITORY
  if (envRepo && envRepo.includes('/')) {
    const [owner, repo] = envRepo.split('/')
    return { owner, repo }
  }

  const envOwner = process.env.GH_OWNER
  const envRepoName = process.env.GH_REPO
  if (envOwner && envRepoName) return { owner: envOwner, repo: envRepoName }

  try {
    const origin = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim()
    if (origin) {
      // supports git@github.com:owner/repo.git or https://github.com/owner/repo.git
      const match = origin.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
      if (match) {
        return { owner: match[1], repo: match[2] }
      }
    }
  } catch {
    // ignore
  }

  return { owner: '', repo: '' }
}

const encryptSecret = async (publicKey: string, secretValue: string): Promise<string> => {
  const sodiumModule = await import('libsodium-wrappers')
  const sodium = 'default' in sodiumModule ? sodiumModule.default : sodiumModule
  await sodium.ready
  const binkey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL)
  const binsec = sodium.from_string(secretValue)
  const encBytes = sodium.crypto_box_seal(binsec, binkey)
  return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL)
}

const ensureEnvironment = async (octokit: Octokit, owner: string, repo: string, environment: string) => {
  try {
    await octokit.rest.repos.getEnvironment({ owner, repo, environment_name: environment })
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      log.info(`Creating environment '${environment}'...`)
      await octokit.rest.repos.createOrUpdateEnvironment({ owner, repo, environment_name: environment })
      log.info(`Created environment '${environment}'`)
    } else {
      throw error
    }
  }
}

const clearRepoVariables = async (octokit: Octokit, owner: string, repo: string) => {
  const { data } = await octokit.rest.actions.listRepoVariables({ owner, repo })
  for (const variable of data.variables) {
    await octokit.rest.actions.deleteRepoVariable({ owner, repo, name: variable.name })
  }
}

const clearRepoSecrets = async (octokit: Octokit, owner: string, repo: string) => {
  const { data } = await octokit.rest.actions.listRepoSecrets({ owner, repo })
  for (const secret of data.secrets) {
    await octokit.rest.actions.deleteRepoSecret({ owner, repo, secret_name: secret.name })
  }
}

const clearEnvVariables = async (octokit: Octokit, owner: string, repo: string, environment: string) => {
  const { data } = await octokit.rest.actions.listEnvironmentVariables({
    owner,
    repo,
    environment_name: environment,
  })
  for (const variable of data.variables) {
    await octokit.rest.actions.deleteEnvironmentVariable({
      owner,
      repo,
      environment_name: environment,
      name: variable.name,
    })
  }
}

const clearEnvSecrets = async (octokit: Octokit, owner: string, repo: string, environment: string) => {
  const { data } = await octokit.rest.actions.listEnvironmentSecrets({
    owner,
    repo,
    environment_name: environment,
  })
  for (const secret of data.secrets) {
    await octokit.rest.actions.deleteEnvironmentSecret({
      owner,
      repo,
      environment_name: environment,
      secret_name: secret.name,
    })
  }
}

const syncRepoVariables = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  variables: Record<string, string>,
  prune: boolean
) => {
  log.section('📦 Syncing repository variables')
  if (prune) await clearRepoVariables(octokit, owner, repo)
  for (const [name, value] of Object.entries(variables)) {
    await octokit.rest.actions.createRepoVariable({ owner, repo, name, value })
    log.info(`Set repo variable: ${name}`)
  }
}

const syncRepoSecrets = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  secrets: Record<string, string>,
  prune: boolean
) => {
  log.section('🔐 Syncing repository secrets')
  if (prune) await clearRepoSecrets(octokit, owner, repo)
  const publicKey = await octokit.rest.actions.getRepoPublicKey({ owner, repo })
  for (const [name, value] of Object.entries(secrets)) {
    const encrypted_value = await encryptSecret(publicKey.data.key, value)
    await octokit.rest.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: name,
      encrypted_value,
      key_id: publicKey.data.key_id,
    })
    log.info(`Set repo secret: ${name}`)
  }
}

const syncEnvVariables = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  environment: string,
  variables: Record<string, string>,
  prune: boolean
) => {
  log.section(`🌍 Syncing environment variables (${environment})`)
  await ensureEnvironment(octokit, owner, repo, environment)
  if (prune) await clearEnvVariables(octokit, owner, repo, environment)
  for (const [name, value] of Object.entries(variables)) {
    await octokit.rest.actions.createEnvironmentVariable({
      owner,
      repo,
      environment_name: environment,
      name,
      value,
    })
    log.info(`Set env variable: ${name}`)
  }
}

const syncEnvSecrets = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  environment: string,
  secrets: Record<string, string>,
  prune: boolean
) => {
  log.section(`🔒 Syncing environment secrets (${environment})`)
  await ensureEnvironment(octokit, owner, repo, environment)
  if (prune) await clearEnvSecrets(octokit, owner, repo, environment)
  const publicKey = await octokit.rest.actions.getEnvironmentPublicKey({
    owner,
    repo,
    environment_name: environment,
  })
  for (const [name, value] of Object.entries(secrets)) {
    const encrypted_value = await encryptSecret(publicKey.data.key, value)
    await octokit.rest.actions.createOrUpdateEnvironmentSecret({
      owner,
      repo,
      environment_name: environment,
      secret_name: name,
      encrypted_value,
      key_id: publicKey.data.key_id,
    })
    log.info(`Set env secret: ${name}`)
  }
}

const main = async () => {
  const args = process.argv.slice(2)
  const envArg = args.find((a) => a.startsWith('--env='))?.split('=')[1]
  const environment = args.find((a) => a.startsWith('--environment='))?.split('=')[1] ?? 'production'
  const pruneArg = args.find((a) => a.startsWith('--prune='))
  const prune = pruneArg ? pruneArg.split('=')[1] !== 'false' : true

  const envPaths = envArg ? envArg.split(',').map((p) => p.trim()).filter(Boolean) : []
  const { merged: parsed, files } = loadEnvFiles(envPaths)

  if (files.length === 0) {
    log.error('No .env.production files found. Provide --env=path or add .env.production files.')
    process.exit(1)
  }

  log.section(`Parsed env files (${files.length})`)
  files.forEach((f) => log.info(`- ${f}`))
  log.info(`Env vars: ${Object.keys(parsed.envVars).length}`)
  log.info(`Env secrets: ${Object.keys(parsed.envSecrets).length}`)
  log.info(`Repo vars: ${Object.keys(parsed.repoVars).length}`)
  log.info(`Repo secrets: ${Object.keys(parsed.repoSecrets).length}`)

  const { owner, repo } = resolveOwnerRepo()
  if (!owner || !repo) {
    log.error('Unable to determine repository (set GH_OWNER and GH_REPO or GITHUB_REPOSITORY).')
    process.exit(1)
  }

  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? ''
  if (!token) {
    log.error('Missing GitHub token. Set GH_TOKEN or GITHUB_TOKEN.')
    process.exit(1)
  }

  const octokit = new Octokit({ auth: token })

  await syncRepoVariables(octokit, owner, repo, parsed.repoVars, prune)
  await syncRepoSecrets(octokit, owner, repo, parsed.repoSecrets, prune)
  await syncEnvVariables(octokit, owner, repo, environment, parsed.envVars, prune)
  await syncEnvSecrets(octokit, owner, repo, environment, parsed.envSecrets, prune)

  log.section('✅ Sync complete')
}

main().catch((error) => {
  log.error(`Sync failed: ${(error as Error).message}`)
  process.exit(1)
})
