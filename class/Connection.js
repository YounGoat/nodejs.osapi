'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	, events = require('events')
	, querystring = require('querystring')
	, util = require('util')
	
	/* NPM */
	, if2 = require('if2')
	, mifo = require('mifo')
	, overload2 = require('overload2')
	
	/* in-package */
	, OsapiError = require('./OsapiError')
	;

function Connection() {

	// Compatible with Swift style.
	this.createContainer = this.createBucket;
	this.deleteContainer = this.deleteBucket;
	this.findContainers  = this.findBuckets ;
	this.readContainer   = this.readBucket  ;
}

const META_NAME = /^x-([a-z]+)-meta-(.+)$/;
const META_CODES = [
	// S3 style.
	'amz',

	// Swift style.
	// User-defined meta data for object.
	'object', 

	// Swift style.
	// User-defined meta data for container(bucket).
	'container',
];

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

/**
 * Encode URL pathname.
 * @param  {string | string[]}  pathname
 * @param  {object} [query]
 * @return {string}
 */
Connection.prototype._encodeUrl = function(pathname, query) {
	if (typeof pathname == 'string') {
		pathname = pathname.split('/');
	}
	let urlname = pathname.map(encodeURIComponent).join('/');

	if (query) {
		urlname += `?${querystring.stringify(query)}`;
	}
	return urlname;
}

const ERROR_PROPS = {
	code     : /<Code>(.+)<\/Code>/,
	message  : /<Message>(.+)<\/Message>/,
}
/**
 * Generate a standard OsapiError by parsing the response from remote storage service.
 * @param {Object}       options
 * @param {string}       options.action     - what action is being taken when this error happens
 * @param {number[]}     options.expect     - expected status codes
 * @param {Object}       options.meta       - meta data related with the action
 * @param {Object}       options.options    - alias of `options.meta`
 * @param {htp.Response} options.response   - the `htp` response object
 */
Connection.prototype._findError = function(options) {
	let error = null;
	let { action, meta, expect, response } = options;
	if (!meta) meta = options.options;

	if (!expect.includes(response.statusCode)) {

		let res = {
			statusCode: response.statusCode,
			statusMessage: response.statusMessage,		
		};
		
		if (response.headers['content-type'] == 'application/xml') {
			// Why not use `xml2js`?
			// Because `xml2js.parseString()` is asynchronuous.
			let body = response.body;
			for (let name in ERROR_PROPS) {
				if (ERROR_PROPS[name].test(body)) {
					res[name] = RegExp.$1;
				}
			}
		}
		else if (response.headers['content-type'] == 'application/json') {
			let body = response.body;
		}

		error = new OsapiError(action, meta, res);
	}

	return error;
}

const reASCII = /^[\x00-\xFF]*$/;
/**
 * Generate headers.
 * @param  {Object}  ossMeta
 * @param  {string} [ossMeta.acl]
 * @param  {string} [ossMeta.contentType]
 * @param  {string} [ossMeta.etag]
 * @param  {Object} [ossMeta.meta]
 * @return {Object}
 * 
 * Returned object may contains:
 */
Connection.prototype._formatHeaders = function(ossMeta) {
	let H = {};

	if (ossMeta.contentType) {
		H['content-type'] = ossMeta.contentType;
	}

	if (ossMeta.meta) {
		for (let name in ossMeta.meta) {
			let value = ossMeta.meta[name];
			// @tag 20180605.a
			if (!reASCII.test(value)) {
				value = mifo.base64.encode(value);
			}

			// Strictly, in Swift style,
			// `x-object-meta-` and `x-container-meta-`  recommended.
			H[`x-amz-meta-${name}`] = value;
		}
	}
	
	if (ossMeta.acl) {
		H[`x-amz-acl`] = ossMeta.acl;
	}
	
	return H;
};

/**
 * Parse function arguments.
 * @param  {Array}   args
 * @param  {string} [defaultOptionName='name']
 * @return [ options, callback ]
 */
Connection.prototype._parseArguments = function(args, defaultOptionName = 'name') {
	let options, callback;

	if (typeof args[0] == 'function') {
		options  = undefined;
		callback = args[0];
	}
	else {
		options  = args[0];
		callback = args[1];
	}

	if (typeof options == 'string') {
		options = { [ defaultOptionName ] : options };
	}
	else {
		options = Object.assign({}, options);
	}

	// Compatible with both S3 and Swift styles.
	options.bucket    = options.bucket || options.container || this.bucket || this.container;
	options.container = options.bucket;

	return [ options, callback ];
};

/**
 * Parse function argument `options` which is generally the first in arguments.
 * @param  {string | object} options
 * @return {object}
 */
Connection.prototype._parseOptions = function(options) {
	[ options ] = this._parseArguments([ options ]);
	return options;
};

/**
 * Parse headers associated with HTTP response and get infomation about bucket(container).
 * @param  {Object}  headers
 * @return {Object}
 * 
 * Returned object may contains:
 *   . {number} [bytesUsed]
 *   . {number} [objectCount]
 *   . {string} [region]
 *   . {number} [storagePolicy]
 * 
 * Unlike `_parseCommonHeader()`, this method will NOT attach anything to `response`.
 * 
 * @see https://docs.openstack.org/api-ref/object-store/index.html?expanded=show-container-metadata-detail
 */
