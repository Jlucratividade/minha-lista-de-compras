import { describe, expect, it } from 'vitest';
import { parseQuantityField, parseShoppingCommand } from './index';
import { readNumber } from './numbers';

const names = (text: string) => parseShoppingCommand(text).items.map((i) => i.name);

describe('readNumber', () => {
  it('lê algarismos e decimais brasileiros', () => {
    expect(readNumber(['2'])).toEqual({ value: 2, consumed: 1 });
    expect(readNumber(['1,5'])).toEqual({ value: 1.5, consumed: 1 });
  });
  it('lê números por extenso compostos', () => {
    expect(readNumber(['vinte', 'e', 'cinco', 'bananas'])).toEqual({ value: 25, consumed: 3 });
    expect(readNumber(['cento', 'e', 'dez'])).toEqual({ value: 110, consumed: 3 });
    expect(readNumber(['três'])).toEqual({ value: 3, consumed: 1 });
  });
  it('retorna null para palavras que não são números', () => {
    expect(readNumber(['leite'])).toBeNull();
  });
});

describe('parseShoppingCommand', () => {
  it('interpreta “dois litros de leite”', () => {
    const result = parseShoppingCommand('dois litros de leite');
    expect(result.items).toEqual([{ name: 'Leite', quantity: 2, unit: 'litros' }]);
    expect(result.needsReview).toBe(false);
  });

  it('interpreta “uma dúzia de ovos”', () => {
    expect(parseShoppingCommand('uma dúzia de ovos').items).toEqual([
      { name: 'Ovos', quantity: 12, unit: 'unidades' },
    ]);
  });

  it('interpreta meia dúzia', () => {
    expect(parseShoppingCommand('meia dúzia de ovos').items).toEqual([
      { name: 'Ovos', quantity: 6, unit: 'unidades' },
    ]);
  });

  it('separa “arroz, feijão e açúcar”', () => {
    const result = parseShoppingCommand('arroz, feijão e açúcar');
    expect(result.items).toEqual([
      { name: 'Arroz', quantity: 1, unit: '' },
      { name: 'Feijão', quantity: 1, unit: '' },
      { name: 'Açúcar', quantity: 1, unit: '' },
    ]);
    expect(result.needsReview).toBe(false);
  });

  it('interpreta frase com quantidades e unidades diferentes', () => {
    const result = parseShoppingCommand('Dois litros de leite, um quilo de arroz e uma dúzia de ovos.');
    expect(result.items).toEqual([
      { name: 'Leite', quantity: 2, unit: 'litros' },
      { name: 'Arroz', quantity: 1, unit: 'kg' },
      { name: 'Ovos', quantity: 12, unit: 'unidades' },
    ]);
  });

  it('remove expressões de comando', () => {
    expect(parseShoppingCommand('Adicionar leite').items).toEqual([{ name: 'Leite', quantity: 1, unit: '' }]);
    expect(parseShoppingCommand('comprar um quilo de arroz').items).toEqual([
      { name: 'Arroz', quantity: 1, unit: 'kg' },
    ]);
    expect(parseShoppingCommand('colocar na lista pão').items).toEqual([{ name: 'Pão', quantity: 1, unit: '' }]);
    expect(names('adicionar café na lista')).toEqual(['Café']);
  });

  it('interpreta uma dúzia de ovos e dois pacotes de café', () => {
    expect(parseShoppingCommand('Adicionar uma dúzia de ovos e dois pacotes de café').items).toEqual([
      { name: 'Ovos', quantity: 12, unit: 'unidades' },
      { name: 'Café', quantity: 2, unit: 'pacotes' },
    ]);
  });

  it('interpreta “cinco bananas, um pão e três caixas de leite”', () => {
    expect(parseShoppingCommand('Cinco bananas, um pão e três caixas de leite').items).toEqual([
      { name: 'Bananas', quantity: 5, unit: '' },
      { name: 'Pão', quantity: 1, unit: '' },
      { name: 'Leite', quantity: 3, unit: 'caixas' },
    ]);
  });

  it('entende algarismos grudados na unidade e decimais', () => {
    expect(parseShoppingCommand('500g de queijo').items).toEqual([{ name: 'Queijo', quantity: 500, unit: 'g' }]);
    expect(parseShoppingCommand('1,5 kg de carne').items).toEqual([{ name: 'Carne', quantity: 1.5, unit: 'kg' }]);
  });

  it('entende “um quilo e meio” sem dividir no “e”', () => {
    expect(parseShoppingCommand('um quilo e meio de tomate').items).toEqual([
      { name: 'Tomate', quantity: 1.5, unit: 'kg' },
    ]);
  });

  it('não separa o “e” de números por extenso', () => {
    expect(parseShoppingCommand('vinte e cinco bananas').items).toEqual([
      { name: 'Bananas', quantity: 25, unit: '' },
    ]);
  });

  it('não confunde parte do nome do produto com quantidade', () => {
    expect(parseShoppingCommand('Leite Ninho').items).toEqual([{ name: 'Leite Ninho', quantity: 1, unit: '' }]);
    expect(parseShoppingCommand('suco de uva').items).toEqual([{ name: 'Suco de uva', quantity: 1, unit: '' }]);
    expect(parseShoppingCommand('pão de forma').items[0].name).toBe('Pão de forma');
  });

  it('pede revisão quando falta o nome do produto', () => {
    const result = parseShoppingCommand('dois litros');
    expect(result.items).toEqual([]);
    expect(result.needsReview).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('pede revisão para texto vazio', () => {
    const result = parseShoppingCommand('   ');
    expect(result.items).toEqual([]);
    expect(result.needsReview).toBe(true);
  });

  it('pede revisão quando a quantidade é absurda', () => {
    const result = parseShoppingCommand('999999 bananas');
    expect(result.items).toEqual([]);
    expect(result.needsReview).toBe(true);
  });
});

describe('parseQuantityField', () => {
  it('vazio vira quantidade 1', () => {
    expect(parseQuantityField('')).toEqual({ quantity: 1, unit: '' });
  });
  it('aceita número, unidade e extenso', () => {
    expect(parseQuantityField('3')).toEqual({ quantity: 3, unit: '' });
    expect(parseQuantityField('2 kg')).toEqual({ quantity: 2, unit: 'kg' });
    expect(parseQuantityField('1,5 litros')).toEqual({ quantity: 1.5, unit: 'litros' });
    expect(parseQuantityField('dois litros')).toEqual({ quantity: 2, unit: 'litros' });
    expect(parseQuantityField('meia dúzia')).toEqual({ quantity: 6, unit: 'unidades' });
    expect(parseQuantityField('3 sacos')).toEqual({ quantity: 3, unit: 'sacos' });
  });
  it('rejeita texto sem sentido', () => {
    expect(parseQuantityField('muito pouco')).toBeNull();
    expect(parseQuantityField('0')).toBeNull();
  });
});
