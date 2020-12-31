/**
 * References:
 *   https://docs.ceph.com/docs/mimic/radosgw/s3/
 *   http://docs.aws.amazon.com/zh_cn/AmazonS3/latest/dev/RESTAuthentication.html
 */

'use strict';

const MODULE_REQUIRE = 1
    /* built-in */
    , crypto = require('crypto')
    , url = require('url')
    , util = require('util')
    
    /* NPM */
    , xml2js  = require('xml2js')
    , if2 = require('if2')
    , noda = require('noda')
    , SimpleAgent = require('htp/SimpleAgent')
    , mimeUtil = require('idata/mime-util')

    // Jin-nang tools.
    , cloneObject = require('jinang/cloneObject')

    /* in-package */
    , OsapiError = noda.inRequire('class/OsapiError')
    
    /* in-file */
    ;

/**
 * Create a new connection to object storage service.
 * This is virtual connection.
 * @class
 * 
 * @param  {Object}   options 
 * @param  {object}   settings
 *  
 * @param  {string}  [options.vendor="ceph"]  "ceph" | "aliyun" | "aws"
 * @param  {string}   options.endPoint      
 * @param  {string}   options.serviceUrl      alias of "options.endPoint"
 *  
 * @param  {string}  [options.accessKey]
 * @param  {string}  [options.key]            alias of "options.accessKey"
 * @param  {string}  [options.awsAccessKeyId] alias of "options.accessKey"
 * 
 * @param  {string}  [options.secretAccessKey]
 * @param  {string}  [options.awsSecretAccessKey] 
 *                                            alias of "options.secretAccessKey"
 * @param  {string}  [options.secretKey]      alias of "options.secretAccessKey"
 * 
 * @param  {string}  [options.bucket]       
 * @param  {string}  [options.container]      alias of "options.bucket". Bucket is a concept of Amazon S3, it is known as "container" in OpenStack Swift.
 * @param  {boolean} [options.bucketInDomain] 
 * 
 * @param  {boolean} [options.rejectUnauthorized=true]
 */
const Connection = function(options, settings) {
    noda.inRequire('class/Connection').call(this);

    this.style = 's3';

    // Clone and uniform the input options.
    options = cloneObject(options, (key, value) => [ key.toLowerCase(), value ]);

   // HTTP agent settings.
	let defaultHtpSettings = {
		dnsAgent: null,
		keepAlive: true,
		rejectunauthorized: true,
	};
    this.settings = Object.assign(
		defaultHtpSettings, 
		cloneObject(options, [ 'proxy' ]), 
		settings
	);
    
    this.accessKey = if2(
        options.accesskey,
        options.key,
        options.awsaccesskeyid
    );

    this.secretAccessKey = if2(
        options.secretaccesskey, 
        options.awssecretaccesskey,
        options.secretkey
    );

    this.endPoint = if2(
        options.serviceurl,
        options.endpoint
    );
    
    this.vendor = options.vendor || 'ceph';
    this.vendorCode = 'amz';
    if (this.vendor == 'aliyun') {
        this.vendorCode = 'oss';
    }

    let bucketInDomain;
    if (options.hasOwnProperty('bucketindomain')) {
        bucketInDomain = options.bucketindomain;
    }
    else if (this.vendor != 'ceph') {
        bucketInDomain = true;
    }

    this.bucket = if2(options.bucket, options.container);

    let beforeRequest = (req) => {
        /**
         * Reference:
         *   签署和对 REST 请求进行身份验证
         *   http://docs.aws.amazon.com/zh_cn/AmazonS3/latest/dev/RESTAuthentication.html
         *   
         *   AUTHENTICATION AND ACLS
         *   http://docs.ceph.com/docs/kraken/radosgw/s3/authentication/
         */

        let { headers, method, urlname } = req;

        let canonicalizedResource = null;
        ADJUST_HOSTNAME_AND_RESOURCE: {
            let address = url.parse(urlname);
            if (bucketInDomain) {
                let end = address.pathname.indexOf('/', 1);
                let bucket = end == -1 ? address.pathname.slice(1) : address.pathname.slice(1, end);
                let hostname = bucket ? `${bucket}.${address.hostname}` : address.hostname;
                let pathname = address.pathname.slice(1 + bucket.length);
                urlname = url.format({
                    protocol : address.protocol,
                    port     : address.port,
                    search   : address.search,
                    hostname,
                    pathname,                
                });
            }
            canonicalizedResource = address.pathname;
        }

        // Headers are what this function wanna deal with.
        headers = cloneObject(headers, (name, value) => {
            // Ingore those not defined.
            if (value == null || value == undefined) {
                return null;
            }
            
            // Use correspond vendor code in header field name.
            name = name.replace('{VENDOR_CODE}', this.vendorCode);
            return [ name, value ];
        });

        let contentMd5 = headers['content-md5'];
        let contentType = headers['content-type'];
        let date = (new Date).toGMTString();
        let canonicalizedAmzHeaders = '';
        if (headers) {           
            // Following comments starting with sequence number are from "AUTHENTICATION AND ACLS".
            // 1. Get all fields beginning with 'x-amz-'.
            // 2. Ensure these fileds are lowercase.
            // 4. Combine multiple instances of the same field name into a single field and separate the field values with a comma.
            // 5. Replace white space and line breaks in field values with a single space.
            let amzHeaders = cloneObject(headers, /^x-amz-/i, (name, value) => {
                if (value instanceof Array) {
                    value = value.join(',');
                }
                else if (typeof value != 'string') {
                    value += '';
                }
                value = value.replace(/[\s\n]+/g, ' ');
                return [ name.toLowerCase(), value ];
            });

            // 8. Merge the fields back into the header.
            // @TODO
            
            // 3. Sort the fields lexicographically.
            // 6. Remove white space before and after colons.
            // 7. Append a new line after each field.
            let amzHeadersSorted = [];
            Object.keys(amzHeaders).sort().forEach(
                name => amzHeadersSorted.push(`${name}:${amzHeaders[name]}\n`)
            );

            canonicalizedAmzHeaders = amzHeadersSorted.join('');
        }
        
        let stringToSign =
            [ method
            , contentMd5
            , contentType
            , date
            , `${canonicalizedAmzHeaders}${canonicalizedResource}`
            ].join('\n');

        // Generate an HMAC (Hash-based Message Authentication Code) using a SHA-1 hashing algorithm. 
        // See RFC 2104 and HMAC for details.
        let hmac = crypto.createHmac('sha1', this.secretAccessKey);
        hmac.update(stringToSign, 'utf8');
        let signature = hmac.digest('base64');
        
        headers['Date'] = date;
        headers['Authorization'] = `AWS ${this.accessKey}:${signature}`;

        return { headers, urlname };
    };

    let beforeCallback = (err, response) => {
        if (err) throw err;
        response.ossMeta = this._parseHeaders(response.headers);
        return response;
    };

    this.agent = new SimpleAgent({
        endPoint: this.endPoint,
        settings: this.settings,
        beforeRequest,
        beforeCallback,
    });
};

