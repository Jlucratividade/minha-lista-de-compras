// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { build } from 'vite';

const root = join(__dirname, '..');
const outDir = join(root, 'node_modules', '.cache', 'build-test');

/**
 * Gera o build de produção com a base de um repositório no GitHub Pages
 * (https://usuario.github.io/meu-repo/) e confere se nenhum caminho aponta para a raiz do domínio.
 */
describe('build de produção em subdiretório do GitHub Pages', () => {
  const base = '/meu-repo/';

  it('usa caminhos corretos para scripts, CSS, manifest, ícones e service worker', async () => {
    process.env.VITE_BASE = base;
    try {
      await build({
        root,
        configFile: join(root, 'vite.config.ts'),
        logLevel: 'silent',
        build: { outDir, emptyOutDir: true },
      });
    } finally {
      delete process.env.VITE_BASE;
    }

    const html = readFileSync(join(outDir, 'index.html'), 'utf8');
    const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    const localRefs = assetRefs.filter((ref) => !/^(https?:|data:|#)/.test(ref));

    expect(localRefs.length).toBeGreaterThan(0);
    for (const ref of localRefs) {
      expect(ref.startsWith(base), `Caminho fora do subdiretório: ${ref}`).toBe(true);
    }
    expect(html).toMatch(new RegExp(`src="${base}assets/index-[^"]+\\.js"`));
    expect(html).toMatch(new RegExp(`href="${base}assets/index-[^"]+\\.css"`));
    expect(html).toContain(`href="${base}manifest.webmanifest"`);

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.webmanifest'), 'utf8'));
    expect(manifest.name).toBe('Minha Lista de Compras');
    expect(manifest.short_name).toBe('Minhas Compras');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe(base);
    expect(manifest.scope).toBe(base);
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(join(outDir, icon.src)), `Ícone ausente: ${icon.src}`).toBe(true);
    }

    expect(existsSync(join(outDir, 'sw.js'))).toBe(true);
    const sw = readFileSync(join(outDir, 'sw.js'), 'utf8');
    expect(sw).toContain(`${base}index.html`);
    expect(sw).not.toMatch(/url:\s*"\/(?!meu-repo)/);

    const registerChunk = html.includes('registerSW') ? html : '';
    expect(registerChunk).toBeDefined();
  }, 60_000);
});
