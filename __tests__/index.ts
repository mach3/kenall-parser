import { fetch, parse, findByAddress, findByZipcode, AddressItem, findByComponents } from '../src/index';

function getType (obj: any): string | null {
  const m = Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/);
  return m !== null ? m[1].toLowerCase() : null;
}

function getBracetedRow (src: string): string[] {
  const row = src.split('\n')
    .filter((value) => {
      return /（[^）]+$/.test(value);
    })[0];
  return row.split(',').map(value => value.replace(/"/g, ''));
}

// 誤ったURLを指定した場合、エラーが発生すること
test('fail to fetch url', async () => {
  try {
    await fetch('https://example.com/404');
  } catch (e: any) {
    expect(e.message).toBe('Failed to fetch');
  }
});

// 正しいURLを指定した場合、データが取得できること
test('fetch ken_all.csv', async () => {
  const data = await fetch();
  expect(data.length).toBeGreaterThan(9999);
});

// ダウンロードしたデータをパースできること
// パースされたデータが正しい形式であること
test('parse downloaded csv data', async () => {
  const raw = await fetch();
  const data = parse(raw);
  const zipcode = getBracetedRow(raw)[2];
  const results = findByZipcode(zipcode, data) as AddressItem[];

  expect(data.length).toBeGreaterThan(9999);
  expect(/^\d+$/.test(results[0].zipcode)).toBe(true);
  expect(getType(results[0].pref)).toBe('string');
  expect(Array.isArray(results[0].components)).toBe(true);
  expect(results[0].components.length > 0).toBe(true);
  expect(getType(results[0].components[0])).toBe('string');
  expect(getType(results[0].address)).toBe('string');
  expect(getType(data[0].sbAddress)).toBe('string');
  expect(getType(results[0].notes)).toBe('string');
});

// 括弧内の文字列をパースできること
test('test parseBrackets option', async () => {
  const raw = await fetch();
  const data = parse(raw, { parseBrackets: true });
  const zipcode = getBracetedRow(raw)[2];
  const results = findByZipcode(zipcode, data) as AddressItem[];

  expect(results.length).toBeGreaterThan(0);
  expect(/^\d+$/.test(results[0].zipcode)).toBe(true);
  expect(getType(results[0].pref)).toBe('string');
  expect(Array.isArray(results[0].components)).toBe(true);
  expect(getType(results[0].address)).toBe('string');
  expect(results[0].notes).toBe(undefined);
});

// 郵便番号を指定してデータを取得できること
test('find item by zipcode', async () => {
  const raw = await fetch();
  const data = parse(raw);
  const r: [Error, AddressItem[], AddressItem[]] = [
    findByZipcode('foobar', data) as Error,
    findByZipcode('11111111', data) as AddressItem[],
    findByZipcode('1050011', data) as AddressItem[]
  ];

  expect(r[0] instanceof Error).toBe(true);
  expect(r[1].length).toBe(0);
  expect(r[2].length).toBeGreaterThan(0);
  expect(r[2][0].pref).toBe('東京都');
});

// 住所を指定してデータを取得できること
test('find item by address', async () => {
  const raw = await fetch();
  const data = parse(raw);
  const r: [Error, AddressItem[], AddressItem[]] = [
    findByAddress('', data) as Error,
    findByAddress('foobar', data) as AddressItem[],
    findByAddress('東京都港区', data) as AddressItem[]
  ];

  expect(r[0] instanceof Error).toBe(true);
  expect(r[1].length).toBe(0);
  expect(r[2].length).toBeGreaterThan(0);
  expect(r[2][0].pref).toBe('東京都');
});

// 住所部品を指定してデータを取得できること
test('find item by components', async () => {
  const raw = await fetch();
  const data = parse(raw);
  const r: [Error, Error, AddressItem[], AddressItem[], AddressItem[], AddressItem[]] = [
    findByComponents([], data) as Error,
    findByComponents([''], data) as Error,
    findByComponents(['foobar'], data) as AddressItem[],
    findByComponents(['東京都', '港区'], data) as AddressItem[],
    findByComponents(['神奈川県', '東京都'], data) as AddressItem[],
    findByComponents(['神奈川県', '東京都'], data, true) as AddressItem[]
  ];

  expect(r[0] instanceof Error).toBe(true);
  expect(r[1] instanceof Error).toBe(true);
  expect(r[2].length).toBe(0);
  expect(r[3].length).toBeGreaterThan(0);
  expect(r[4].length).toBe(0);
  expect(r[5].length).toBeGreaterThan(0);
});
