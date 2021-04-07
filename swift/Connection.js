/**
 * osapi/swift offers interfaces which are compitable with OpenStack Swift (OpenStack Object Storage).
 * For more details, please see
 * 
 *   OpenStack Documentation, Object Storage API Reference 2.15.2
 *   https://developer.openstack.org/api-ref-objectstorage-v1.html
 *   https://developer.openstack.org/api-ref/object-store/index.html
 * 
 *   OpenStack API Documentation
 *   https://developer.openstack.org/api-guide/quick-start/api-quick-start.html
 *   
 *   CEPH OBJECT GATEWAY SWIFT API
 *   http://docs.ceph.com/docs/master/radosgw/swift/
 *
 * @author youngoat@163.com
 */

/**
 * -- COMMON RULES --
 * All methods named as "find*", "create*", "put*" or "delete*" are asynchronous. When 
 * callback provided, the method will return undefined. If no callback provided, 
 * the method will return an instance of Promise.
 */

'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	, crypto = require('crypto')
	, querystring = require('querystring')
	, stream = require('stream')
	, util = require('util')

	/* NPM */
	, htp = require('htp')
	, if2 = require('if2')
	, noda = require('noda')
	, overload2 = require('overload2')
	, SimpleAgent = require('htp/SimpleAgent')
	, mimeUtil = require('idata/mime-util')
	
	// Jin-nang tools.
	, cloneObject = require('jinang/cloneObject')
	, modifyUrl = require('jinang/modifyUrl')
	, parseOptions = require('jinang/parseOptions')
	, PoC = require('jinang/PoC')
		
	/* in-package */
	, Receiver = noda.inRequire('class/Receiver')
	
	// Customized errors.
	, OsapiError = noda.inRequire('class/OsapiError')
	, OptionsAbsentError = noda.inRequire('class/OptionAbsentError')

	/* in-file */
	, TypeContent = overload2.Type.or('object', 'string', Buffer, stream.Readable)
	;

/**
 * Create a new connection to Ceph service.
 * Actually, we will request a new token, rather than to build a chanel between the client and the server.
 * @class
 * 
 * @param  {object}  options 
 * @param  {object}  settings
 * 
 * @param  {string}  options.endPoint     
 * @param  {string}  options.url           alias of "options.endPoint"
 * 
 * @param  {string} [options.username]
 * @param  {string} [options.subusername]
 * @param  {string} [options.subuser]      alias of "options.username:options.subusername"
 * 
 * @param  {string} [options.key]
 * @param  {string} [options.password]     alias of "options.key"
 * 
 * @param  {string} [options.container]    
 * @param  {string} [options.bucket]       alias of "options.container". Bucket is a concept of Amazon S3, it is known as "container" in OpenStack Swift.
 * 
 * @param  {dns-agent} [settings.dnsAgent]
 * @param  {boolean}   [settings.keepAlive]
 */
const Connection = function(options, settings) {	
	noda.inRequire('class/Connection').call(this);
	
	this.style = 'swift';

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

	this.container = if2(options.container, options.bucket);
	this.tempURLKey = options.tempurlkey;
	
	this.authToken = null;
	this.storageUrl = null;
	this.storageToken = null;
	this.agent = null;

	// subuser
	// username & subUsername
	var subuser = null;
	if (options.subuser) {
		subuser = options.subuser;
	}
	else if (options.username && options.subusername) {
		subuser = `${options.username}:${options.subusername}`;
	}
	if (!subuser) {
		throw new OptionsAbsentError('subuser', ['username,', 'subusername']);
	}
	this.subuser = subuser;
	[ this.username, this.subUsername ] = subuser.split(':');

	// key
	this.key = options.key;
	if (!this.key) {
		throw new OptionsAbsentError('key');
	}

	// endpoint
	this.endPoint = if2(options.endpoint, options.url);
	if (!this.endPoint) {
		throw new OptionsAbsentError('endPoint');
	}
	
	if (1) {
		this.connect();
	}
	
	this.setMaxListeners(100000);
};

util.inherits(Connection, noda.inRequire('class/Connection'));

