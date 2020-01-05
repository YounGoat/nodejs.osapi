#   Package Entrance

The entrance (property `main` in `package.json`) will guide to the right API you need.

##	Table of Contents

* [Quick Start](#quick-start)
* [APIs](#apis)
	* [createConnection()](#createconnection)
	* [getConnectionStyle()](#getconnectionstyle)
	* [isConnection()](#isconnection)

##	Quick Start

```javascript
const osapi = require('osapi');

const conn = osapi.createConnection({
	endPoint        : 'http://storage.example.com/',
    accessKey       : '380289ba59473a368c59',
    secretAccessKey : '380289ba59473a368c593c1f1de6efb0380289ba5',
    bucket          : 'bucketName',
    vendor          : 'ceph',
});

console.log(osapi.isConnection(conn));
// true

console.log(osapi.getConnectionStyle(conn));
// s3
```

You may also get started directly with [`osapi/s3`][^s3] or [`osapi/swift`][^swift] at your will.

##	APIs

###	createConnection()

*	Connection __osapi.createConnection__( object *options* )

Create an instance of [`Connection`](./connection.md). The *options* may be [s3][^s3] style or [swift][^swift] style.

###	getConnectionStyle()

*	string __osapi.getConnectionStyle__( *conn* )

Get the style of a connection instance. The returned value may one of the following:
*	[s3][^s3]
*	[swift][^swift]
*	`null`

###	isConnection()

*	boolean __osapi.isConnection__( *conn* )

To judge if the passed in argument is an instance of [`Connection`](./connection.md).

[^s3]: ./s3/connection.md
[^swift]: ./swift/connection.md