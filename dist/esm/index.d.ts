/**
 * KEN_ALL.csvをダウンロードしてパースする
 * @param {string} url
 * @returns Promise<string>
 */
export declare function fetch(url?: string): Promise<string>;
interface AddressItem {
    zipcode: string;
    pref: string;
    components: string[];
    address: string;
    notes?: string;
}
type SourceAddressItem = AddressItem & {
    sbAddress: string;
};
interface ParseOptions {
    parseBrackets?: boolean;
}
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
 * @returns Promise<AddressItem[]>
 */
export declare function findByZipcode(zipcodeString: string, data: SourceAddressItem[]): Promise<AddressItem[]>;
/**
 * 住所から住所を検索する
 * @param {string} addressString
 * @param {AddressItem[]} data
 * @returns Promise<AddressItem[]>
 */
export declare function findByAddress(addressString: string, data: SourceAddressItem[]): Promise<AddressItem[]>;
export {};