Connection.prototype.connect = function(callback) { return PoC(done => {
	// ---------------------------
	// Authentication.
	// @see http://docs.ceph.com/docs/master/radosgw/swift/auth/

	let authurl = modifyUrl.pathname(this.endPoint, '/auth/1.0');
	
	let headers = {
		'X-Auth-User' : this.subuser,
		'X-Auth-Key'  : this.key,
	};

	htp(this.settings).get(authurl, headers, (err, res) => {
		err = err || this._findError({ 
			action   : 'AUTH', 
			expect   : [ 204 ], 
			response : res,
		});
		if (err) {
			this.emit('error', err);
			done(err);
			return;
		}

		// Optional.
		this.authToken = res.headers['x-auth-token'];

		// The URL and {api version}/{account} path for the user.
		// @see http://docs.ceph.com/docs/master/radosgw/swift/auth/
		this.storageUrl = res.headers['x-storage-url'];

		// The authorization token for the X-Auth-User specified in the request.
		// @see http://docs.ceph.com/docs/master/radosgw/swift/auth/
		this.storageToken = res.headers['x-storage-token'];

		let beforeCallback = (err, response) => {
			if (err) throw err;
			response.ossMeta = this._parseHeaders(response.headers);
			return response;
		};

		let agentOptions = {
			endPoint: this.storageUrl,

			// Query "format" is prior to header "Accept".
			// query: 'format=json',

			headers: { 
				'X-Auth-Token': this.storageToken,

				// Header "Accept" is inferior to query "format".
				'Accept': 'application/json',
			},

			beforeCallback,
			settings: this.settings,
		};
		
		this.agent = new SimpleAgent(agentOptions);
		
		CREATE_PIPING_ANGET: {
			let settings = Object.assign({}, this.settings, { piping : true,  pipingOnly : true });
			let pipingAgentOptions = Object.assign({}, agentOptions, { settings });
			this.pipingAgent = new SimpleAgent(pipingAgentOptions);
		}		

		this.emit('connected');
		done(null);
	});	
}, callback); };

/**
 * Copy an object.
 * @param  {Object}           source          
 * @param  {string}           source              regard as the name(key) of object to be copied
 * @param  {Object}          [source.container]   container/bucket where the source object located
 * @param  {Object}          [source.name]        name(key) of object to be copied
 * @param  {Object}           target          
 * @param  {string}           target              regard as the name(key) of target object
 * @param  {Object}          [target.container]   container/bucket where the target object located
 * @param  {Object}          [target.name]        name(key) of object to be created
 * @param  {Function}        [callback]           function(err, data)
 */
Connection.prototype.copyObject = function(source, target, callback) {
	// ---------------------------
	// Analyse and uniform arguments.

	[ source ] = this._parseArguments([source]);
	[ target ] = this._parseArguments([target]);

	if (!source.container || !source.name) {
		throw new Error('invalid arguments');
	}
	
	if (!target.container || !target.name) {
		throw new Error('invalid arguments');
	}

	return this._action((done) => {
		let urlname = this._encodeUrl([source.container, source.name]);

		let headers = {};
		headers['Destination'] = this._encodeUrl([target.container, target.name]);
		
		this.agent.copy(urlname, headers, (err, response) => {
			err = err || this._findError({
				action  : 'OBJECT_COPY', 
				meta    : { source, target }, 
				expect  : [ 201 ], 
				response,
			});
			done(err, response && response.ossMeta);
		});
	}, callback);
};

/**
 * Create new container(bucket) on remote storage.
 * @param  {Object}           options
 * @param  {string}           options            regard as the name(key) of object to be stored
 * @param  {string}           options.name       name(key) of object to be stored
 * @param  {Object}          [options.meta]      meta data of object to be stored
 * @param  {Function}        [callback]          function(err, data)
 */
Connection.prototype.createBucket = function(options, callback) {
	[ options, callback ] = this._parseArguments(arguments);

	return this._action((done) => {
		let urlname = this._encodeUrl(options.name);
		let headers = this._formatHeaders(options);
		let body = '';
		this.agent.put(urlname, headers, body, (err, response) => {
			err = err || this._findError({
				action : 'BUCKET_CREATE', 
				expect :[ 201, 202 ],
				options,
				response,
			});
			done(err, response && response.ossMeta);
		});
	}, callback);
}

