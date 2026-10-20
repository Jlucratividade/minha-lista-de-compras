/** Remove acentos e converte para minúsculas, preservando o restante do texto. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Primeira letra maiúscula, restante preservado. */
export function capitalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('pt-BR') + trimmed.slice(1);
}

/** Remove espaços extras e quebras de linha. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Chave usada para detectar duplicações acidentais (sem acentos e sem diferença de maiúsculas). */
export function duplicateKey(name: string): string {
  return collapseSpaces(normalizeText(name));
}
