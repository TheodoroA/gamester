import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../db/sqlite.js';
import { CatalogRepository, NewSongInput } from '../db/repositories/catalogRepository.js';

export function seedCatalog(seedPath?: string): number {
  const db = getDatabase();
  const repo = new CatalogRepository(db);

  const candidatePaths = [
    seedPath,
    path.resolve(process.cwd(), 'docs', 'songs-seed-template.json'),
    path.resolve(process.cwd(), '..', 'docs', 'songs-seed-template.json'),
    path.resolve(process.cwd(), 'songs-seed-template.json'),
    path.resolve(__dirname, '..', '..', '..', 'docs', 'songs-seed-template.json')
  ].filter(Boolean) as string[];

  const resolvedPath = candidatePaths.find(p => fs.existsSync(p));

  if (!resolvedPath) {
    console.warn('Arquivo de seed não encontrado nas localizações padrão.');
    return 0;
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const songs: NewSongInput[] = JSON.parse(raw);

  const currentCount = repo.count();
  if (currentCount > 0) {
    console.log(`Catálogo já contém ${currentCount} músicas. Pulando seed automático.`);
    return currentCount;
  }

  const result = repo.importBatch(songs);
  console.log(`Seed executado com sucesso: ${result.inserted} músicas importadas.`);
  return result.inserted;
}

// Execução direta via CLI se chamado como script
if (process.argv[1]?.endsWith('seedCatalog.ts') || process.argv[1]?.endsWith('seedCatalog.js')) {
  try {
    seedCatalog();
  } finally {
    closeDatabase();
  }
}