/**
 * Put an object to remote storage.
 * @param  {Object}           options
 * @param  {string}           options                 regard as the name(key) of object to be stored
 * @param  {string}           options.name            name(key) of object to be stored
 * @param  {string}          [options.contentType]    content type (MIME value)
 * @param  {Object}          [options.meta]           meta data of object to be stored
 * @param  {string}          [options.metaFlag]       if set, only update meta data without replacing object content
 * @param  {boolean}         [options.suppressNotFoundError]
 * @param  {boolean}         [options.suppressBadRequestError]
 * @param  {string}          [options.container]      container/bucket to place the object, 
 *                                                    by default current container of the connection will be used
 * @param  {string}          [content]                object content text
 * @param  {stream.Readable} [content]                object content stream
 * @param  {Buffer}          [content]                object content buffer
 * @param  {Function}        [callback]               function(err, data)
 */
Connection.prototype.createObject = function(options, content, callback) {
	// ---------------------------
	// Analyse and uniform arguments.

	let args = new overload2.ParamList(
		/* options */
		overload2.Type.or('object', 'string'),

		/* content */
		[ TypeContent, 'NULL', 'UNDEFINED', overload2.absent('') ],

		/* callback */
		[ Function, 'ABSENT' ]
	).parse(arguments);

	if (!args) {
		throw new Error('invalid arguments');
		}
	else {
		[ options, content, callback ] = args;

		if (typeof content == 'undefined' || content == null) {
			content = '';
		}

		options = this._parseOptions(options);
	}

	return this._action((done) => {
		let urlname = this._encodeUrl([options.container, options.name]);

		let headers = this._formatHeaders(options);

		// By default, use method PUT to create(upload) a new object.
		let method = 'put';

		// To rewrite metadata of an existing object.
		// The old metadata will be deleted.
		if (options.metaFlag == 'w') {
			method = 'post';
		}

		// To append metadata of an existing object.
		else if (options.metaFlag == 'a') {
			method = 'copy';
			// Destination is as same as original path.
			headers['Destination'] = urlname;
		}

		else if (!options.contentType) {
			options.contentType = mimeUtil.getType(options.name);
		}

		let callback2 = (err, response) => {
			err = err || this._findError({
				action : 'OBJECT_' + method.toUpperCase(), 
				expect : [ 201 /* Created, PUT */,  202 /* Accept, POST */ ],
				options,
				response,
			});			
			
			if (0) {
				// DO NOTHING.
			}
			else if (OsapiError.isNotFound(err) && options.suppressNotFoundError) {
				done(null, response.ossMeta);
			}
			else if (OsapiError.isBadRequest(err) && options.suppressBadRequestError) {
				done(null, response.ossMeta);
			}			
			else {
				done(err, response && response.ossMeta);
			}
		};

		// Fix the bug that htp forbidden method COPY with payload.
		if (method == 'copy') {
			this.agent[method](urlname, headers, callback2);
		}
		else {
			this.agent[method](urlname, headers, content, callback2);
		}
	}, callback);
};

/**
 * Update the meta data of an object.
 * @param {Object}    options
 * @param {string}    options         regarded as name of object
 * @param {string}    options.name    name(key) of object to be stored
 * @param {boolean}  [options.suppressNotFoundError]
 * @param {boolean}  [options.suppressBadRequestError]
 * @param {Object}   [meta]           meta data
 * @param {string}   [metaFlag='w']   'a' = append, 'w' = write
 * @param {Function} [callback]
 */
Connection.prototype.createObjectMeta = function(options, meta, metaFlag, callback) {
	let args = new overload2.ParamList(
		/* options */
		overload2.Type.or('object', 'string'),

		/* meta */
		'object NULL ABSENT',
		
		/* metaFlag */
		[ overload2.enum('a', 'w'), overload2.absent('w') ],

		/* callback */
		[ Function, 'ABSENT' ]
	).parse(arguments);

	if (!args) {
		throw new Error('invalid arguments');
	}
	else {
		[ options, meta, metaFlag, callback ] = args;
		options = this._parseOptions(options);
		Object.assign(options, { meta, metaFlag });
		return this.createObject(options, callback);
	}
};

/**
 * @param  {Object}   [options]
 * @param  {number}   [options.limit]   return top n(limit) containers
 * @param  {string}   [options.marker]  name of container where cursor on
 * @param  {string}   [options.prefix]  preifx of container name
 * @param  {Function} [callback]
 * 
 * @resolve {Array}
 * 
 * Returned array is made up of `Bucket` which may contains following properties:
 *   . bytesUsed 
 *   . lastModified
 *   . name
 *   . objectCount
 */
