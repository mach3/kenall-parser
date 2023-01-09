var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
 * 文字列に含まれる全角数字・漢数字を半角数字に変換する
 * @param {string} str
 * @returns string
 */
function convertNumber(str) {
    return str.replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
        .replace(new RegExp(`[${KAN_NUM_MAP}]`, 'g'), (s) => KAN_NUM_MAP.indexOf(s).toString());
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
 * 住所から括弧内の文字列を取り除き、括弧内の文字列と一緒に返す
 * @param {string} address
 * @returns {[string, string?]}
 */
function parseBrackets(address) {
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
function parseAddress(addressString = '', options) {
    var _a;
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
    if ((_a = (options === null || options === void 0 ? void 0 : options.parseBrackets)) !== null && _a !== void 0 ? _a : false) {
        const m = address.match(/(.+)（(.+?)）/);
        if (m !== null) {
            const [, prefix, content] = m;
            return splitAddress(content).map((value) => `${prefix}${value}`);
        }
    }
    return [address];
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
        parseAddress(address, options).forEach((a) => {
            var _a;
            data.push({
                zipcode,
                pref,
                components: [city, a].filter((v) => Boolean(v)),
                address: `${city}${a}`,
                sbAddress: convertNumber(`${city}${a}`),
                notes: ((_a = (options === null || options === void 0 ? void 0 : options.parseBrackets)) !== null && _a !== void 0 ? _a : false) ? undefined : parseBrackets(address)[1]
            });
        });
    });
    return data;
}
/**
 * 結果セットから不要なプロパティを削除する
 * @param {AddressItem[]} result
 * @returns AddressItem[]
 */
function cleanResult(result) {
    return result.map((_a) => {
        var { sbAddress } = _a, props = __rest(_a, ["sbAddress"]);
        return (Object.assign({}, props));
    });
}
/**
 * 郵便番号から住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns Promise<AddressItem[]>
 */
export function findByZipcode(zipcodeString, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            const zipcode = zipcodeString
                .replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
                .replace(/[^\d]/g, '');
            if (zipcode.length === 0) {
                reject(new Error('empty zipcode'));
                return;
            }
            const pattern = new RegExp(`^${zipcode}`);
            const result = data.filter((item) => pattern.test(item.zipcode));
            if (result.length > 0) {
                resolve(cleanResult(result));
            }
            else {
                reject(new Error('not found'));
            }
        });
    });
}
/**
 * 住所から住所を検索する
 * @param {string} addressString
 * @param {AddressItem[]} data
 * @returns Promise<AddressItem[]>
 */
export function findByAddress(addressString, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            const address = convertNumber(addressString);
            if (address.length === 0) {
                reject(new Error('empty address'));
                return;
            }
            const result = (() => {
                const r = data.filter((item) => `${item.pref}${item.sbAddress}`.includes(address));
                return (r.length > 0) ? r : data.filter((item) => address.includes(item.sbAddress));
            })();
            if (result.length > 0) {
                resolve(cleanResult(result));
            }
            else {
                reject(new Error('not found'));
            }
        });
    });
}
