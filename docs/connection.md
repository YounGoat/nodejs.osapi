#	Interface Connection

`Connection` is something like an interface which is implemented in both `require('osapi/s3').Connection` and `require('osapi/swift').Connection`. There are three ways to retrieve an instance of `Connection`:

```javascript
// 1.
const osapi = require('osapi');
let conn = osapi.createConnection(options);

// 2.
const swift = require('osapi/swift');
let conn = new swift.Connection(options);

// 3.
const s3 = require('osapi/s3');
let conn = new s3.Connection(options);
```

The returned `conn` is actually an instance of [__s3.Connection__](./s3/connection.md) or [__swift.Connection__](./swift/connection.md) according to what properties owned by `options`.

##	Table of Contents

* [APIs](#apis)
	* [Constructor](#constructor)
	* [isConnected()](#isconnected)
	* [-- Bucket / Container --](#---bucket--container---)
	* [createBucket()](#createbucket)
	* [deleteBucket()](#deletebucket)
	* [readBucket()](#readbucket)
	* [findBuckets()](#findbuckets)
	* [-- Object --](#---object---)
	* [createObject()](#createobject)
	* [updateObjectUserMeta()](#updateobjectusermeta)
	* [copyObject()](#copyobject)
	* [deleteObject()](#deleteobject)
	* [readObject()](#readobject)
	* [readObjectMeta()](#readobjectmeta)
	* [findObjects()](#findobjects)

##	APIs

Both instances of `s3.Connection` and `swift.Connection` SHOULD implement the following methods. However, they may offer other special methods, and accept other properties of `options` besides those described in this chapter. 

In most cases, to accommodate developers familiar with Swift, it is allowed to replace *bucket* with *container* in both method names and options names. E.g., `createContainer()` is equivalent to `createBucket()`, and `options.container` is equivalent to `options.bucket`. And vice versa.

__ATTENTION:__ Some properties of `options` and `result` in this document are not always available. E.g. 

*	[ swift ]  
	Only avaiable for servers compatible with *swift*-style API.

*	[ s3 ]  
	Only avaiable for servers compatible with *s3*-style API.

*	[ AWS S3 ]  
	Only avaiable for *AWS S3* server.

*	[ Aliyun OSS | AWS S3 ]  
	Available for *Aliyun OSS* or *AWS S3* servers.

*	[ CEPH + s3 ]  
	Only avaiable for *CEPH* server with *s3*-style API.

__We cannot blame such shortcoming on dependency APIs offered by storage servers.__ Mostly, it is due to the imperfectness of this package itself. 

All asynchronuous methods are promisible. That means, if `callback` passed in, the method will return the `Connection` instance itself, and the `callback` function will be invoked when the operation accomplished or failed. Otherwise, a `Promise` instance will be returned. 

If `callback` offered, it SHOULD be a standard Error-First callback function with parameters `(err, data)`.



```javascript
// With `callback` passed in, the `conn` itself will be returned.
// So that chained invocation is avaiable.
conn
	.<method1>(options, (error, result) => {
		// ...
	})
	.<method2>(options, (error, result) => {
		// ...
	});

// Without `callback` passed in, a `Promise` instance will be returned.
conn.<method>(options)
	.then(result => {
		// ...
	})
	.catch(error => {
		// ...
	})
	;
```

Hereinafter, *result* will refer to which in `callback(err, result)` or `.then(result => { ... })`. Maybe you will find some other properties of `result` that not I have not declared, PLEASE ignore them because even myself don't know what they represent.

If you need more information in case of failures, see [OsapiError](./osapierror.md) for details. But, not all errors are instance of `OsapiError`.

###	Constructor

[s3.Connection](./s3/connection.md) and [swift.Connection](./swift/connection.md) accept different *options*. Please read correnspond documents.

[- toc -][^toc]

###	isConnected()

*	boolean __\<conn\>.isConnected()

This method will tell you whether the connection is ready for real execuations. It is not necessary to avoid invoking other methods before `conn.isConnected()`. You may call something like `conn.createObject()` immediately when the `Connection` instance is created. If `conn` is not ready at that time, your operations will be staged in a queue.

[- toc -][^toc]

###	-- Bucket / Container --

###	createBucket()

*	Promise | Connection __\<conn\>.createBucket__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.createBucket__( object *options* [, Function *callback* ] )

So far, *options* accepts following properties:
*	__options.name__ *string*  
	Bucket name.

*	__options.meta__ *object* OPTIONAL  
	User-defined meta data you wanna attach to the bucket.  
	[ CEPH + swift ]

Once resolved:
*	__result.requestId__ *string*  
	Request / transaction Id.

__ATTNENTION:__ NO error will be thrown if the bucket already exists.

[- toc -][^toc]

###	deleteBucket()

*	Promise | Connection __\<conn\>.deleteBucket__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.deleteBucket__( object *options* [, Function *callback* ] )

So far, *options* accepts following properties:
*	__options.name__ *string*  
	Bucket name.

Once resolved:
*	__result.requestId__ *string*  
	Request / transaction Id.

__ATTNENTION:__ NO error will be thrown if the bucket not found.

[- toc -][^toc]

###	readBucket()

*	Promise | Connection __\<conn\>.readBucket__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.readBucket__( object *options* [, Function *callback* ] )

So far, *options* accepts following properties:
*	__options.name__ *string*  
	Name of bucket.

*	__options.suppressNotFoundError__ *boolean*  
	Don't threw exception on `404 Not Found`.	

*	__options.suppressBadRequestError__ *boolean*  
	Don't threw exception on `400 Bad Request`.  
	Generally, such exceptions are triggered when a wrong bucket/container name is passed through.

Once resolved:
*	__result.requestId__ *string*  
	Request / transaction Id.

*	__result.region__ *string*  
	Region of bucket.  
	[ Aliyun OSS | AWS S3 ] 

*	__result.objectCount__ *number*  
	Number of objects stored in the bucket.  
	[ CEPH ]

*	__result.bytesUsed__ *number*  
	Totoal size of objects stored in the bucket.  
	[ CEPH ]

*	__result.meta__ *object* OPTIONAL   
	User-defined meta data attached to the bucket.  
	If there is no user-defined meta data, this property will be `undefined` instead of empty `{}`.  
	[ CEPH + swift ]

*	__result.storagePolicy__ *string* OPTIONAL  
	Storage policy of the bucket.  
	[ CEPH + swift ]

[- toc -][^toc]

###	findBuckets()

*	Promise | Connection __\<conn\>.findBuckets__( object *options* [, Function *callback* ] )

So far, *options* accepts following properties:
*	__options.prefix__ *string* OPTIONAL  
	Prefix of bucket name.  
	[ CEPH + swift ]

*	__options.marker__ *string* OPTIONAL  
	Marker (a bucket name) to start with.  
	[ CEPH + swift ]  
	The marker will be compared with buckets' names. Only those whit name greater than the marker will be responsed. So, the one whose name equals to the marker will not be in the responsed list.

*	__options.limit__ *number* OPTIONAL  
	Number of buckets to be responsed at most.  
	[ CEPH + swift ]

Once resolved, the `result` should be an array:
*	__result__ *Bucket[]*

Here, *Bucket* is an object contains:
*	__name__ *string*
	Bucket name.

*	__created__ *Date*  
	When the bucket is created.
	[ s3 ]

*	__objectCount__ *number*  
	Number of objects stored in the bucket.  
	[ swift ]

*	__bytesUsed__ *number*  
	Totoal size of objects stored in the bucket.  
	[ swift ]

[- toc -][^toc]

###	-- Object --

In the following methods, `conn.bucket` will be used by default. However, if neither `conn.bucket` nor `options.bucket` here, an error will be thrown.

###	createObject()

*	Promise | Connection __\<conn\>.createObject__( string *name*, *content* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.createObject__( object *options*, *content* [, Function *callback* ] )

Parameters:
*	__name__ *string*  
	If the first argument is a string, it will be regarded as object name.

*	__options__ *object*  
	See next paragraph for details.

*	__content__ *string* | *Buffer* | *stream.Readable*  
	Content of the object.

So far, *options* accepts following properties:

*	__options.acl__ *string* OPTIONAL  
	ACL is abbreviation of "Access Control List".  
	[ s3 ]

	Generally, valid values are:
	*	private
	*	public-read
	*	public-read-write
	*	authenticated-read

	ATTNETION: NOT all servers accept all above values.

*	__options.bucket__ *string* OPTIONAL  
	Bucket name.
	
*	__options.contentType__ *string* OPTIONAL  
	MIME value.

*       __options.contentLength__ *int* OPTIONAL
        Object's size in bytes.

*	__options.name__ *string*  
	Object name.

*	__options.meta__ *object* OPTIONAL  
	User-defined meta data associated with the object.

Once resolved:

*	__result.requestId__ *string*  
	Request / transaction Id.

*	__result.etag__ *string*  
	ETag of created object.

__ATTNENTION:__ NO error will be thrown if the object already exists.

[- toc -][^toc]

###	copyObject()

*	Promise | Connection __\<conn\>.copyObject__( string *source*, string *target* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.copyObject__( object *source*, object *target* [, Function *callback* ] )

Parameters:
*	__source__ *string* | *object*  
	Represent the source object.  
	If being *string*, it is regarded as the object name. Otherwise it may contain the following properties:

	*	__source.name__ *string*
	*	__source.bucket__ *string* OPTIONAL

*	__target__ *string* | *object*  
	Represent the target object.  
	If being *string*, it is regarded as the object name. Otherwise it may contain the following properties:
	*	__target.name__ *string*
	*	__target.bucket__ *string* OPTIONAL

Once resolved:

*	__result.requestId__ *string*  
	Request / transaction Id..b

[- toc -][^toc]

###	deleteObject()

*	Promise | Connection __\<conn\>.deleteObject__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.deleteObject__( object *options* [, Function *callback* ] )

Parameters:
*	__name__ *string*  
	If the first argument is a string, it will be regarded as object name.

*	__options__ *object*  
	See next paragraph for details.

So far, *options* accepts following properties:

*	__options.bucket__ *string* OPTIONAL  
	Bucket name.

*	__options.name__ *string*  
	Object name.

Once resolved:

*	__result.requestId__ *string*  
	Request / transaction Id.

__ATTNENTION:__ NO error will be thrown if the object not found.

[- toc -][^toc]

###	readObject()

*	Promise | Connection __\<conn\>.readObject__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.readObject__( object *options* [, Function *callback* ] )

Parameters:
*	__name__ *string*  
	If the first argument is a string, it will be regarded as object name.

*	__options__ *object*  
	See next paragraph for details.

So far, *options* accepts following properties:

*	__options.bucket__ *string* OPTIONAL  
	Bucket name.

*	__options.name__ *string*  
	Object name.

*	__options.onlyMeta__  *boolean* OPTIONAL DEFAULT(`false`)  
	Response without object content.

*	__options.suppressNotFoundError__ *boolean* OPTIONAL DEFAULT(`false`)  
	Don't threw exception on `404 Not Found`.

*	__options.suppressBadRequestError__ *boolean* OPTIONAL DEFAULT(`false`)  
	Don't threw exception on `400 Bad Request`.  
	Generally, such exceptions are triggered when a wrong bucket/container name is passed through.

Once resolved:

*	__result.requestId__ *string*  
	Request / transaction Id.

*	__result.buffer__ *Buffer*  
	Object content.

*	__result.contentLength__ *number*  
	Content length.  
	__WARNING:__ This meaning of this property may be ambiguous.

*	__result.contentType__ *string*  
	MIME value.

*	__result.etag__ *string*  
	ETag.
	
*	__result.lastModified__ *Date*  
	Last modified time.

*	__result.meta__ *object*  OPTIONAL  
	User-defined meta data attached to the object.  
	If there is no user-defined meta data, this property will be `undefined` instead of empty `{}`.  

[- toc -][^toc]

###	readObjectMeta()

*	Promise | Connection __\<conn\>.readObjectMeta__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.readObjectMeta__( object *options* [, Function *callback* ] )

See documentation about [readObject()](#readobject) for details.

[- toc -][^toc]

###	updateObjectUserMeta()

*	Promise | Connection __\<conn\>.readObjectMeta__( string *name*, object *usermeta* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.readObjectMeta__( object *options*, object *usermeta* [, Function *callback* ] )

So far, *options* accepts following properties:

*	__options.bucket__ *string* OPTIONAL  
	Bucket name.

*	__options.name__ *string*  
	Object name.

*	__options.replace__ *boolean* OPTIONAL DEFAULT(`false`)  
	Delete all the old user meta fields.

[- toc -][^toc]

###	findObjects()

*	Promise | Connection __\<conn\>.findObjects__( object *options* [, Function *callback* ] )

So far, *options* accepts following properties:

*	__options.delimiter__ *string* OPTIONAL DEFAULT(`'/'`)  
	Path delimiter.  
	See [pseudo directory](./pseudo-directory.md) for details.

*	__options.limit__ *number* OPTIONAL DEFAULT(?)  
	Number of buckets to be responsed at most.  

*	__options.marker__ *string* OPTIONAL  
	Marker to start with.   
	The marker will be compared with objects' (or directories') names. Only those whit name greater than the marker will be responsed. So, the one whose name equals to the marker will not be in the responsed list.

*	__options.path__ *string* OPTIONAL  
	Leading path.  
	See [pseudo directory](./pseudo-directory.md) for details.

*	__options.prefix__ *string* OPTIONAL  
	Prefix of object name.  

Once resolved, the `result` should be an array:
*	__result__ *item[]*

Here, *item* generally represents an object. Under certain conditions, it may also represent a [pseudo directory](./pseudo-directory.md).

An *item* represents an object contains:
*	__etag__ *string*  
	ETag.

*	__lastModified__ *Date*  
	When the object is created.

*	__name__ *string*  
	Object name.

*	__size__ *number*  
	Object size (in bytes).

And *item* represents a pseudo directory contains:

*	__dirname__ *string*  
	Pesudo sub directory name which ends with a delimiter (`'/'` by default).  
	See [pseudo directory](./pseudo-directory.md) for details.

[- toc -][^toc]

[^toc]: #table-of-contents