Connection.prototype.findBuckets = function(options, callback) {
	[ options, callback ] = this._parseArguments(arguments, 'prefix');

	return this._action((done) => {
		let urlname = this._encodeUrl('/',  {
            'limit'   : options.limit,
            'marker'  : options.marker,
            'prefix'  : options.prefix,
		});
		
		this.agent.get(urlname, (err, response) => {
			err = err || this._findError({
				action : 'SERVICE_GET', 
				expect : [ 200 ],
				options,
                response,
			});
			if (err) return done(err, response && response.ossMeta);

			let data = response.body.map(raw => {
				let container = {};
				
				// Name.
				container.name = raw.name;

				// Object count.
				if (raw.count) {
					container.objectCount = raw.count;
				}

				// Bytes used.
				if (raw.bytes) {
					container.bytesUsed = raw.bytes;
				}

				// Last modified.
				if (raw.last_modified) {
					container.lastModified = new Date(raw.last_modified);''
				}

				return container;
			});
			done(null, data);
		});
	}, callback);
};

/**
 * Find some objects from remote storage.
 * @param  {Object}           options
 * @param  {string}           options              regarded as options.prefix
 * @param  {string}          [options.container]   container name
 * @param  {char}            [options.delimiter]   path delimiter, READMORE for details
 * @param  {string}          [options.marker]      name of object reached in last time
 * @param  {string}          [options.prefix]      prefix of name(key) of objects
 * @param  {string}          [options.path]        leading path
 * @param  {number}          [options.limit]       maximum number of returned objects.
 *                                                By default, up to 10,000 will be returned. 
 *                                                The maximum value is configurable for server admin.
 * @param  {Function}        [callback]
 * 
 * @resolved {Array[]}
 * 
 * Returned array is made up of `Object` which may contains following properties:
 *   . name
 *   . last_modified
 *   . hash
 *   . bytes
 * 
 * -- READMORE：path and delimiter --
 * name(key) of objects are also regarded as path. And options.delimiter is 
 * used to suppose path delimiter as we are fimilar with path.
 * 
 * Suppose that following object names(keys) exist,
 *   [1] foo
 *   [2] foo/bar/0
 *   [3] foo/bar/1
 * When options.delimiter absent, all objects matched.
 * When options.delimiter set to '/', it will return
 *   { name: 'foo' }
 *   { dirname: 'foo/' }
 * 
 * ATTENTIONS: 	 `path` and `delimiter` are mutually exclusive.
 * 
 * -- READMORE: path vs. prefix --
 * Suppose that following object names(keys) exist,
 *   [1] foo/bar/0
 *   [2] foo/quz/1
 * options.path "foo/bar" matches [1]
 * options.path "foo" matches [1][2]
 * options.path "fo" matches NONE
 * options.prefix "fo" matches [1][2]
 * 
 * -- READMORE: should name prefixed with / ? --
 * 
 */
Connection.prototype.findObjects = function(options, callback) {
	[ options, callback ] = this._parseArguments(arguments, 'prefix');
	
	return this._action((done) => {
		let query = cloneObject(options, [ 'delimiter', 'limit', 'path', 'prefix', 'marker' ]);
		let urlname = this._encodeUrl(options.container, query);
		this.agent.get(urlname, (err, response) => {
			err = err || this._findError({
				action : 'BUCKET_GET', 
				expect : [ 200, 204 ],
				options, 
				response,
			});			
			if (err) return done(err, response && response.ossMeta);

			let data = response.body.map(item => {
				if (item.subdir) {
					return {
						dirname : item.subdir,
					};
				}
				else {
					return {
						name : item.name,
						etag : item.hash,
						size : item.bytes,
						lastModified : new Date(item.last_modified),
					};
				}
			});
			done(null, data);
		});
	}, callback);
};

/**
 * @param  {Object}           options
 * @param  {string}           options           regard as the name(key) of object to be stored
 * @param  {string}           options.name      name(key) of object to be stored
 * @param  {number}           options.ttl       time to live (in seconds)
 * @param  {string}           options.container container/bucket to place the object
 * @return {string}
 * 
 * -- REFERENCES --
 * https://docs.openstack.org/kilo/options-reference/content/object-storage-tempurl.html
 */
