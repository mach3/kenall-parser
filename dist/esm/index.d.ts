/**
 * KEN_ALL.csvをダウンロードしてパースする
 * @param {string} url
 * @returns Promise<string>
 */
export declare function fetch(url?: string): Promise<string>;
interface ParseOptions {
    splitAddress?: boolean;
}
export interface AddressItem {
    zipcode: string;
    pref: string;
    components: string[];
    address: string;
    notes?: string;
}
/**
 * KEN_ALL.csvをパースする
 * @param {string} csv
 * @returns AddressItem[]
 */
export declare function parse(csv: string, options?: ParseOptions): AddressItem[];
/**
 * 郵便番号から住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export declare function findByZipcode(zipcodeString: string, data: AddressItem[]): AddressItem[] | Error;
/**
 * 住所から住所を検索する
 * @param {string} address
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export declare function findByAddress(address: string, data: AddressItem[]): AddressItem[] | Error;
/**
 * 住所の部品からAND/OR検索する
 * @param {string[]} components
 * @param {AddressItem[]} data
 * @param {boolean} isOr
 * @returns AddressItem[] | Error
 */
export declare function findByComponents(components: string[], data: AddressItem[], isOr?: boolean): AddressItem[] | Error;
export {};
