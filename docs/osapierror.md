#	Class OsapiError

When request is refused explicitly by server, an `OsapiError` instance will be thrown. What thrown is also an instance of standard `Error`, and contains some special properties.

E.g.
```javascript
// Here `conn` is an instanceof class `osapi.Connection`.
conn.readObject('/something/not/exist', (err, info) => {
	if (err && err.name == 'OsapiError') {
		console.log(err.response);
		return;
	}
});
```

An `OsapiError` SHOULD contain the following properties:

*	__name__ *string*  
	Always equals to `OsapiError`.

*	__message__ *string*   
	Words briefly describe what happened.

*	__action__ *string* NOT ENUMERABLE  
	Predefined action code in form of `<ENTITY>_<METHOD>`, e.g.
	*	*SERVICE_GET*  
		Related with `findBuckets()`.
	*	*BUCKET_DELETE*  
		Related with `deleteBucket()`.
	*	*BUCKET_HEAD*  
		Related with `readBucket()`.
	*	*BUCKET_GET*  
		Related with `findObjects()`.
	*	*BUCKET_PUT*  
		Related with `createBucket()`.
	*	*OBJECT_DELETE*  
		Related with `deleteObject()`.
	*	*OBJECT_GET*  
		Related with `readObject()` and `pullObject()`.
	*	*OBJECT_PUT*  
		Related with `createObject()`.
	
*	__request__ *object* NOT ENUMERABLE  
	Meta data which made up the request.  
	ATTNETION: It is not an instance of `http.ClientRequest` or the like.

*	__response__ *object* NOT ENUMERABLE  
	Information which is assosicated with the response. Generally includes:
	*	number __response.statusCode__
	*	string __response.statusMessage__
	*	string __response.code__
	*	string __response.message__

	ATTNETION: It is not an instance of `http.IncomingMessage` or the like.