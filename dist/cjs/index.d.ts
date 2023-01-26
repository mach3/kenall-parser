/**
 * KEN_ALL.csvをダウンロードしてパースする
 * @param {string} url
 * @returns Promise<string>
 */
export declare function fetch(url?: string): Promise<string>;
interface ParseOptions {
    parseBrackets?: boolean;
}
export interface AddressItem {
    zipcode: string;
    pref: string;
    components: string[];
    address: string;
    notes?: string;
}
type SourceAddressItem = AddressItem & {
    sbAddress: string;
};
/**
 * KEN_ALL.csvをパースする
 * @param {string} csv
 * @returns AddressItem[]
 */
export declare function parse(csv: string, options?: ParseOptions): SourceAddressItem[];
/**
 * 郵便番号から住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export declare function findByZipcode(zipcodeString: string, data: SourceAddressItem[]): AddressItem[] | Error;
/**
 * 住所から住所を検索する
 * @param {string} addressString
 * @param {AddressItem[]} data
 * @returns AddressItem[] | Error
 */
export declare function findByAddress(addressString: string, data: SourceAddressItem[]): AddressItem[] | Error;
/**
 * 住所の部品からAND/OR検索する
 * @param {string[]} components
 * @param {AddressItem[]} data
 * @param {boolean} isOr
 * @returns AddressItem[] | Error
 */
export declare function findByComponents(components: string[], data: SourceAddressItem[], isOr?: boolean): AddressItem[] | Error;
export {};
