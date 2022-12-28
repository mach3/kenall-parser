import { fetch, parse, findByAddress, findByZipcode } from '../src/index';

function getType (obj: any): string | null {
  const m = Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/);
  return m !== null ? m[1].toLowerCase() : null;
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
  expect(data.length).toBeGreaterThan(9999);
  expect(/^\d+$/.test(data[0].zipcode)).toBe(true);
  expect(getType(data[0].pref)).toBe('string');
  expect(Array.isArray(data[0].components)).toBe(true);
  expect(data[0].components.length > 0).toBe(true);
  expect(getType(data[0].components[0])).toBe('string');
  expect(getType(data[0].address)).toBe('string');
});

// 郵便番号を指定してデータを取得できること
test('find item by zipcode', async () => {
  const raw = await fetch();
  const data = parse(raw);
  const results = await findByZipcode('1050011', data);
  expect(results.length).toBeGreaterThan(0);
  const item = results[0];
  expect(getType(item)).toBe('object');
  expect(item.zipcode).toBe('1050011');
  expect(item.pref).toBe('東京都');
});

// 住所を指定してデータを取得できること
test('find item by address', async () => {
  const raw = await fetch();
  const data = parse(raw);
  const results = await findByAddress('東京都港区', data);
  expect(results.length).toBeGreaterThan(0);
  const item = results[0];
  expect(getType(item)).toBe('object');
  expect(/^[\d]+$/.test(item.zipcode)).toBe(true);
  expect(item.pref).toBe('東京都');
});
