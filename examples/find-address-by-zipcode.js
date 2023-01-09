const KenAll = require('../dist/cjs/index.js');
const fs = require('fs');

/**
 * NOTE: ローカルに保存したデータを読み込んで、
 *       郵便番号から住所を検索する
 */
async function findByZipcode () {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const result = await KenAll.findByZipcode('8710000', data);
  console.log({ result });
}

findByZipcode();
