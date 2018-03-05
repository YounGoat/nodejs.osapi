#	"osapi" or "ceph"
__Common and CEPH Compatible Object Storage API__

Other Languages / [简体中文](./README.zh_CN.md) / [繁體中文](./README.zh_TW.md)  
If links in this document not avaiable, please access [README on GitHub](https://github.com/YounGoat/nodejs.osapi/blob/master/README.md) directly.

This API is compatible with CEPH object storage, so the package is also named __[ceph](https://www.npmjs.com/package/ceph)__. You may install and require one of `osapi` and `ceph` at your will. For simplicity, we use `osapi` hereinafter.

There are two styles available, OpenStack *SWIFT* and Amazon *S3*. __osapi__ offers a standalone sub module for each style.

##	Table Of Contents

*	[Get Started](#get-started)
	*	[Get Started In OpenStack Swift Style](#get-started-with-openstack-swift-style)
	*	[Get Started  AWS S3 Style](#get-started-with-openstack-swift-style)
*	[API](#api)
*	[Documentations](./docs/index.md)
*	[Terms](#terms)
*	[About](#about)
*	[References](#references)

##	Links

*	[CHANGE LOG](./CHANGELOG.md)
*	[Homepage](https://github.com/YounGoat/nodejs.osapi)

##	Get Started

###	Get Started In OpenStack Swift Style

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

###	Get Started In AWS S3 Style

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

With each __osapi/*__ style, you should start with creating an instance of class `Connection`, read [Get Started](#get-started) for examples. To understand the design philosophy of the package, please read [Design Patterns Used in __osapi__](./docs/design.md).

###	adaptive

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

`osapi/swift` may be required as a standalone module:

```javascript
const swift = require('osapi/swift');
```

Here is a summary and for details, please read API document [Class Connection in osapi/swift](./docs/swift/connection.md).

*	class __swift.Connection__(object *options*)
*	Promise | void __\<conn\>.createContainer__(object | string *options* [, Function *callback* ])
*	Promise | void __\<conn\>.createObject__(object | string *options*, *content* [, Function *callback* ])
*	Promise | void __\<conn\>.deleteContainer__(bject | string *options* [, Function *callback* ])
*	Promise | void __\<conn\>.deleteObject__(object | string *options* [, Function *callback* ])
*	Promise | void __\<conn\>.findContainers__(object *options* [, Function *callback* ])
*	Promise | void __\<conn\>.findObjects__(object *options* [, Function *callback* ])
*	Promise | void __\<conn\>.generateTempUrl__(object | string *options* [, Function *callback* ])
*	stream.Readable __\<conn\>.pullObject__(object | string *options* [, Function *callback* ])  
*	Promise | void __\<conn\>.readObject__(object | string *options* [, Function *callback* ])

ATTENTION: Since version 0.1.0, the entrance (main js) of __osapi__ will be a toolset compatiable with *swift* and *s3*, and will no longer refer to __osapi/swift__.

###	osapi/s3

`osapi/s3` may be required as a standalone module:

```javascript
const swift = require('osapi/s3');
```

Here is a summary and for details, please read API document [Class Connection in osapi/s3](./docs/s3/connection.md).

*	new __s3.Connection__(object *options*)
*	Promise | void __\<conn\>.createObject__(object | string *options*, content [, Function *callback* ])
*	Promise | void __\<conn\>.readObject__(object | string *options* [, Function *callback* ])
*	Promise | void __\<conn\>.deleteObject__(object | string *options* [, Function *callback* ])
*	Promise | void __\<conn\>.generateTempUrl__(object | string *options* [, Function *callback* ])

###	Customised Error

To help developers understanding what happens, customised errors may be thrown.

*	class __OptionAbsentError__
*	class __RequestRefusedError__
	-	string __\<instance\>.action__
	-	Object __\<instance\>.meta__
	-	Object __\<instance\>.response__
		+	number __statusCode__
		+	string __statusMessage__
		+	string __code__
	-	void __\<instance\>.print__()

##  Terms

Amazon Simple Storage Service (S3) and OpenStack Swift are similiar but still two different things.

| S3                   | SWIFT          | meaning        |
| :----------------    | :------------- | :------------- |
| bucket               | container      | An container belongs to one account and is used to store objects. |
| access_key           | -              | Unique token used to identify an account. |
| secret\_secret\_key  | -              | Secret token accompanying the *access_key* and used to verify the requests. |
| -                    | key            | Secret token used to generate access token for current subuser. |
| -                    | temp\_url\_key | Secret token used to generate temporary downloading URLs for objects. |
| -                    | user           | Account. |
| -                    | subuser        | User under specified account. |

##	About

For convenience, this package is published in following names (alias):
*	[ceph](https://www.npmjs.com/package/ceph)
*	[osapi](https://www.npmjs.com/package/osapi)

##  References

*	[S3 vs Swift](https://oldhenhut.com/2016/05/31/s3-vs-swift/)
