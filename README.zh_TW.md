#	osapi
__通用對象存儲應用程式界面__

>	其他语言 / [English](./README.md) / [简体中文](./README.zh_CN.md)

這套 API 很好地相容了 CEPH 對象存儲服務，因此取 __[ceph](https://www.npmjs.com/package/ceph)__ 作為本包的別名。你可以按照個人喜好，引用 `osapi` 或 `ceph` 包，兩個 NPM 包將保持同步更新。

我們提供兩種不同風格的 API：OpenStack *SWIFT* 風格和 Amazon *S3* 風格。

##	快速開始

###	OpenStack Swift 風格

```javascript
const swift = require('osapi/swift');

let conn = new swift.Connection({
    endPoint   : 'http://storage.example.com/',
    subuser    : 'userName:subUserName',
    key        : '380289ba59473a368c593c1f1de6efb0380289ba5', 
                 // generally 40 characters 
    tempURLKey : '380289ba59473a368c593c1f1de6efb0', 
                 // generally 32 characters
    container  : 'containerName',
});

conn.createObject('hello/world', 'Hello world!', (err) => {
    // ...
});

conn.readObject('hello/world', (err, data) => {
    // ...
    data.contentType;
    data.buffer;
});
```

###	AWS S3 風格

```javascript

const s3 = require('osapi/s3');

let conn = new s3.Connection({
    endPoint        : 'http://storage.example.com/',
    accessKey       : '380289ba59473a368c59', 
                       // 20 characters 
    secretAccessKey : '380289ba59473a368c593c1f1de6efb0380289ba5', 
                       // 40 characters
    bucket          : 'bucketName',
});

conn.createObject({
    name: 'hello/world',
    meta: { /* self defined meta info */ }
    }, 'Hello world!', (err) => {
    // ...
});

conn.readObject('hello/world', (err, data) => {
    // ...
    data.contentType;
    data.buffer;
    data.meta;
});
```

##	API

请阅读 [文档](./docs/README.md)。

##  術語

亞馬遜的簡單存儲服務（S3）和 OpenStack Swift 有相似之外，但仍然是兩種不同的東西。

| S3                   | SWIFT          | 含義 |
| :----------------    | :------------- | :------------- |
| bucket               | container      | 屬於某個賬戶的、用於存儲對象的容器。 |
| access_key           | -              | 用於識別賬戶的唯一標識串。 |
| secret\_secret\_key  | -              | 用於確認請求合法性的令牌，相當於密碼。 |
| -                    | key            | 屬於某個子用戶，用於生成訪問令牌的密鑰。 |
| -                    | temp\_url\_key | 屬於某個子用戶，用於生成臨時下載 URL 的密鑰。 |
| -                    | user           | 對應某個賬戶。 |
| -                    | subuser        | 在指定賬戶下開設的子用戶，用於區分不同的訪問權限。 |

##  參考

*   [S3 vs Swift](https://oldhenhut.com/2016/05/31/s3-vs-swift/)
