import https from 'https';
import unzipper from 'unzipper';
import iconv from 'iconv-lite';

const KEN_ALL_URL = 'https://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip';
const ZEN_NUM_MAP = '０１２３４５６７８９';
const KAN_NUM_MAP = '〇一二三四五六七八九';

/**
 * KEN_ALL.csvをダウンロードしてパースする
 * @param {string} url
 * @returns Promise<string>
 */
export async function fetch (url = KEN_ALL_URL): Promise<string> {
  return await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('Failed to fetch'));
      }
      res.pipe(unzipper.Parse())
        .on('entry', (entry) => {
          entry.buffer().then((buffer: Buffer) => {
            const content = iconv.decode(buffer, 'Shift_JIS');
            if (content.length > 0) {
              resolve(content);
            } else {
              reject(new Error('Failed to decode'));
            }
          });
        });
      return null;
    });
  });
}

/**
 * 文字列に含まれる全角数字・漢数字を半角数字に変換する
 * @param {string} str
 * @returns string
 */
function convertNumber (str: string): string {
  return str.replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
    .replace(new RegExp(`[${KAN_NUM_MAP}]`, 'g'), (s: string) => KAN_NUM_MAP.indexOf(s).toString());
}

/**
 * 文字列に含まれる文字の数を数える
 * @param {string} str
 * @param {string} char
 * @returns number
 */
function countChar (str: string, char: string): number {
  return str.split(char).length - 1;
}

/**
 * 住所の括弧内を分割処理する
 * 処理が困難なものは削除する
 * @param {string} addressString
 * @returns string[]
 */
function splitAddress (addressString: string): string[] {
  const result: string[] = [];

  addressString.replace(/[０-９]/g, (s: string) => ZEN_NUM_MAP.indexOf(s).toString())
    .split('、')
    .forEach((value: string) => {
      const m = value.match(/([^\d]+)?(\d+)～(\d+)(.+)$/);
      if (m !== null) {
        const [, prefix, start, end, suffix] = m;
        // 処理が困難なひとたち
        if (countChar(value, '～') > 1 || countChar(value, '－') > 0 || Boolean(prefix)) {
          result.push(value);
        }
        for (let i = parseInt(start, 10); i <= parseInt(end, 10); i += 1) {
          result.push(`${i}${suffix}`);
        }
      } else {
        result.push(value);
      }
    });

  return result.map((value) => value.replace(/\d/g, (s) => ZEN_NUM_MAP[parseInt(s, 10)]));
}

/**
 * 住所文字列をパースする
 * @param {string} addressString
 * @returns string[]
 */
function parseAddress (addressString: string = ''): string[] {
  if (/(くる|ない)場合/.test(addressString)) {
    return [''];
  }

  const address = addressString
    .replace(/([^^])一円/, '$1')
    .replace(/（高層棟）/, '')
    .replace(/（(.+?)除く）/, '')
    .replace(/（その他）/, '')
    .replace(/「(.+?)」/g, '');

  const m = address.match(/(.+)（(.+?)）/);
  if (m != null) {
    const [, prefix, content] = m;
    return splitAddress(content).map((value) => `${prefix}${value}`);
  }
  return [address];
}

interface AddressItem {
  zipcode: string
  pref: string
  components: string[]
  address: string
}

type SourceAddressItem = AddressItem & {
  sbAddress: string
};

/**
 * KEN_ALL.csvをパースする
 * @param {string} csv
 * @returns AddressItem[]
 */
export function parse (csv: string): SourceAddressItem[] {
  const rows = csv.split(/\r\n/);
  const data: SourceAddressItem[] = [];
  const multiline: string[] = [];
  const counts = {
    paren: 0,
    bracket: 0
  };

  rows.forEach((row) => {
    const cols = row.split(',').map((v) => v.replace(/"/g, ''));
    const zipcode = cols[2];
    const pref = cols[6];
    const city = cols[7];
    let address = cols[8];

    if (address === undefined) {
      return;
    }

    counts.paren += countChar(address, '（');
    counts.paren -= countChar(address, '）');
    counts.bracket = countChar(address, '「');
    counts.bracket -= countChar(address, '」');

    // multiline start
    if (counts.paren > 0 || counts.bracket > 0) {
      multiline.push(address);
      return;
    }

    if (multiline.length > 0) {
      multiline.push(address);
      if (counts.paren === 0 && counts.bracket === 0) {
        address = multiline.join('');
        multiline.splice(0, multiline.length);
      }
    }

    parseAddress(address).forEach((a) => {
      data.push(
        {
          zipcode,
          pref,
          components: [city, a].filter((v) => Boolean(v)),
          address: `${city}${a}`,
          sbAddress: convertNumber(`${city}${a}`)
        }
      );
    });
  });

  return data;
}

/**
 * 結果セットから不要なプロパティを削除する
 * @param {AddressItem[]} result
 * @returns AddressItem[]
 */
function cleanResult (result: SourceAddressItem[]): AddressItem[] {
  return result.map(({ sbAddress, ...props }) => ({ ...props }));
}

/**
 * 郵便番号から住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns Promise<AddressItem[]>
 */
export async function findByZipcode (zipcodeString: string, data: SourceAddressItem[]): Promise<AddressItem[]> {
  return await new Promise((resolve, reject) => {
    const zipcode = zipcodeString
      .replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
      .replace(/[^\d]/g, '');
    const pattern = new RegExp(`^${zipcode}`);
    const result = data.filter((item) => pattern.test(item.zipcode));
    if (result.length > 0) {
      resolve(cleanResult(result));
    } else {
      reject(new Error('not found'));
    }
  });
}

/**
 * 住所から住所を検索する
 * @param {string} addressString
 * @param {AddressItem[]} data
 * @returns Promise<AddressItem[]>
 */
export async function findByAddress (addressString: string, data: SourceAddressItem[]): Promise<AddressItem[]> {
  return await new Promise((resolve, reject) => {
    const address = convertNumber(addressString);
    const result = (() => {
      const r = data.filter((item) => `${item.pref}${item.sbAddress}`.includes(address));
      return (r.length > 0) ? r : data.filter((item) => address.includes(item.sbAddress));
    })();
    if (result.length > 0) {
      resolve(cleanResult(result));
    } else {
      reject(new Error('not found'));
    }
  });
}
