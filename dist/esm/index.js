var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import https from 'https';
import unzipper from 'unzipper';
import iconv from 'iconv-lite';
const KEN_ALL_URL = 'https://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip';
const ZEN_NUM_MAP = '０１２３４５６７８９';
/**
 * KEN_ALL.csvをダウンロードしてパースする
 * @param {string} url
 * @returns Promise<string>
 */
export function fetch(url = KEN_ALL_URL) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error('Failed to fetch'));
                }
                res.pipe(unzipper.Parse())
                    .on('entry', (entry) => {
                    entry.buffer().then((buffer) => {
                        const content = iconv.decode(buffer, 'Shift_JIS');
                        if (content.length > 0) {
                            resolve(content);
                        }
                        else {
                            reject(new Error('Failed to decode'));
                        }
                    });
                });
                return null;
            });
        });
    });
}
/**
 * 文字列に含まれる文字の数を数える
 * @param {string} str
 * @param {string} char
 * @returns number
 */
function countChar(str, char) {
    return str.split(char).length - 1;
}
/**
 * 住所の括弧内を分割処理する
 * 処理が困難なものは削除する
 * @param {string} addressString
 * @returns string[]
 */
function splitAddress(addressString) {
    const result = [];
    addressString.replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
        .split('、')
        .forEach((value) => {
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
        }
        else {
            result.push(value);
        }
    });
    return (result.length > 0)
        ? result.map((value) => value.replace(/\d/g, (s) => ZEN_NUM_MAP[parseInt(s, 10)]))
        : [''];
}
/**
 * 住所から不要な文字列を削除する
 * @param address
 * @returns {string}
 */
function cleanAddressString(address) {
    return address
        .replace(/([^^])一円/, '$1')
        .replace(/（高層棟）/, '')
        .replace(/（(.+?)除く）/, '')
        .replace(/（(.+?)含む）/, '')
        .replace(/（その他）/, '')
        .replace(/「(.+?)」/g, '')
        .replace(/〔(.+?)構内〕/g, '')
        .replace(/以上/g, '')
        .replace(/（地階・階層不明）/g, '')
        .replace(/（.+(以降|以内)）/g, '')
        .replace(/（(丁目|番地)）/g, '')
        .replace(/甲、乙/g, '')
        .replace(/^([^（]+?)[０-９]+.+(、|～).+$/, '$1');
}
/**
 * 住所から括弧内の文字列を取り除き、括弧内の文字列と一緒に返す
 * @param {string} addressString
 * @returns {[string, string?]}
 */
function parseBrackets(addressString) {
    const address = cleanAddressString(addressString);
    const pattern = /（.+）/;
    const m = address.match(pattern);
    if (m !== null) {
        const notes = m[0].replace(/[（）「」]/g, '');
        return [
            address.replace(pattern, ''),
            /[、～・]/.test(notes) ? notes : undefined
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
function parseAddress(addressString = '', options) {
    var _a;
    const isSingleStreet = (content) => {
        return !/[、～・]/.test(content);
    };
    if (/(くる|ない)場合/.test(addressString)) {
        return [''];
    }
    const address = cleanAddressString(addressString);
    const m = address.match(/(.+)（(.+?)）/);
    if (m !== null) {
        const [, prefix, content] = m;
        if ((_a = (options === null || options === void 0 ? void 0 : options.splitAddress)) !== null && _a !== void 0 ? _a : false) {
            return splitAddress(content).map((value) => `${prefix}${value}`);
        }
        else if (isSingleStreet(content)) {
            return [`${prefix}${content}`];
        }
    }
    return [parseBrackets(address)[0]];
}
/**
 * KEN_ALL.csvをパースする
 * @param {string} csv
 * @returns AddressItem[]
 */
export function parse(csv, options) {
    const rows = csv.split(/\r\n/);
    const data = [];
    const multiline = [];
    const parseLine = (line) => {
        return (line !== undefined) ? line.split(',').map(value => value.replace(/"/g, '')) : [];
    };
    const getHasNextLine = (c, n, count) => {
        const r = c[12] === '0' && c[2] === n[2] && c[6] === n[6] && c[7] === n[7];
        return r || !(count.open === count.close);
    };
    const pushItem = ({ zipcode, pref, city, address }) => {
        parseAddress(address, options).forEach((a) => {
            var _a;
            data.push({
                zipcode,
                pref,
                components: [pref, city, a].filter((v) => Boolean(v)),
                address: `${city}${a}`,
                notes: ((_a = (options === null || options === void 0 ? void 0 : options.splitAddress)) !== null && _a !== void 0 ? _a : false) ? undefined : parseBrackets(address)[1]
            });
        });
    };
    const count = {
        open: 0,
        close: 0
    };
    rows.forEach((row, i) => {
        if (row.length === 0) {
            return;
        }
        count.open += countChar(row, '（');
        count.close += countChar(row, '）');
        const next = parseLine(rows[i + 1]);
        const current = parseLine(row);
        const [, , zipcode, , , , pref, city, street] = current;
        if (multiline.length > 0) {
            multiline.push(street);
            if (!getHasNextLine(current, next, count)) {
                pushItem({
                    zipcode,
                    pref,
                    city,
                    address: multiline.join('')
                });
                multiline.splice(0, multiline.length);
                count.open = 0;
                count.close = 0;
            }
        }
        else {
            if (getHasNextLine(current, next, count)) {
                multiline.push(street);
            }
            else {
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
 * 郵便番号から住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export function findByZipcode(zipcodeString, data) {
    const zipcode = zipcodeString
        .replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
        .replace(/[^\d]/g, '');
    if (zipcode.length === 0) {
        return new Error('Invalid Parameter');
    }
    const pattern = new RegExp(`^${zipcode}`);
    return data.filter((item) => pattern.test(item.zipcode));
}
/**
 * 住所から住所を検索する
 * @param {string} address
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export function findByAddress(address, data) {
    if (address.length === 0) {
        return new Error('Invalid Parameter');
    }
    return data.filter(it => {
        const itsAddress = `${it.pref}${it.address}`;
        return itsAddress.includes(address) || address.includes(itsAddress);
    });
}
/**
 * 住所の部品からAND/OR検索する
 * @param {string[]} components
 * @param {AddressItem[]} data
 * @param {boolean} isOr
 * @returns AddressItem[] | Error
 */
export function findByComponents(components, data, isOr = false) {
    if (components.length === 0 || components.join('').length === 0) {
        return new Error('Invalid Parameter');
    }
    const method = isOr ? 'some' : 'every';
    return data.filter(it => {
        const itsAddress = `${it.pref}${it.address}`;
        if (components.length > 1) {
            return components[method]((component) => {
                return itsAddress.includes(component);
            });
        }
        return itsAddress.includes(components[0]);
    });
}
