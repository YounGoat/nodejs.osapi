#	osapi
__通用对象存储应用程序接口__

>	其他语言 / [English](./README.md) / [繁體中文](./README.zh_TW.md)

这套 API 很好地兼容了 CEPH 对象存储服务，因此取 __[ceph](https://www.npmjs.com/package/ceph)__ 作为本包的别名。你可以按照个人喜好，引用 `osapi` 或 `ceph` 包，两个 NPM 包将保持同步更新。

我们提供两种不同风格的 API：OpenStack *SWIFT* 风格和 Amazon *S3* 风格。

##	快速开始

###	OpenStack Swift 风格

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

###	AWS S3 风格

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

##  术语

亚马逊的简单存储服务（S3）和 OpenStack Swift 有相似之外，但仍然是两种不同的东西。

| S3                   | SWIFT          | 含义 |
| :----------------    | :------------- | :------------- |
| bucket               | container      | 属于某个账户的、用于存储对象的容器。 |
| access_key           | -              | 用于识别账户的唯一标识串。 |
| secret\_secret\_key  | -              | 用于确认请求合法性的令牌，相当于密码。 |
| -                    | key            | 属于某个子用户，用于生成访问令牌的密钥。 |
| -                    | temp\_url\_key | 属于某个子用户，用于生成临时下载 URL 的密钥。 |
| -                    | user           | 对应某个账户。 |
| -                    | subuser        | 在指定账户下开设的子用户，用于区分不同的访问权限。 |

##  参考

*	[S3 vs Swift](https://oldhenhut.com/2016/05/31/s3-vs-swift/)
