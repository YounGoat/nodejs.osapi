#	Class Connection (osapi/s3)

##  Table of Contents

* [APIs](#apis)
	* [Constructor](#constructor)
	* [-- basic --](#---basic---)

##  APIs

Please read [Interface Connection](../connection.md) for illustrations of basic methods.

###	Constructor

*	Class __Connection__(Object *options* [, Object *htpSettings*])

*options* may include following properties:
*	__options.endPoint__ *string*  
    Endpoint (URL base) of the object storage service.

*	__options.accessKey__ *string*  
    Access key (something like username to identify the user).

*	__options.secretAccessKey__ *string*  
    Secret access key (something like password).

*	__options.bucket__ *string* OPTIONAL  
    Default bucket (container) name.

*   __options.vendor__ *string* OPTIONAL  
    Vendor who powers the service. It may be:
    *   aliyun
    *   aws
    *   ceph DEFAULT

    See [Compatible Services](../vendors.md) for details.

*	__options.proxy__ *string* OPTIONAL  
	HTTP(S) proxy.  
	Same as __htpSettings.proxy__.

This package depends on `htp`, and the following settings are used by `htp`:
*	__htpSettings.dnsAgent__ *dns-agent* OPTIONAL  
*	__htpSettings.keppAlive__ *boolean* OPTIONAL DEFAULT(`true`) 
*   __htpSettings.rejectUnauthorized__ *boolean* OPTIONAL DEFAULT(`true`)    
    DON'T SET `false` unless you are sure that the endpoint is safe.
*	__htpSettings.proxy__ *string* OPTIONAL

```javascript
const s3 = require('osapi/s3');

let conn = new s3.Connection({
    endPoint        : 'http://storage.example.com/',
    accessKey       : '380289ba59473a368c59',
    secretAccessKey : '380289ba59473a368c593c1f1de6efb0380289ba5',
    bucket          : 'bucketName',
    vendor          : 'ceph',
});
```

### -- basic --

See [Interface Connection](../connection.md) for help info about basic methods.

[- toc -][^toc]

[^toc]: #table-of-contents