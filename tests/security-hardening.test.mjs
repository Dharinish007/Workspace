import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isSafeUrl } from '../src/components/notes/MarkdownRenderer.tsx';
import { generateUUID } from '../src/db/indexedDB.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

test('Phase 1 Security Hardening: Content-Security-Policy in index.html', async (t) => {
  await t.test('index.html contains strict CSP meta tag', () => {
    const htmlPath = path.join(ROOT, 'index.html');
    assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.match(html, /<meta\s+http-equiv=["']Content-Security-Policy["']/i, 'CSP meta tag must be present');
    assert.match(html, /default-src\s+'self'/, 'CSP must declare default-src self');
    assert.match(html, /frame-src\s+'none'/, 'CSP must disallow iframe embedding');
    assert.match(html, /object-src\s+'none'/, 'CSP must disallow object / applet execution');
    assert.match(html, /base-uri\s+'self'/, 'CSP must protect base-uri');
    assert.match(html, /connect-src[^>]*https:\/\/\*\.supabase\.co/, 'CSP must permit supabase connections');
  });
});

test('Phase 1 Security Hardening: Outbound Link URL Sanitizer', async (t) => {
  await t.test('Rejects dangerous JavaScript protocol variants', () => {
    assert.equal(isSafeUrl('javascript:alert(1)'), false);
    assert.equal(isSafeUrl('JAVASCRIPT:alert(1)'), false);
    assert.equal(isSafeUrl('JaVaScRiPt:alert(document.cookie)'), false);
    assert.equal(isSafeUrl('  javascript:alert(1)'), false);
    assert.equal(isSafeUrl('javascript:/*--></title></style>alert(1)'), false);
  });

  await t.test('Rejects VBScript and Data URI execution vectors', () => {
    assert.equal(isSafeUrl('vbscript:msgbox(1)'), false);
    assert.equal(isSafeUrl('VBSCRIPT:msgbox(1)'), false);
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.equal(isSafeUrl('DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
  });

  await t.test('Rejects control characters and unauthorized schemes', () => {
    assert.equal(isSafeUrl('java\u0000script:alert(1)'), false);
    assert.equal(isSafeUrl('file:///C:/Windows/System32'), false);
    assert.equal(isSafeUrl('ftp://example.com/payload'), false);
    assert.equal(isSafeUrl(''), false);
    assert.equal(isSafeUrl(null), false);
    assert.equal(isSafeUrl(undefined), false);
  });

  await t.test('Permits valid HTTP, HTTPS, mailto, and relative internal links', () => {
    assert.equal(isSafeUrl('https://example.com'), true);
    assert.equal(isSafeUrl('https://sub.domain.org/path?param=1#frag'), true);
    assert.equal(isSafeUrl('http://localhost:5173/notes'), true);
    assert.equal(isSafeUrl('mailto:contact@workspace.app'), true);
    assert.equal(isSafeUrl('/tasks'), true);
    assert.equal(isSafeUrl('./settings'), true);
    assert.equal(isSafeUrl('#top'), true);
  });
});

test('Phase 1 Security Hardening: Cryptographic RFC4122 v4 UUID Generator', async (t) => {
  await t.test('Generates conforming RFC4122 v4 UUID format', () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < 50; i++) {
      const id = generateUUID();
      assert.match(id, uuidPattern, `Generated ID "${id}" must conform to RFC4122 v4 format`);
    }
  });

  await t.test('Ensures high entropy with zero collision across 1,000 generations', () => {
    const set = new Set();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      const id = generateUUID();
      assert.equal(set.has(id), false, `Collision detected on generation ${i}: ${id}`);
      set.add(id);
    }
    assert.equal(set.size, count);
  });
});

test('Phase 1 Security Hardening: Credential Leakage & Git Hygiene', async (t) => {
  await t.test('.gitignore strictly excludes local environment and credential files', () => {
    const gitignorePath = path.join(ROOT, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath));
    const content = fs.readFileSync(gitignorePath, 'utf8');

    assert.match(content, /^\.env$/m, '.gitignore must include .env');
    assert.match(content, /^\.env\.local$/m, '.gitignore must include .env.local');
  });

  await t.test('.env.example contains only non-secret placeholders', () => {
    const examplePath = path.join(ROOT, '.env.example');
    assert.ok(fs.existsSync(examplePath));
    const content = fs.readFileSync(examplePath, 'utf8');

    // Must not contain real project urls or live supabase anon keys (starts with eyJ)
    assert.doesNotMatch(content, /https:\/\/[a-z0-9]+\.supabase\.co/);
    assert.doesNotMatch(content, /eyJ[a-zA-Z0-9_-]+/);
  });
});
