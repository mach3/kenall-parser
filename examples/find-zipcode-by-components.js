const KenAll = require('../dist/cjs/index.js');
const fs = require('fs');

/**
 * NOTE: ローカルに保存したデータを読み込んで、
 *       住所部品から郵便番号を検索する
 */
function findByAddress () {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const result = KenAll.findByComponents(['東京都', '港区', '赤坂'], data);
  console.log({ result });
}

findByAddress();
