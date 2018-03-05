#	Class Connection in osapi/s3

##	Constructor

*	Class __Connection__(Object *options*)

*options* may include following properties:
*	__options.endPoint__ *string*
*	__options.accessKey__ *string*
*	__options.secretAccessKey__ *string*
*	__options.bucket__ *string* OPTIONAL

```javascript
const s3 = require('osapi/s3');

let conn = new s3.Connection({
    endPoint        : 'http://storage.example.com/',
    accessKey       : '380289ba59473a368c59',
    secretAccessKey : '380289ba59473a368c593c1f1de6efb0380289ba5',
    bucket          : 'bucketName',
});
```

##	createObject()

*	Promise __\<conn\>.createObject__( string *objectName*, *content* )
*	Promise __\<conn\>.createObject__( object *options* )
*	Connection __\<conn\>.createObject__( string *objectName*, *content*, Function *callback* )
*	Connection __\<conn\>.createObject__( object *options*, Function *callback* )

##	deleteObject()

*	Promise __\<conn\>.deleteObject__( string *objectName* )
*	Promise __\<conn\>.deleteObject__( object *options* )
*	Connection __\<conn\>.deleteObject__( string *objectName*, Function *callback* )
*	Connection __\<conn\>.deleteObject__( object *options*, Function *callback* )

##	generateTempUrl()

*	Promise __\<conn\>.generateTempUrl( string *objectName* )
*	Promise __\<conn\>.generateTempUrl( object *options* )
*	Connection __\<conn\>.generateTempUrl( string *objectName*, Function *callback* )
*	Connection __\<conn\>.generateTempUrl( object *options*, Function *callback* )

##	readObject()

*	Promise __\<conn\>.readObject__( string *objectName* )
*	Promise __\<conn\>.readObject__( object *options* )
*	Connection __\<conn\>.readObject__( string *objectName*, Function *callback* )
*	Connection __\<conn\>.readObject__( object *options*, Function *callback* )