// Inherit class EventEmitter in order to invoke methods .emit(), .on(), .once() etc.
util.inherits(Connection, noda.inRequire('class/Connection'));

/**
 * Copy an object.
 * @param  {Object}           source          
 * @param  {string}           source              regard as the name(key) of object to be copied
 * @param  {Object}          [source.bucket]      container/bucket where the source object located
 * @param  {Object}          [source.name]        name(key) of object to be copied
 * @param  {Object}           target          
 * @param  {string}           target              regard as the name(key) of target object
 * @param  {Object}          [target.bucket]      container/bucket where the target object located
 * @param  {Object}          [target.name]        name(key) of object to be created
 * @param  {Function}        [callback]           function(err, data)
 */
Connection.prototype.copyObject = function(source, target, callback) {
	// ---------------------------
	// Analyse and uniform arguments.

	[ source ] = this._parseArguments([source]);
	[ target ] = this._parseArguments([target]);
    
	if (!source.bucket || !source.name) {
		throw new Error('invalid arguments');
	}
	
	if (!target.bucket || !target.name) {
		throw new Error('invalid arguments');
	}

	return this._action((done) => {
		let urlname = this._encodeUrl([target.bucket, target.name]);
		let headers = {};
		headers['x-amz-copy-source'] = this._encodeUrl([source.bucket, source.name]);
        let body = '';

		this.agent.put(urlname, headers, body, (err, response) => {
			err = err || this._findError({
				action  : 'OBJECT_PUT', 
				meta    : { source, target }, 
				expect  : [ 200 ], 
				response,
			});
			done(err, response.ossMeta);
		});
	}, callback);
};

/**
 * Put a bucket.
 * @param  {Object}           options
 * @param  {string}           options            regard as the name(key) of object to be stored
 * @param  {string}           options.name       name(key) of object to be stored
 * @param  {string}          [options.acl]      
 * 
 * Available `acl`:
 *   . private
 *   . public-read
 *   . public-read-write
 *   . authenticated-read
 */
