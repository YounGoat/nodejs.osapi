#	Class Connection (osapi/swift)

##	Table of Contents

* [APIs](#apis)
	* [Constructor](#constructor)
	* [-- basic --](#---basic---)
	* [-- extended --](#---extended---)
	* [connect()](#connect)
	* [createObjectMeta()](#createobjectmeta)
	* [generateTempUrl()](#generatetempurl)

##	APIs

Please read [Interface Connection](../connection.md) for illustrations of basic methods.

###	Constructor

*	Class __Connection__(Object *options* [, Object *htpSettings*])

*options* may include following properties:
*	__options.endPoint__ *string*  
	Endpoint (URL base) of the object storage service.
	
*	__options.subuser__ *string* OPTIONAL  
	The whole account name is compound of `<username>:<subUsername>`.  
	If this property absent, both *username* and *subUsername* SHOULD be present.

*	__options.username__ *string* OPTIONAL  
	Main username.  
	Generally, this property should be together with *subUsername*.

*	__options.subUsername__ *string* OPTIONAL  
	Sub username.  
	Generally, this property should be together with *username*.

*	__options.key__ *string*  
	Key (something like password).

*	__options.tempURLKey__ *string* OPTIONAL  
	A special key used to generate temporary URLs. Then accessors may download the objects directly via such URLs without offering key.

*	__options.proxy__ *string* OPTIONAL  
	HTTP(S) proxy.  
	Same as __htpSettings.proxy__.

*	__options.container__ *string* OPTIONAL  
	Default container (bucket) name.

This package depends on `htp`, and the following settings are used by `htp`:
*	__htpSettings.dnsAgent__ *dns-agent* OPTIONAL  
*	__htpSettings.keppAlive__ *boolean* OPTIONAL DEFAULT(`true`) 
*   __htpSettings.rejectUnauthorized__ *boolean* OPTIONAL DEFAULT(`true`)    
    DON'T SET `false` unless you are sure that the endpoint is safe.
*	__htpSettings.proxy__ *string* OPTIONAL

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
```

### -- basic --

See [Interface Connection](../connection.md) for help info about basic methods.

###	-- extended --

###	connect()

*	void __\<conn\>.connect__()

###	createObjectMeta()

[ experimental ] Please take care of yourself when using the method.

*	Promise | Connection __\<conn\>.createObjectMeta__( string *name* [, object *meta*, string *flag*, Function *callback* ] )
*	Promise | Connection __\<conn\>.createObjectMeta__( object *options* [, object *meta*, string *flag*, Function *callback* ] )

Parameters:
*	__name__ *string*  
	If the first argument is a string, it will be regarded as object name.

*	__options__ *object*  
	See next paragraph for details.

*	__meta__ *object* OPTIONAL  
	Meta data in key-value pairs.

*	__flag__ *string* OPTIONAL DEFAULT(`'w'`)  
	`'a'` = append  
	`'w'` = write

So far, *options* accepts following properties:

*	__options.bucket__ *string* OPTIONAL  
	Bucket name.
	
*	__options.name__ *string*  
	Object name.

*	__options.suppressNotFoundError__ *boolean*  
	Don't threw exception on `404 Not Found`.
	
Once resolved:

*	__result.requestId__ *string*  
	Request / transaction Id.

[- toc -][^toc]

###	generateTempUrl()

*	Promise | Connection __\<conn\>.generateTempUrl__( string *name* [, Function *callback* ] )
*	Promise | Connection __\<conn\>.createObjectMeta__( object *options* [, Function *callback* ] )

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

*	__result__ *string*  
	A temporary URL.

[- toc -][^toc]

[^toc]: #table-of-contents