/**
 * References:
 *   http://docs.aws.amazon.com/zh_cn/AmazonS3/latest/dev/RESTAuthentication.html
 */

'use strict';

const MODULE_REQUIRE = 1
    /* built-in */
    , crypto = require('crypto')
    , events = require('events')
    , url = require('url')
    , util = require('util')
    
    /* NPM */
    , htp = require('htp')
    , if2 = require('if2')
    , noda = require('noda')
    , SimpleAgent = require('htp/SimpleAgent')

    // Jin-nang tools.
    , cloneObject = require('jinang/cloneObject')
    , forInObject = require('jinang/forInObject')
	, modifyUrl = require('jinang/modifyUrl')

    /* in-package */
    , setIfHasNot = noda.inRequire('lib/setIfHasNot')
    
    // Customized errors.
    , OptionsAbsentError = noda.inRequire('class/OptionAbsentError')
    ;

/**
 * Create a new connection to Ceph service.
 * This is virtual connection.
 * @class
 * 
 * @param  {Object}  options 
 * 
 * @param  {string}  options.endPoint      
 * @param  {string}  options.serviceUrl    alias of "options.endPoint"
 * 
 * @param  {string} [options.accessKey]
 * @param  {string} [options.key]          alias of "options.accessKey"
 * @param  {string} [options.awsAccessKeyId]      
 *                                         alias of "options.accessKey"
 * 
 * @param  {string} [options.secretAccessKey]
 * @param  {string} [options.awsSecretAccessKey] 
 *                                         alias of "options.secretAccessKey"
 * @param  {string} [options.secretKey]    alias of "options.secretAccessKey"
 * 
 * @param  {string} [options.bucket]       
 * @param  {string} [options.container]    alias of "options.bucket". Bucket is a concept of Amazon S3, it is known as "container" in OpenStack Swift.
 */
