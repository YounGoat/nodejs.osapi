#	osapi
__A common Object Storage API__

[![total downloads of osapi](https://img.shields.io/npm/dt/osapi.svg)](https://www.npmjs.com/package/osapi)
[![osapi's License](https://img.shields.io/npm/l/osapi.svg)](https://www.npmjs.com/package/osapi)
[![latest version of osapi](https://img.shields.io/npm/v/osapi.svg)](https://www.npmjs.com/package/osapi)

This API is compatible with CEPH object storage. There are two styles available: SWIFT and S3.

##	Get Started

###	OpenStack Swift Style

```javascript
const swift = require('osapi/swift');

let conn = new swift.Connection({
	endPoint   : 'http://storage.example.com/',
	subuser    : 'userName:subUserName',
	key        : '380289ba59473a368c593c1f1de6efb0380289ba5', // generally 40 characters 
	tempURLKey : '380289ba59473a368c593c1f1de6efb0', // generally 32 characters
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

###	AWS S3 Style

```javascript

const s3 = require('osapi/s3');

let conn = new s3.Connection({
	endPoint        : 'http://storage.example.com/',
	accessKey       : '380289ba59473a368c59', // 20 characters 
	secretAccessKey : '380289ba59473a368c593c1f1de6efb0380289ba5', // 40 characters
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

###	osapi/swift

Before we find a way to offer a better set of APIs for object storage, __osapi/swift__ will be the default entry of __osapi__. 

```javascript
const swift = require('osapi/swift');
// OR
const swift = require('osapi');
```

*	new __swift.Connection__(*object* options)
*	__\<conn\>.createObject(*object | string* options, content [, *function* callback ])
*	__\<conn\>.readObject(*object | string* options [, *function* callback ])
*	__\<conn\>.deleteObject(*object | string* options [, *function* callback ])
*	__\<conn\>.generateTempUrl(*object | string* options [, *function* callback ])

###	osapi/s3

```javascript
const swift = require('osapi/s3');
```

*	new __s3.Connection__(*object* options)
*	__\<conn\>.createObject(*object | string* options, content [, *function* callback ])
*	__\<conn\>.readObject(*object | string* options [, *function* callback ])
*	__\<conn\>.deleteObject(*object | string* options [, *function* callback ])
*	__\<conn\>.generateTempUrl(*object | string* options [, *function* callback ])

##  Terms

Amazon Simple Storage Service (S3) and OpenStack Swift are similiar but still two different things.

| S3                   | Swift          |                |
| :----------------    | :------------- | :------------- |
| bucket               | container      |                |
| access_key           |                |                |
| secret\_secret\_key  |                |                |
|                      | key            |                |
|                      | temp\_url\_key |                |
|                      | user           |                |
|                      | subuser        |                |

##  References

*	[S3 vs Swift](https://oldhenhut.com/2016/05/31/s3-vs-swift/)