Connection.prototype.createBucket = function(options, callback) {
    [ options, callback ] = this._parseArguments(arguments);	
    
    return this._action(done => {
        // The slash / at the end is necessary for aws S3 or aliyun OSS.
        // In CPEH, it is not necessary.
        let urlname = this._encodeUrl([options.name, '']);
        let headers = this._formatHeaders(options);        
        let body = '';
        // By far, !ceph means aliyun(oss) or aws(s3).
        // Both of them require the same body.
        if (this.vendor != 'ceph') {
            body = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<CreateBucketConfiguration>',
                '<StorageClass>Standard</StorageClass>',
                '</CreateBucketConfiguration>',
            ].join('');
        }        
        this.agent.put(urlname, headers, body, (err, response) => {
            err = err || this._findError({
                action : 'BUCKET_PUT',
                expect : [ 200, 204 ],
                options,
                response,
            });

            if (err 
                && err.response 
                && err.response.statusCode == 409
                && err.response.code == 'BucketAlreadyExists') {
                err = null;
            }            
            done(err, response && response.ossMeta);
        });
    }, callback);
};

/**
 * Put an object to remote storage.
 * @param  {Object}           options
 * @param  {string}           options               regard as the name(key) of object to be stored
 * @param  {string}           options.name          name(key) of object to be stored
 * @param  {object}          [options.meta]         meta info of the object
 * @param  {string}          [options.metaFlag]     'w' | 'a'
 * @param  {string}          [options.contentType]  content type (MIME value)
 * @param  {string}          [options.acl]          [EXPERIMENTAL] acl of the object
 * @param  {string}          [options.bucket]       container/bucket to place the object, 
 *                                                  by default current container of the connection will be used
 * @param  {string}           content               object content text
 * @param  {stream.Readable}  content               object content stream
 * @param  {Buffer}           content               object content buffer
 * @param  {Function}        [callback]             function(err, data)
 * 
 * This function maybe used to change existing object's meta info.
 * In this case, no content will be put. 
 * However, such ability is not public and only offered interiorly to
 * Connection.prototype.updateObjectMeta(). So, to make things easy,
 * argument `content` SHOULD be passed in explicitly with value `null`.
 */
Connection.prototype.createObject = function(options, content, callback) {
    options = this._parseOptions(options);

    if (!options.contentType) {
        options.contentType = mimeUtil.getType(options.name);
    }

    return this._action(async () => {
		if (options.metaFlag == 'a') {
            let meta = await this.readObjectMeta({
				bucket : options.bucket, 
				name   : options.name,
            });
            options.meta = Object.assign({}, meta.meta, options.meta);
        }
        
        let urlname = this._encodeUrl([options.bucket, options.name]);
        let headers = this._formatHeaders(options);
        
        // By default, use method PUT to create(upload) a new object.
        let method = 'put';

        if (options.metaFlag) {
			/**
			 * @see https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
			 * x-amz-metadata-directive
			 * Valid Values: COPY | REPLACE
			 */

			// Destination is as same as original path.
            headers['x-amz-copy-source'] = urlname;
            headers['x-amz-metadata-directive'] = 'REPLACE';
            content = '';
        }
            
        let response = await this.agent[method](urlname, headers, content);
        let err = this._findError({
            action : `OBJECT_${method.toUpperCase()}`,
            expect : [ 200, 204 ],
            options,
            response,
        });
        if (err) throw err;
		return response.ossMeta;
    }, callback);
};

/**
 * @param  {Object}   [options]
 * @param  {number}   [options.limit]   return top n(limit) buckets
 * @param  {string}   [options.marker]  name of bucket where cursor on
 * @param  {string}   [options.prefix]  preifx of bucket name
 * @param  {Function} [callback]
 * 
 * @resolved {Bucket[]}
 * 
 * Returned array is made up of `Bucket` which may contains following properties:
 *   . name
 *   . created
 */
Connection.prototype.findBuckets = function(options, callback) {
    [ options, callback ] = this._parseArguments(arguments);
    
    return this._action(done => {
        let urlname = this._encodeUrl('/', {
            'limit'   : options.limit,
            'marker'  : options.marker,
            'prefix'  : options.prefix,
        });

        let headers = {};

        /**
         * CEPH server will recognize header `accept: application/json` and response JSON. 
         * However, in some cases, `content-type` in response header is still `application/xml`.
         * This is really confusing.
         * So, give up.
         */
        headers['accept'] = 'application/xml';

		this.agent.get(urlname, headers, (err, response) => {
			err = err || this._findError({
                action : 'SERVICE_GET',
                expect : [ 200 ],
                options,
                response,
            });
            if (err) return done(err);

            xml2js.parseString(response.body, (err, data) => {
                if (err) return done(err);
                let buckets = [];
                data.ListAllMyBucketsResult.Buckets[0].Bucket.forEach(node => {
                    let bucket = {
                        name: node.Name[0],
                        created: new Date(node.CreationDate[0]),
                    };
                    buckets.push(bucket);
                });
                done(null, buckets);
            });
		});
	}, callback);
};