const Connection = function(options) {
    // Clone and uniform the input options.
    options = cloneObject(options, (key, value) => [ key.toLowerCase(), value ]);
    
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

        // Headers are what this function wanna deal with.
        let headers = Object.assign({}, req.headers);

        let method = req.method;
        let contentMd5 = req.headers ? req.headers['content-md5'] : '';
        let contentType = req.headers ? req.headers['content-type'] : '';
        let date = (new Date).toGMTString();
        let canonicalizedResource = url.parse(req.url).path;
        let canonicalizedAmzHeaders = '';
        if (req.headers) {
            // Following comments starting with sequence number are from "AUTHENTICATION AND ACLS".
            // 1. Get all fields beginning with 'x-amz-'.
            // 2. Ensure these fileds are lowercase.
            // 4. Combine multiple instances of the same field name into a single field and separate the field values with a comma.
            // 5. Replace white space and line breaks in field values with a single space.
            let amzHeaders = cloneObject(req.headers, /^x-amz-/i, (name, value) => {
                if (value instanceof Array) {
                    value = value.join(',');
                }
                value = value.replace(/[\s\n]+/g, '');
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

        return { headers };
    };

    this.agent = new SimpleAgent({
        endPoint: this.endPoint,
        beforeRequest,
    });
};

// Inherit class EventEmitter in order to invoke methods .emit(), .on(), .once() etc.
util.inherits(Connection, events.EventEmitter);

/**
 * @param  {Function} action
 * @param  {Function} callback
 * 
 * @example 
 *   Connection.prototype.foo = function(..., callback) {
 *     return this._action((done) => {
 *        // ...
 *        done(err, data);
 *     }, callback);
 *   }
 */
Connection.prototype._action = function(action, callback) {
	let RR = (resolve, reject) => {
		let done = (err, data) => {
            err ? reject && reject(err) : resolve && resolve(data);
			callback && callback(err, data);
		};
		let run = () => action(done);

		if (this.isConnected()) {
			run();
		}
		else {
			this.once('connected', run);
			this.once('error', done);
        }
        return this;
	};
	return callback ? RR() : new Promise(RR);
};

Connection.prototype.createBucket = function(options, callback) {
    // ---------------------------
	// Uniform arguments.
	
	if (typeof options == 'string') {
		options = { name: options };
	}
	else {
		options = Object.assign({}, options);
    }
    
    return this._action((done) => {
        let urlname = `/${options.name}`;
        this.agent.put(urlname, (err, response) => {
            if (!err && response.statusCode != 204) {
				err = new Error(`failed to create bucket "${options.name}"`);
			}
			done(err);
        });
    }, callback);
};

/**
 * Put an object to remote storage.
 * @param  {Object}           options
 * @param  {string}           options            regard as the name(key) of object to be stored
 * @param  {string}           options.name       name(key) of object to be stored
 * @param  {object}           options.meta       meta info of the object
 * @param  {string}          [options.bucket]    container/bucket to place the object, 
 *                                               by default current container of the connection will be used
 * @param  {string}           content            object content text
 * @param  {stream.Readable}  content            object content stream
 * @param  {Buffer}           content            object content buffer
 * @param  {Function}        [callback]          function(err, data)
 */
Connection.prototype.createObject = function(options, content, callback) {
    // ---------------------------
	// Uniform arguments.
	
	if (typeof options == 'string') {
		options = { name: options };
	}
	else {
		options = Object.assign({}, options);
    }
    
    if (!options.hasOwnProperty('bucket')) {
		options.bucket = this.bucket;
    }

    return this._action((done) => {
        let urlname = `${options.bucket}/${options.name}`;
        let headers = {};
        
        if (options.contentType) {
            headers['content-type'] = options.contentType;
        }

        if (options.meta) {
            for (let name in options.meta) {
                headers[`x-amz-meta-${name}`] = options.meta[name];
            }
        }

        this.agent.put(urlname, headers, content, (err, response) => {
            if (!err && ![ 200, 204 ].includes(response.statusCode)) {
                err = new Error(`failed to create object "${options.name}" in bucket "${options.bucket}"`);
			}
			done(err);
        });
    }, callback);
};

/**
 * @param  {Object}           options
 * @param  {string}           options              regard as options.name
 * @param  {string}          [options.bucket]      bucket name
 * @param  {string}          [options.name]        name(key) of object
 * @param  {Function}        [callback]
 */
Connection.prototype.deleteObject = function(options, callback) {
    // ---------------------------
	// Uniform arguments.
	
	if (typeof options == 'string') {
		options = { name: options };
	}
	else {
		options = Object.assign({}, options);
	}
	
	// Use property of current connection as default.
    setIfHasNot(options, 'bucket', this.bucket);
    
    return this._action((done) => {
		let urlname = `${options.bucket}/${options.name}`;
		this.agent.delete(urlname, (err, response) => {
            if (!err && response.statusCode != 204) {
				err = new Error(`failed to delete object "${options.name}" from bucket "${options.bucket}"`);
			}
			done(err);
		});
	}, callback);
};

Connection.prototype.findBuckets = function(options, callback) {
    // ---------------------------
    // Uniform arguments.
    
    if (typeof arguments[0] == 'function') {
		options = {};
		callback = arguments[0];
    }
    
    return this._action((done) => {
		let urlname = '/';
		this.agent.get(urlname, { 'accept': 'application/json' }, (err, response) => {
			if (err) return done(err);
			
			// ...
			done(null, response.body);
		});
	}, callback);
};

// @TODO depend on xml2json package
// /**
//  * Find some objects from remote storage.
//  * @param  {Object}           options
//  * @param  {string}           options              regarded as options.prefix
//  * @param  {string}          [options.bucket]      bucket name
//  * @param  {char}            [options.delimiter]   path delimiter, READMORE for details
//  * @param  {string}          [options.prefix]      prefix of name(key) of objects
//  * @param  {number}          [options.max-keys]    maximum number of returned objects.
//  *
//  */
// Connection.prototype.findObjects = function(options, callback) {
//     // ---------------------------
// 	// Uniform arguments.

//     if (typeof arguments[0] == 'function') {
//         callback = arguments[0];
//         options = {};
//     }
//     else if (typeof options == 'string') {
// 		options = { prefix: options };
//     }
//     else {
// 		options = Object.assign({}, options);
//     }

//     // Use property of current connection as default.
// 	setIfHasNot(options, 'bucket', this.bucket);
    
//     return this._action((done) => {
//         let urlname = modifyUrl.query(`${options.bucket}`, cloneObject(options, [ 'delimiter', 'max-keys', 'prefix' ]));
//         this.agent.get(urlname, (err, response) => {
//             if (err) return done(err);			
// 			// ...
// 			done(null, response.body);
// 		});
// 	}, callback);
// };

Connection.prototype.get = function(name) {
    switch (name.toLowerCase()) {
        case 'style'           : return 's3';
		case 'endpoint'        : return this.endPoint;
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
 * @param  {Function}        [callback]
 */
Connection.prototype.readObject = function(options, callback) {
    // ---------------------------
	// Uniform arguments.
	
	if (typeof options == 'string') {
		options = { name: options };
	}
	else {
		options = Object.assign({}, options);
    }
    
    setIfHasNot(options, 'bucket', this.bucket);
    
    return this._action((done) => {
        let urlname = `${options.bucket}/${options.name}`;
        this.agent.get(urlname, (err, response) => {
            let data = null;
			if (!err) {
				if (response.statusCode == '404') {
					err = new Error('object not found');
				}
				else {
                    let meta = cloneObject(response.headers, /^x-amz-meta-/i, (name, value) => {
                        return [ name.substr('x-amz-meta-'.length), value ];
                    });

					data = {
                        meta,
						contentType: response.headers['content-type'],
						buffer: response.bodyBuffer,
					};
				}
			}
			done(err, data);
        });
    }, callback);
};

Connection.prototype.toString = function() {
    let data = {};
	[ 'style', 'endpoint', 'bucket', 'accesskey', 'secretaccesskey' ]
		.forEach(name => data[name] = this.get(name));
	return JSON.stringify(data);
};

module.exports = {
    Connection,
};