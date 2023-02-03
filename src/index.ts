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
      const m = value.match(/([^\d]+)?(\d+)～(\d+)([^\d]+)?$/);
      if (m !== null) {
        const [, prefix, start, end, suffix = ''] = m;
        // 処理が困難なひとたち
        if (countChar(value, '～') > 1 || countChar(value, '－') > 0 || Boolean(prefix)) {
          return;
        }
        for (let i = parseInt(start, 10); i <= parseInt(end, 10); i += 1) {
          result.push(`${i}${suffix}`);
        }
      } else {
        result.push(value);
      }
    });

  return (result.length > 0)
    ? result.map((value) => value.replace(/\d/g, (s) => ZEN_NUM_MAP[parseInt(s, 10)]))
    : [''];
}

interface ParseOptions {
  parseBrackets?: boolean
}

/**
 * 住所から括弧内の文字列を取り除き、括弧内の文字列と一緒に返す
 * @param {string} address
 * @returns {[string, string?]}
 */
function parseBrackets (address: string): [string, string?] {
  const pattern = /（.+）/;
  const m = address.match(pattern);
  if (m !== null) {
    return [
      address.replace(pattern, ''),
      m[0].replace(/[（）「」]/g, '')
    ];
  }
  return [address, undefined];
}

/**
 * 住所文字列をパースする
 * @param {string} addressString
 * @param {ParseOptions} options
 * @returns string[]
 */
function parseAddress (addressString: string = '', options?: ParseOptions): string[] {
  if (/(くる|ない)場合/.test(addressString)) {
    return [''];
  }

  const address = addressString
    .replace(/([^^])一円/, '$1')
    .replace(/（高層棟）/, '')
    .replace(/（(.+?)除く）/, '')
    .replace(/（その他）/, '')
    .replace(/「(.+?)」/g, '')
    .replace(/〔(.+?)構内〕/g, '')
    .replace(/以上/g, '');

  if ((options?.parseBrackets) ?? false) {
    const m = address.match(/(.+)（(.+?)）/);
    if (m !== null) {
      const [, prefix, content] = m;
      return splitAddress(content).map((value) => `${prefix}${value}`);
    }
  }

  return [parseBrackets(address)[0]];
}

export interface AddressItem {
  zipcode: string
  pref: string
  components: string[]
  address: string
  notes?: string
}

type SourceAddressItem = AddressItem & {
  sbAddress: string
};

/**
 * KEN_ALL.csvをパースする
 * @param {string} csv
 * @returns AddressItem[]
 */
export function parse (csv: string, options?: ParseOptions): SourceAddressItem[] {
  const rows = csv.split(/\r\n/);
  const data: SourceAddressItem[] = [];
  const multiline: string[] = [];

  const parseLine = (line?: string): string[] => {
    return (line !== undefined) ? line.split(',').map(value => value.replace(/"/g, '')) : [];
  };

  const getHasNextLine = (current: string[], next: string[]): boolean => {
    return current[12] === '0' && current[2] === next[2] && current[6] === next[6] && current[7] === next[7];
  };

  interface PushItemProps {
    zipcode: string
    pref: string
    city: string
    address: string
  }

  const pushItem = ({ zipcode, pref, city, address }: PushItemProps): void => {
    parseAddress(address, options).forEach((a) => {
      data.push(
        {
          zipcode,
          pref,
          components: [city, a].filter((v) => Boolean(v)),
          address: `${city}${a}`,
          sbAddress: convertNumber(`${city}${a}`),
          notes: ((options?.parseBrackets) ?? false) ? undefined : parseBrackets(address)[1]
        }
      );
    });
  };

  rows.forEach((row, i) => {
    if (row.length === 0) {
      return;
    }

    const next = parseLine(rows[i + 1]);
    const current = parseLine(row);
    const [,,zipcode,,,,pref, city, street] = current;

    if (multiline.length > 0) {
      multiline.push(street);
      if (!getHasNextLine(current, next)) {
        pushItem({
          zipcode,
          pref,
          city,
          address: multiline.join('')
        });
        multiline.splice(0, multiline.length);
      }
    } else {
      if (getHasNextLine(current, next)) {
        multiline.push(street);
      } else {
        pushItem({
          zipcode,
          pref,
          city,
          address: street
        });
      }
    }
  });

  return Array.from(new Set(data.map(it => JSON.stringify(it))))
    .map(json => JSON.parse(json));
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
 * @returns AddressItem[] | Error
 */
export function findByZipcode (zipcodeString: string, data: SourceAddressItem[]): AddressItem[] | Error {
  const zipcode = zipcodeString
    .replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
    .replace(/[^\d]/g, '');
  if (zipcode.length === 0) {
    return new Error('Invalid Parameter');
  }
  const pattern = new RegExp(`^${zipcode}`);
  const result = data.filter((item) => pattern.test(item.zipcode));
  return cleanResult(result);
}

/**
 * 住所から住所を検索する
 * @param {string} addressString
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export function findByAddress (addressString: string, data: SourceAddressItem[]): AddressItem[] | Error {
  const address = convertNumber(addressString);
  if (address.length === 0) {
    return new Error('Invalid Parameter');
  }
  const result = (() => {
    const r = data.filter((item) => `${item.pref}${item.sbAddress}`.includes(address));
    return (r.length > 0) ? r : data.filter((item) => address.includes(item.sbAddress));
  })();
  return cleanResult(result);
}

/**
 * 住所の部品からAND/OR検索する
 * @param {string[]} components
 * @param {AddressItem[]} data
 * @param {boolean} isOr
 * @returns AddressItem[] | Error
 */
export function findByComponents (components: string[], data: SourceAddressItem[], isOr: boolean = false): AddressItem[] | Error {
  if (components.length === 0 || components.join('').length === 0) {
    return new Error('Invalid Parameter');
  }
  const result = data.filter((item) => {
    const method = isOr ? 'some' : 'every';
    return components[method]((component) => {
      return `${item.pref}${item.sbAddress}`.includes(convertNumber(component));
    });
  });
  return cleanResult(result);
}