/**
 * Find some objects from remote storage.
 * @param  {Object}           config
 * @param  {string}           config              regarded as config.prefix
 * @param  {string}          [config.container]   container name
 * @param  {char}            [config.delimiter]   path delimiter, READMORE for details
 * @param  {string}          [config.marker]      name of object reached in last time
 * @param  {string}          [config.prefix]      prefix of name(key) of objects
 * @param  {string}          [config.path]        leading path
 * @param  {number}          [config.limit]       maximum number of returned objects.
 *                                                By default, up to 1,000 will be returned. 
 *                                                The maximum value is configurable for server admin.
 * @param  {Function}        [callback]
 * 
 * @resolved {Array}
 * 
 * Returned array is made up of `Object` which may contains following properties:
 *   . name
 *   . last_modified
 *   . hash
 *   . bytes
 */ 
Connection.prototype.findObjects = function(options, callback) {
    [ options, callback ] = this._parseArguments(arguments, 'prefix');    
    
    return this._action(done => {
        // The slash / at the end is necessary for aws S3 or aliyun OSS.
        // In CPEH, it is not necessary.
        let urlname = this._encodeUrl([options.bucket, ''], {
            'delimiter' : options.delimiter,
            'max-keys'  : options.limit,
            'marker'    : options.marker,
            'prefix'    : options.prefix,
        });

        let headers = {};

        /**
         * CEPH server will recognize header `accept: application/json` and response JSON. 
         * However, in some cases, `content-type` in response header is still `application/xml`.
         * This is really confusing.
         * So, give up.
         */
        headers['accept'] = 'application/xml';

        this.agent.get(urlname, (err, response) => {
            err = err || this._findError({
                action : 'BUCKET_GET',
                expect : [ 200 ],
                options,
                response,
            });
            if (err) return done(err);

            xml2js.parseString(response.body, (err, data) => {
                if (err) return done(err);

                let items = [];
                let result = data.ListBucketResult;

                // Sub directories.
                result.CommonPrefixes && result.CommonPrefixes.forEach(node => {
                    let dir = {
                        dirname : node.Prefix[0],
                    };
                    items.push(dir);
                });

                // Files.
                result.Contents && result.Contents.forEach(node => {
                    // Keep the same order as SWIFT does.
                    let object = {
                        name : node.Key[0],
                        etag : node.ETag[0].replace(/"/g, ''),
                        size : parseInt(node.Size[0]),
                        lastModified : new Date(node.LastModified[0]),
                    };
                    items.push(object);
                });

                done(null, items);
            });
		});
	}, callback);
};

Connection.prototype.get = function(name) {
    switch (name.toLowerCase()) {
        case 'style'           : return this.style;
        case 'endpoint'        : return this.endPoint;
        case 'container'       :
        case 'bucket'          : return this.bucket;
        case 'accesskey'       : return this.accessKey;
        case 'secretaccesskey' : return this.secretAccessKey; 
	}
};

// AWS authentication uses signature generated with AWS secret access key, without 
// applying for an auth token before consequential requests like what SWIFT APIs require.
Connection.prototype.isConnected = function() {
    return true;
};

/**
 * Retrieve an object from remote storage.
 * @param  {Object}           options
 * @param  {string}           options              regard as options.name
 * @param  {string}          [options.bucket]      bucket name
 * @param  {string}          [options.name]        name(key) of object
 * @param  {boolean}         [config.onlyMeta=false] 
 * @param  {boolean}         [options.suppressNotFoundError=false]
 * @param  {Function}        [callback]
 */
Connection.prototype.readObject = function(options, callback) {
    [ options, callback ] = this._parseArguments(arguments);
    
    return this._action(done => {
        let urlname = this._encodeUrl([options.bucket, options.name]);
        let method = options.onlyMeta ? 'head' : 'get';
        this.agent[method](urlname, (err, response) => {
            err = err || this._findError({
                action : 'OBJECT_' + method.toUpperCase(),
                expect : [ 200 ],
                options,
                response,
            });

            if (OsapiError.isNotFound(err) && options.suppressNotFoundError) {
                done(null, null);
            }
			else if (err) {
                done(err, response && response.ossMeta);
            }
            else {
                let object = response.ossMeta;
                if (!options.onlyMeta) {
                    object.buffer = response.bodyBuffer;
                }
                done(null, object);
			}
        });
    }, callback);
};

Connection.prototype.toString = function() {
    let data = {};
	[ 'style', 'endpoint', 'bucket', 'accesskey', 'secretaccesskey' ]
		.forEach(name => data[name] = this.get(name));
	return JSON.stringify(data);
};

module.exports = Connection;
