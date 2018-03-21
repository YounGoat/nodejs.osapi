#	Class Connection in osapi/swift

##	Constructor

*	Class __Connection__(Object *options*)

*options* may include following properties:
*	__options.endPoint__ *string*
*	__options.subuser__ *string* OPTIONAL
*	__options.username__ *string* OPTIONAL
*	__options.subUsername__ *string* OPTIONAL
*	__options.key__ *string*
*	__options.tempURLKey__ *string* OPTIONAL
*	__options.container__ *string* OPTIONAL

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

##	connect()

*	

##	createContainer()

*	Promise __\<conn\>.createContainer__( string *containerName* )
*	Promise __\<conn\>.createContainer__( object *options* )
*	Connection __\<conn\>.createContainer__( string *containerName*, Function *callback* )
*	Connection __\<conn\>.createContainer__( object *options*, Function *callback* )


##	createObject()

*	Promise __\<conn\>.createObject__( string *objectName*, *content* )
*	Promise __\<conn\>.createObject__( object *options* )
*	Connection __\<conn\>.createObject__( string *objectName*, *content*, Function *callback* )
*	Connection __\<conn\>.createObject__( object *options*, Function *callback* )

##	deleteContainer()

*	Promise __\<conn\>.deleteContainer__( string *containerName* )
*	Promise __\<conn\>.deleteContainer__( object *options* )
*	Connection __\<conn\>.deleteContainer__( string *containerName*, Function *callback* )
*	Connection __\<conn\>.deleteContainer__( object *options*, Function *callback* )

##	deleteObject()

*	Promise __\<conn\>.deleteObject__( string *objectName* )
*	Promise __\<conn\>.deleteObject__( object *options* )
*	Connection __\<conn\>.deleteObject__( string *objectName*, Function *callback* )
*	Connection __\<conn\>.deleteObject__( object *options*, Function *callback* )

##	findContainers()

*	Promise __\<conn\>.findContainers__( object *options* )
*	Connection __\<conn\>.findContainers__(object *options* [, Function *callback* ])

##	findObjects()

*	Promise __\<conn\>.findObjects__( object *options* )
*	Connection __\<conn\>.findObjects__( object *options*, Function *callback* )

##	generateTempUrl()

*	Promise __\<conn\>.generateTempUrl( string *objectName* )
*	Promise __\<conn\>.generateTempUrl( object *options* )
*	Connection __\<conn\>.generateTempUrl( string *objectName*, Function *callback* )
*	Connection __\<conn\>.generateTempUrl( object *options*, Function *callback* )

##	pullObject()

*	stream.Readable __\<conn\>.pullObject__( string *objectName* )
*	stream.Readable __\<conn\>.pullObject__( object *options* )

The returned stream may emit following events:
-	__meta__  
	Along with argument *meta* which contains metadata of the object. 
-	events which a readable stream may emit  
	See [Class: stream.Readable](https://nodejs.org/dist/latest/docs/api/stream.html#stream_class_stream_readable) for details.

##	readObject()

*	Promise __\<conn\>.readObject__( string *objectName* )
*	Promise __\<conn\>.readObject__( object *options* )
*	Connection __\<conn\>.readObject__( string *objectName*, Function *callback* )
*	Connection __\<conn\>.readObject__( object *options*, Function *callback* )