Connection.prototype._parseBucketHeaders = function(headers) {
	let bucket = {}, H = headers;

	SIZE: {
		// Properties defined in this section are only supported in Swift style.
		// In S3 style, they will be `undefined`.

		let objectCount = H['x-rgw-object-count'] || H['x-container-object-count'];
		if (objectCount) {
			bucket.objectCount = parseInt(objectCount);
		}

		let bytesUsed = H['x-rgw-bytes-used'] || H['x-container-bytes-used'];
		if (bytesUsed) {
			bucket.bytesUsed = parseInt(bytesUsed);
		}
	}

	POLICY: {
		if (H['x-storage-policy']) {
			bucket.storagePolicy = H['x-storage-policy'];
		}
	}

	REGION: {
		// This properties may be `undefined`.
		if (H['x-amz-bucket-region']) {
			bucket.region = H['x-amz-bucket-region'];
		}
	};

	return bucket;
};

/**
 * Parse headers associated with HTTP response and get common information.
 * @param  {Object}  headers
 * @return {Object}
 * 
 * Returned object may contains:
 *   . {string} [etag]
 *   . {string} [contentType]
 *   . {number} [contentLength]
 *   . {Date}   [date]
 *   . {Date}   [lastModified]
 *   . {Object} [meta]
 */
Connection.prototype._parseHeaders = function(headers) {
	const ossMeta = {}, H = headers;

	REQUEST_ID: {
		let transId = null
			|| H[`x-${this.vendorCode}-request-id`] 
			|| H['x-amz-request-id'] 
			|| H['x-trans-id']
			;
		if (transId) {
			// For compatibility, both `transId` and `requestId` are available.
			ossMeta.transId = transId;
			ossMeta.requestId = transId;
		}
	}

	COMMON_HEADER: {
		if (H['content-length']) {
			ossMeta.contentLength = parseInt(H['content-length']);
		}

		if (H['content-type']) {
			ossMeta.contentType = H['content-type'];
		}

		if (H['date']) {
			ossMeta.date = new Date(H['date']);
		}

		if (H['etag']) {
			ossMeta.etag = H['etag'].replace(/(^"|"$)/g, '');
		}
		
		if (H['last-modified']) {
			ossMeta.lastModified = new Date(H['last-modified']);
		}
	}
	
	META: {
		let meta = {}, found = false;
		for (let name in H) {
			if (META_NAME.test(name)) {
				let code = RegExp.$1;
				if (!META_CODES.includes(code)) continue;

				let metaName = RegExp.$2;
				// ATTENTION: Because metadata is transferred via HTTP header, only ASCII characters are valid. We have
				// to encode the non-ASCII character before transferring. So, metadata stored in CEPH storage also may
				// be those encoded. On reading back, we will try decoding the metadata before returning them to you.
				// @tag 20180605.a
				meta[metaName] = if2.string(mifo.base64.decode(H[name]), H[name]);

				found = true;
			}
		}
		if (found) {
			ossMeta.meta = meta;
		}
	}

	return ossMeta;
};

/**
 * Delete a bucket.
 * @param  {Object}           options
 * @param  {string}           options              regard as options.name
 * @param  {string}           options.name         name of bucket
 * @param  {Function}        [callback]
 */
Connection.prototype.deleteBucket = function(options, callback) {
    [ options, callback ] = this._parseArguments(arguments);
	
	return this._action(done => {
		// The slash / at the end is necessary for aws S3 or aliyun OSS.
		// In CPEH, it is not necessary.
        let urlname = this._encodeUrl([options.name, '' /* to add ending slash */]);
        
        this.agent.delete(urlname, (err, response) => {
            err = err || this._findError({
                action : 'BUCKET_DELETE',
                expect : [ 204 ],
				options,
				response,
            });
			done(err, response && response.ossMeta);
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
	[ options, callback ] = this._parseArguments(arguments);
	
	return this._action((done) => {
		let urlname = this._encodeUrl([options.bucket, options.name]);
		// 404 is OK.
		// Don't throw error if the object not found.
		this.agent.delete(urlname, (err, response) => {
			err = err || this._findError({
				action : 'OBJECT_DELETE', 
				expect : [ 204, 404 ],
				options,
				response,
			});
			done(err, response && response.ossMeta);
		});
	}, callback);
};

/**
 * Retrieve an object from remote storage.
 * @param  {Object}           options
 * @param  {string}           options              regard as options.name
 * @param  {string}          [options.name]        name(key) of object
 * @param  {boolean}         [options.suppressNotFoundError=false]
 * @param  {Function}        [callback]
 */
Connection.prototype.readBucket = function(options, callback) {
    [ options, callback ] = this._parseArguments(arguments);
    
    return this._action(done => {
        // The slash / at the end is necessary for aws S3 or aliyun OSS.
        // In CPEH, it is not necessary.
        let urlname = this._encodeUrl([options.name, '']);

        this.agent.head(urlname, (err, response) => {
            err = err || this._findError({
                action : 'BUCKET_HEAD',
				expect : [ 200, 204 ],
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
				let bucket = Object.assign(response.ossMeta, this._parseBucketHeaders(response.headers));
				done(null, bucket);
			}
        });
    }, callback);
};

/**
 * Retrieve meta data of an object from remote storage.
 * @param  {Object}           options
 * @param  {string}           options                 regard as options.name
 * @param  {string}          [options.bucket]         bucket name
 * @param  {string}          [options.name]           name(key) of object
 * @param  {boolean}         [options.suppressNotFoundError=false]
 * @param  {Function}        [callback]
 */
Connection.prototype.readObjectMeta = function(options, callback) {
	[ options, callback ] = this._parseArguments(arguments);
    options.onlyMeta = true;
	return this.readObject(options, callback);
};

// Inherit class EventEmitter in order to invoke methods .emit(), .on(), .once() etc.
util.inherits(Connection, events.EventEmitter);

module.exports = Connection;