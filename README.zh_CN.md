#	osapi
__通用对象存储应用程序接口__

[![total downloads of osapi](https://img.shields.io/npm/dt/osapi.svg)](https://www.npmjs.com/package/osapi)
[![osapi's License](https://img.shields.io/npm/l/osapi.svg)](https://www.npmjs.com/package/osapi)
[![latest version of osapi](https://img.shields.io/npm/v/osapi.svg)](https://www.npmjs.com/package/osapi)

其他语言 / [English](./README.md) / [繁體中文](./README.zh_TW.md)

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

每套 __osapi/*__ 风格的 API 都会提供一个名为 `Connection` 的类，你可以从创建该类的实例开始，参见[快速开始](#快速开始)一节。

通常，`Connection` 类的成员方法都是异步的：

*	参数 `callback` 是可选的。
*	如果未提供 `callback` 参数，那么成员方法返回一个 `Promise` 实例。
*	否则，`callback` 参数始终__应当__放在参数表的最末位置。
*	并且，回调函数自身的参数表形如 `callback(error, data)`。

###	自适应

```javascript
const osapi = require('osapi');

// See osapi/swift and osapi/s3 for details of options and member methods of the created connection.
const conn = osapi.createConnection(options);

osapi.isConnection(conn);
// RETURN: true

osapi.getConnectionStyle(conn);
// RETURN: 
// * "s3"     if conn is instance of osapi/s3.Connection
// * "swift"  if conn is instance of osapi/swift.Connection
// * null     otherwise
```

###	osapi/swift

```javascript
const swift = require('osapi/swift');
```

*	new __swift.Connection__(*object* options)
*	__\<conn\>.createObject__(*object | string* options, content [, *function* callback ])
*	__\<conn\>.deleteObject__(*object | string* options [, *function* callback ])
*	__\<conn\>.generateTempUrl__(*object | string* options [, *function* callback ])
*	*stream.Readable* __\<conn\>.pullObject__(*object | string* options [, *function* callback ])  
	返回的流对象可以触发以下事件:
	-	__meta__  
		携带参数 *meta*，包含有存储对象的元数据键值对。
	-	只读流对象可以触发的其他事件    
		详见 [Class: stream.Readable](https://nodejs.org/dist/latest/docs/api/stream.html#stream_class_stream_readable)。
*	__\<conn\>.readObject__(*object | string* options [, *function* callback ])

注意：自 0.1.0 版本起，__osapi__ 入口将独立发展为兼容 *s3* 和 *swift* 风格的工具类，不再默认指向 __osapi/swift__。

###	osapi/s3

```javascript
const swift = require('osapi/s3');
```

*	new __s3.Connection__(*object* options)
*	__\<conn\>.createObject__(*object | string* options, content [, *function* callback ])
*	__\<conn\>.readObject__(*object | string* options [, *function* callback ])
*	__\<conn\>.deleteObject__(*object | string* options [, *function* callback ])
*	__\<conn\>.generateTempUrl__(*object | string* options [, *function* callback ])

##  术语

亚马逊的简单存储服务（S3）和 OpenStack Swift 有相似之外，但仍然是两种不同的东西。

| S3                   | SWIFT          | 含义 |
| :----------------    | :------------- | :------------- |
| bucket               | container      | 属于某个账户的、用于存储对象的容器。 |
| access_key           |                | 用于识别账户的唯一标识串。 |
| secret\_secret\_key  |                | 用于确认请求合法性的令牌，相当于密码。 |
|                      | key            | 属于某个子用户，用于生成访问令牌的密钥。 |
|                      | temp\_url\_key | 属于某个子用户，用于生成临时下载 URL 的密钥。 |
|                      | user           | 对应某个账户。 |
|                      | subuser        | 在指定账户下开设的子用户，用于区分不同的访问权限。 |

##  参考

*	[S3 vs Swift](https://oldhenhut.com/2016/05/31/s3-vs-swift/)
