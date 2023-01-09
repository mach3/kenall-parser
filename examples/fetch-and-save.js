const KenAll = require('../dist/cjs/index.js');
const fs = require('fs');

/**
 * NOTE: KEN_ALL.CSV をダウンロードしてパースし、
 *       データをローカルに保存する
 */
async function save () {
  const raw = await KenAll.fetch();
  const data = KenAll.parse(raw);
  fs.writeFileSync('./data.json', JSON.stringify(data), 'utf-8');
}

save();
