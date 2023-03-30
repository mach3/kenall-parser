import { fetch, parse, findByAddress, findByZipcode, AddressItem, findByComponents, similaritySort } from '../src/index';

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
  expect(getType(results[0].notes)).toBe('string');
  expect(data.filter(it => JSON.stringify(it).indexOf('除く') > 0).length).toBe(0);
});

// 括弧内の文字列をパースできること
test('test parseBrackets option', async () => {
  const raw = await fetch();
  const data = parse(raw, { splitAddress: true });
  const zipcode = getBracetedRow(raw)[2];
  const results = findByZipcode(zipcode, data) as AddressItem[];

  expect(results.length).toBeGreaterThan(0);
  expect(/^\d+$/.test(results[0].zipcode)).toBe(true);
  expect(getType(results[0].pref)).toBe('string');
  expect(Array.isArray(results[0].components)).toBe(true);
  expect(getType(results[0].address)).toBe('string');
  expect(results[0].notes).toBe(undefined);
});

// 重複データがないこと
test("don't have duplicate data", async () => {
  const raw = await fetch();
  const data = parse(raw);
  const tmp = data.map(it => JSON.stringify(it));
  const uniq = [...new Set(tmp)];

  expect(tmp.length).toBe(uniq.length);
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
  const r: [Error, AddressItem[], AddressItem[], AddressItem[]] = [
    findByAddress('', data) as Error,
    findByAddress('foobar', data) as AddressItem[],
    findByAddress('東京都港区', data) as AddressItem[],
    findByAddress('藤沢市大庭5', data) as AddressItem[]
  ];

  expect(r[0] instanceof Error).toBe(true);
  expect(r[1].length).toBe(0);
  expect(r[2].length).toBeGreaterThan(0);
  expect(r[2][0].pref).toBe('東京都');
  expect(r[2][0].components.includes('東京都')).toBe(true);
  expect(r[3].length).toBeGreaterThan(0);
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

test('Edge Case : 9218046', async () => {
  // 2023/2/26現在、「一つの郵便番号で二以上の町域を表す場合の表示」が 1 だが複数行に渡るケースであり、
  // さらに対象の郵便番号が示す町域は同じ市内にあるため、正常にパースできていなかった
  // その対応をこのテストで検証する
  const raw = await fetch();
  const data = parse(raw);
  const r = findByZipcode('9218046', data) as AddressItem[];
  expect(r.length).toBe(2);
});

// 類似度でソート
test('sort by similarity', async () => {
  const SAMPLE_DATA = JSON.parse('[{"zipcode":"1140000","pref":"東京都","components":["東京都","北区"],"address":"北区"},{"zipcode":"5300000","pref":"大阪府","components":["大阪府","大阪市北区"],"address":"大阪市北区"},{"zipcode":"5300057","pref":"大阪府","components":["大阪府","大阪市北区","曽根崎"],"address":"大阪市北区曽根崎"},{"zipcode":"5300002","pref":"大阪府","components":["大阪府","大阪市北区","曽根崎新地"],"address":"大阪市北区曽根崎新地"}]');
  const r = similaritySort('大阪府大阪市北区曽根崎', SAMPLE_DATA);
  expect(r[0].zipcode).toBe('5300057');
  expect(r[3].zipcode).toBe('1140000');
});
