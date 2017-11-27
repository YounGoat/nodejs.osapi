#	osapi
__A common Object Storage API__

[![total downloads of osapi](https://img.shields.io/npm/dt/osapi.svg)](https://www.npmjs.com/package/osapi)
[![osapi's License](https://img.shields.io/npm/l/osapi.svg)](https://www.npmjs.com/package/osapi)
[![latest version of osapi](https://img.shields.io/npm/v/osapi.svg)](https://www.npmjs.com/package/osapi)

Languages / [简体中文](./README.zh_CN.md) / [繁體中文](./README.zh_TW.md)

This API is compatible with CEPH object storage, so the package is also named __[ceph](https://www.npmjs.com/package/ceph)__. You may install and require one of `osapi` and `ceph` at your will.

There are two styles available: OpenStack *SWIFT* and Amazon *S3*.

##	Get Started

###	OpenStack Swift Style

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

###	AWS S3 Style

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

With each __osapi/*__ style, you should start with creating an instance of class `Connection`, see [Get Started](#get-started) for examples.

Generally, methods of class `Connection` are ASYNCHRONOUS:

*	Parameter `callback` is optional. 
*	If `callback` is ingored, function will return an instance of `Promise`.
*	Otherwise, `callback` SHOULD be passed at the end of the arguments.
*	And, in style `callback(error, data)`.


###	osapi/swift

Before we find a way to offer a better set of APIs for object storage, __osapi/swift__ will be the default entry of __osapi__. 

```javascript
const swift = require('osapi/swift');
// OR
const swift = require('osapi');
```

*	new __swift.Connection__(*object* options)
*	__\<conn\>.createObject__(*object | string* options, content [, *function* callback ])
*	__\<conn\>.deleteObject__(*object | string* options [, *function* callback ])
*	__\<conn\>.generateTempUrl__(*object | string* options [, *function* callback ])

*	*stream.Readable* __\<conn\>.pullObject__(*object | string* options [, *function* callback ])  
	The return stream may emit following events:
	-	__meta__  
		Along with argument *meta* which contains metadata of the object. 
	-	events which a readable stream may emit  
		See [Class: stream.Readable](https://nodejs.org/dist/latest/docs/api/stream.html#stream_class_stream_readable) for details.

*	__\<conn\>.readObject__(*object | string* options [, *function* callback ])

###	osapi/s3

```javascript
const swift = require('osapi/s3');
```

*	new __s3.Connection__(*object* options)
*	__\<conn\>.createObject__(*object | string* options, content [, *function* callback ])
*	__\<conn\>.readObject__(*object | string* options [, *function* callback ])
*	__\<conn\>.deleteObject__(*object | string* options [, *function* callback ])
*	__\<conn\>.generateTempUrl__(*object | string* options [, *function* callback ])

##  Terms

Amazon Simple Storage Service (S3) and OpenStack Swift are similiar but still two different things.

| S3                   | SWIFT          | meaning        |
| :----------------    | :------------- | :------------- |
| bucket               | container      | An container belongs to one account and is used to store objects. |
| access_key           |                | Unique token used to identify an account. |
| secret\_secret\_key  |                | Secret token accompanying the *access_key* and used to verify the requests. |
|                      | key            | Secret token used to generate access token for current subuser. |
|                      | temp\_url\_key | Secret token used to generate temporary downloading URLs for objects. |
|                      | user           | Account. |
|                      | subuser        | User under specified account. |

##  References

*	[S3 vs Swift](https://oldhenhut.com/2016/05/31/s3-vs-swift/)
