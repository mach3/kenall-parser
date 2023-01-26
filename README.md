# KenAllParser

郵便番号データの `KEN_ALL.CSV` をJavaScriptでパースするnode.js用ライブラリ。

## Feature

- `fetch()` で `KEN_ALL.ZIP` をダウンロードして解凍し、CSVを文字列データとして取得する
- `parse()` で `KEN_ALL.CSV` のCSVデータをパースする
  - 以下のパターンの文字列を除去する
    - `***する場合` `***くる場合`
    - `（その他）`
    - `一円` （住所の一部である場合を除く）
    - `（高層棟）`
    - `（***除く）`
    - `「***」`
    - `〔***構内〕`
    - `以上`
  - 住所の括弧内の文字列をパースするかどうかをオプションで指定できる（ `parseBrackets: boolean` ）
    - `true` の場合、可能な範囲でパースし、分割する
      - `（１～１００丁目）`
      - `（地名１、地名２、地名３）`
      - あるいはその混在パターン `（１～５丁目、地名、１０～２０丁目）`
    - `false` の場合、括弧に囲まれた文字列はすべて除去する
      - 除去された文字列は `notes` プロパティに保持される
- `findByZipcode()` で正引き（郵便番号 -> 住所）ができる
  - 正引きの場合は `parseBrackets` は `false` にして使用する事が望ましい
- `findByAddress()` で逆引き（住所 -> 郵便番号）ができる
  - 逆引きの場合は `parseBrackets` を `true` にする事で精度の向上が期待できる
  - `parseBrackets` は精度向上の反面、単純な住所を渡すとすごい行数を返してくる可能性があるので、あまりおすすめはできない


## Examples

### データをローカルに保存する

```js
const KenAll = require('kenall-parser');
const fs = require('fs');

async function save () {
  const raw = await KenAll.fetch();
  const data = KenAll.parse(raw);
  fs.writeFileSync('./data.json', JSON.stringify(data), 'utf-8');
}

save();
```

### 保存したデータから郵便番号で検索する

```js
const KenAll = require('kenall-parser');
const fs = require('fs');

function findByZipcode () {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const result = KenAll.findByZipcode('1000001', data);
  console.log({ result });
}

findByZipcode();
```

### 保存したデータから住所で検索する

```js
const KenAll = require('kenall-parser');
const fs = require('fs');

function findByAddress () {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const result = KenAll.findByAddress('東京都港区芝公園', data);
  console.log({ result });
}

findByAddress();
```

### 保存したデータから住所部品で検索する

```js
const KenAll = require('kenall-parser');
const fs = require('fs');

function findByAddress () {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const result = KenAll.findByComponents(['東京都', '港区', '赤坂'], data);
  console.log({ result });
}

findByAddress();
```
