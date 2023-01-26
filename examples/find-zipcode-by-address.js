const KenAll = require('../dist/cjs/index.js');
const fs = require('fs');

/**
 * NOTE: ローカルに保存したデータを読み込んで、
 *       住所から郵便番号を検索する
 */
async function findByAddress () {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const result = KenAll.findByAddress('東京都港区芝公園', data);
  console.log({ result });
}

findByAddress();
