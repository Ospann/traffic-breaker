import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { zipSync, type Zippable } from 'fflate';
import { build } from 'vite';

const PLATFORMS = ['bridge', 'mock'] as const;
type PlatformKind = (typeof PLATFORMS)[number];

const SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
const REQUIRED_FILES: Record<PlatformKind, string[]> = {
  bridge: ['index.html', 'playgama-bridge.js', 'playgama-bridge-config.json'],
  mock: ['index.html'],
};

const root = resolve(import.meta.dirname, '..');
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');

function isPlatform(value: string): value is PlatformKind {
  return (PLATFORMS as readonly string[]).includes(value);
}

function resolvePlatform(): PlatformKind {
  const { values } = parseArgs({ options: { platform: { type: 'string' } }, strict: true });
  const value = values.platform ?? process.env.VITE_PLATFORM ?? 'bridge';
  if (!isPlatform(value)) {
    throw new Error(`Unknown platform "${value}". Expected one of: ${PLATFORMS.join(', ')}`);
  }
  return value;
}

function collectFiles(dir: string, files: Zippable = {}): Zippable {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectFiles(fullPath, files);
    } else {
      files[relative(distDir, fullPath).split(sep).join('/')] = readFileSync(fullPath);
    }
  }
  return files;
}

interface PackageInfo {
  name: string;
  version: string;
}

function readPackageInfo(): PackageInfo {
  const parsed: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'name' in parsed &&
    'version' in parsed &&
    typeof parsed.name === 'string' &&
    typeof parsed.version === 'string'
  ) {
    return { name: parsed.name, version: parsed.version };
  }
  throw new Error('package.json must have string "name" and "version" fields');
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main(): Promise<void> {
  const platform = resolvePlatform();
  const pkg = readPackageInfo();

  process.env.VITE_PLATFORM = platform;
  rmSync(distDir, { recursive: true, force: true });
  await build({ root, mode: 'production', logLevel: 'warn' });

  const files = collectFiles(distDir);
  const missing = REQUIRED_FILES[platform].filter((name) => !(name in files));
  if (missing.length > 0) {
    throw new Error(`Build is missing required files: ${missing.join(', ')}`);
  }

  const suffix = platform === 'bridge' ? '' : `-${platform}`;
  const zipName = `${pkg.name}-${pkg.version}${suffix}.zip`;
  const zipPath = join(releaseDir, zipName);
  const archive = zipSync(files, { level: 9 });

  mkdirSync(releaseDir, { recursive: true });
  writeFileSync(zipPath, archive);

  console.log(`Platform: ${platform}`);
  console.log(`Files:    ${Object.keys(files).length}`);
  console.log(`Archive:  ${relative(root, zipPath)} (${formatSize(archive.byteLength)})`);
  if (platform === 'bridge') {
    const bridgeSize = statSync(join(distDir, 'playgama-bridge.js')).size;
    console.log(`Bridge:   playgama-bridge.js (${formatSize(bridgeSize)})`);
  }

  if (archive.byteLength > SIZE_LIMIT_BYTES) {
    console.warn(
      `WARNING: archive is larger than ${formatSize(SIZE_LIMIT_BYTES)}; some portals reject builds this big.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