Connection.prototype.generateTempUrl = function(options, callback) {
	// ---------------------------
	// Uniform arguments.

	options = this._parseOptions(options);
	options = Object.assign({	
		// Default ttl is 24 hours.
		ttl: 86400,
	}, options);

	return this._action((done) => {
		let urlname = this.storageUrl + '/' + this._encodeUrl([options.container, options.name]);
		let temp_url_expires = parseInt(Date.now() / 1000) + options.ttl;
		let temp_url_sig;
	
		// Genereate temp_url_sig.
		TEMP_URL_SIG: {
			let method = 'GET';
			let pathname = '/v1/' + this._encodeUrl([options.container, options.name]);
			let body = [ method, temp_url_expires, pathname ].join('\n');

			// Generate an HMAC (Hash-based Message Authentication Code) using a SHA-1 hashing algorithm. 
			// See RFC 2104 and HMAC for details.
			let hmac = crypto.createHmac('sha1', this.tempURLKey);
			hmac.update(body, 'utf8');
			temp_url_sig = hmac.digest('hex');
		}
		
		let temp_url = `${urlname}?${querystring.stringify({ temp_url_sig, temp_url_expires })}`;
		done(null, temp_url);
	}, callback);
};

Connection.prototype.get = function(name) {
	switch (name.toLowerCase()) {
		case 'bucket'      : 
		case 'container'   : return this.container;
		case 'endpoint'    : return this.endPoint;
		case 'style'       : return 'swift';
		case 'subuser'     : return this.subuser;
		case 'subusername' : return this.subUsername;
		case 'username'    : return this.username;
	}
};

/**
 * To learn whether connection created successfully.
 * @return {boolean} true if connected
 */
Connection.prototype.isConnected = function() {
	return !!this.authToken;
};

/**
 * Retrieve an object from remote storage.
 * @param  {Object}           options
 * @param  {string}           options                 regard as options.name
 * @param  {string}          [options.container]      container name
 * @param  {string}          [options.name]           name(key) of object
 * @param  {boolean}         [options.onlyMeta=false] 
 * @param  {boolean}         [options.suppressNotFoundError=false]
 * @param  {boolean}         [options.suppressBadRequestError=false]
 * @param  {Function}        [callback]
 */
Connection.prototype.readObject = function(options, callback) {
	[ options, callback ] = this._parseArguments(arguments);
		
	return this._action((done) => {
		let urlname = this._encodeUrl([options.container, options.name]);
		let method = options.onlyMeta ? 'head' : 'get';
		this.agent[method](urlname, (err, response) => {
			err = err || this._findError({
				action : 'OBJECT_' + method.toUpperCase(), 
				expect : [ 200 ],
				options,
				response,
			});

			if (0) {
				// DO NOTHING.
			}
			else if (OsapiError.isNotFound(err) && options.suppressNotFoundError) {
				done(null, null);
			}
			else if (OsapiError.isBadRequest(err) && options.suppressBadRequestError) {
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

/**
 * Retrieve an object from remote storage.
 * @param  {Object}           options
 * @param  {string}           options              regard as options.name
 * @param  {string}          [options.container]   container name
 * @param  {string}          [options.name]        name(key) of object
 * @param  {Function}        [callback]
 * @return {stream.Readable}
 */
Connection.prototype.pullObject = function(options, callback) {
	[ options, callback ] = this._parseArguments(arguments);
	
	let urlname = this._encodeUrl([options.container, options.name]);
	let output = new Receiver();
	let onCall = (err, meta) => {
		if (err) {
			output.emit('error', err);
		}
		callback && callback(err, meta);
	};

	let meta = null;
	this._action((done) => {
		this.pipingAgent.get(urlname)
			.on('error', done)
			.on('response', (response) => {
				let err = this._findError({
					action : 'OBJECT_GET',
					expect : [ 200 ],
					options,
					response,
				});
				if (err) {
					done(err);
				}
				else {
					meta = this._parseHeaders(response.headers);
					output.emit('meta', meta);
				}
			})
			.on('end', () => {
				done(null, meta);
			})
			.pipe(output)
			;
	}, onCall);
	return output;
};

Connection.prototype.toString = function() {
	let data = {};
	[ 'style', 'subuser', 'endpoint', 'container', 'key', 'tempurlkey' ]
		.forEach(name => data[name] = this.get(name));
	return JSON.stringify(data);
};

module.exports = Connection;
