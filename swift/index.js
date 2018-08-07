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
	, events = require('events')
	, querystring = require('querystring')
	, stream = require('stream')
	, url = require('url')
	, util = require('util')

	/* NPM */
	, htp = require('htp')
	, if2 = require('if2')
	, mifo = require('mifo')
	, noda = require('noda')
	, overload2 = require('overload2')
	, SimpleAgent = require('htp/SimpleAgent')
	
	// Jin-nang tools.
	, cloneObject = require('jinang/cloneObject')
	, forInObject = require('jinang/forInObject')
	, modifyUrl = require('jinang/modifyUrl')
	, parseOptions = require('jinang/parseOptions')
	, PoC = require('jinang/PoC')
		
	/* in-package */
	, Receiver = noda.inRequire('lib/Receiver')
	, setIfHasNot = noda.inRequire('lib/setIfHasNot')
	
	// Customized errors.
	, RequestRefusedError = noda.inRequire('class/RequestRefusedError')
	, OptionsAbsentError = noda.inRequire('class/OptionAbsentError')

	/* in-file */
	, reASCII = /^[\x00-\xFF]*$/

	, TypeContent = overload2.Type.or('object', 'string', Buffer, stream.Readable)

	, encodeObjectName = (name) => {
		return name.split('/').map(encodeURIComponent).join('/');
	}

	, encodeAndAppendQuery = (urlname, config, queryNames) => {
		urlname = urlname.split('/').map(encodeURIComponent).join('/');

		if (config) {
			let queries = queryNames ? cloneObject(config, queryNames) : config;
			let query = querystring.stringify(queries);
			if (query) {
				urlname += `?${query}`;
			}
		}

		return urlname;
	}
	
	// Retrieve object meta information from response.
	, parseObjectMeta = (response) => {
		let meta;
		
		let def = {
			caseSensitive: false,
			keepNameCase: true,
			explicit: true,
			columns: [
				'contentType alias(content-type)',
				'etag',
				{ name: 'contentLength', alias: 'content-length', parser: parseInt },
				{ name: 'lastModified', alias: 'last-modified', parser: t => new Date(t) },
			],
		};
		meta = parseOptions(response.headers, def);
		
		let submeta = {}, found = false, metaPrefix = 'x-object-meta-';
		for (let name in response.headers) {
			if (name.toLowerCase().startsWith(metaPrefix)) {
				found = true;
				let value = response.headers[name];

				// ATTENTION: Because metadata is transferred via HTTP header, only ASCII characters are valid. We have
				// to encode the non-ASCII character before transferring. So, metadata stored in CEPH storage also may
				// be those encoded. On reading back, we will try decoding the metadata before returning them to you.
				// @tag 20180605.a
				submeta[name.slice(metaPrefix.length)] = if2.string(mifo.base64.decode(value), value);
			}
		}
		if (found) meta.meta = submeta;
		
		return meta;
	}
	
	, parseContainerMeta = (response) => {
		let meta;
		
		let def = {
			caseSensitive: false,
			keepNameCase: true,
			explicit: true,
			columns: [
				// 'contentType alias(content-type)',
				// { name: 'contentLength', alias: 'content-length', parser: parseInt },
				// { name: 'lastModified', alias: 'last-modified', parser: t => new Date(t) },
			],
		};
		meta = parseOptions(response.headers, def);
		
		let submeta = {}, found = false, metaPrefix = 'x-container-', customMetaPrefix = 'x-container-meta-';
		forInObject(response.headers, (key, value) => {
			let key_lc = key.toLowerCase();
			if (key_lc.startsWith(customMetaPrefix)) {
				found = true;
				// @tag 20180605.a
				submeta[key.slice(customMetaPrefix.length)] = if2.string(mifo.base64.decode(value), value);
			}
			else if (key_lc.startsWith(metaPrefix)) {
				meta[key.slice(metaPrefix.length)] = value;
			}
		});
		if (found) meta.meta = submeta;
		return meta;
	}

	, encodeName = (name) => encodeURIComponent(name)
	;

/**
 * Create a new connection to Ceph service.
 * Actually, we will request a new token, rather than to build a chanel between the client and the server.
 * @class
 * 
 * @param  {object}  config 
 * @param  {object}  settings
 * 
 * @param  {string}  config.endPoint     
 * @param  {string}  config.url           alias of "config.endPoint"
 * 
 * @param  {string} [config.username]
 * @param  {string} [config.subusername]
 * @param  {string} [config.subuser]      alias of "config.username:config.subusername"
 * 
 * @param  {string} [config.key]
 * @param  {string} [config.password]     alias of "config.key"
 * 
 * @param  {string} [config.container]    
 * @param  {string} [config.bucket]       alias of "config.container". Bucket is a concept of Amazon S3, it is known as "container" in OpenStack Swift.
 * 
 * @param  {dns-agent} [settings.dnsAgent]
 * @param  {boolean}   [settings.keepAlive]
 */
const Connection = function(config, settings) {
	// Clone and uniform the input config.
	config = cloneObject(config, (key, value) => [ key.toLowerCase(), value ]);

	this.settings = Object.assign({
		dnsAgent: null,
		keepAlive: true,
	}, settings);

	this.container = if2(config.container, config.bucket);
	this.tempURLKey = config.tempurlkey;
	
	this.authToken = null;
	this.storageUrl = null;
	this.storageToken = null;
	this.agent = null;

	// subuser
	// username & subUsername
	var subuser = null;
	if (config.subuser) {
		subuser = config.subuser;
	}
	else if (config.username && config.subusername) {
		subuser = `${config.username}:${config.subusername}`;
	}
	if (!subuser) {
		throw new OptionsAbsentError('subuser', ['username,', 'subusername']);
	}
	this.subuser = subuser;
	[ this.username, this.subUsername ] = subuser.split(':');

	// key
	this.key = config.key;
	if (!this.key) {
		throw new OptionsAbsentError('key');
	}

	// endpoint
	this.endPoint = if2(config.endpoint, config.url);
	if (!this.endPoint) {
		throw new OptionsAbsentError('endPoint');
	}
	
	if (1) {
		this.connect();
	}
	
	this.setMaxListeners(100000);
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

/**
 * Generate a standard RequestRefusedError by parsing the response from remote storage service.
 * @param {Object}       config
 * @param {string}       config.action
 * @param {Object}       config.meta
 * @param {number[]}     config.expect expected status codes
 * @param {htp.Response} config.response
 */
Connection.prototype._parseResponseError = function(action, meta, expect, response) {
	if (expect.includes(response.statusCode)) {
		return null;
	}
	else {
		let code = response.body && response.body.Code;
		let res = {
			statusCode: response.statusCode,
			statusMessage: response.statusMessage,
			code,
		};
		let err = new RequestRefusedError(action, meta, res);
		return err;
	}
};

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
		err = err || this._parseResponseError('AUTH', null, [ 204 ], res);
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

		let agentOptions = {
			endPoint: this.storageUrl,

			// Query "format" is prior to header "Accept".
			// query: 'format=json',

			headers: { 
				'X-Auth-Token': this.storageToken,

				// Header "Accept" is inferior to query "format".
				'Accept': 'application/json',
			},

			settings: this.settings,
		};

		let pipingAgentOptions = Object.assign({}, agentOptions, { 
			settings: Object.assign({} , this.settings, { piping : true,  pipingOnly : true }),
		});

		this.agent = new SimpleAgent(agentOptions);
		this.pipingAgent = new SimpleAgent(pipingAgentOptions);

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

	if (typeof source == 'string') {
		source = { 
			container: this.container,
			name: source,
		};
	}

	if (typeof target == 'string') {
		target = {
			container: source.container,
			name: target,
		};
	}

	if (!source.container) {
		throw new Error('invalid arguments');
	}

	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${source.container}/${source.name}`);

		let headers = {};
		headers['Destination'] = `${target.container}/${encodeObjectName(target.name)}`;

		this.agent.copy(urlname, headers, (err, response) => {
			err = err || this._parseResponseError('OBJECT_COPY', { source, target }, [ 201 ], response);
			if (err) {
				done(err, null);
			}
			else {
				done(null, {
					transId: response.headers['x-trans-id'],
					etag: response.headers['etag'],
				});
			}
		});
	}, callback);
};

/**
 * Create new container(bucket) on remote storage.
 * @param  {Object}           config
 * @param  {string}           config            regard as the name(key) of object to be stored
 * @param  {string}           config.name       name(key) of object to be stored
 * @param  {Object}          [config.meta]      meta data of object to be stored
 * @param  {Function}        [callback]          function(err, data)
 */
Connection.prototype.createContainer = function(config, callback) {
	// ---------------------------
	// Uniform arguments.

	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({}, config);

	return this._action((done) => {
		let urlname = encodeAndAppendQuery(config.name);
		let headers = cloneObject(config.meta, (name, value) => [ `X-Container-Meta-${name}`, reASCII.test(value) ? value : mifo.base64.encode(value) ]);
		let body = '';

		this.agent.put(urlname, headers, body, (err, response) => {
			err = err || this._parseResponseError(
				'CONTAINER_CREATE', 
				cloneObject(config, ['name']),
				[ 201, 202 ],
				response
			);
			let data = err ? null : {
				transId: response.headers['x-trans-id'],
			};
			done(err, data);
		});
	}, callback);
}

/**
 * Put an object to remote storage.
 * @param  {Object}           config
 * @param  {string}           config                 regard as the name(key) of object to be stored
 * @param  {string}           config.name            name(key) of object to be stored
 * @param  {string}          [config.contentType]    
 * @param  {Object}          [config.meta]           meta data of object to be stored
 * @param  {string}          [config.metaFlag]       if set, only update meta data without replacing object content
 * @param  {boolean}         [config.suppressNotFoundError]
 * @param  {string}          [config.container]      container/bucket to place the object, 
 *                                                    by default current container of the connection will be used
 * @param  {string}          [content]                object content text
 * @param  {stream.Readable} [content]                object content stream
 * @param  {Buffer}          [content]                object content buffer
 * @param  {Function}        [callback]               function(err, data)
 */
Connection.prototype.createObject = function(config, content, callback) {
	// ---------------------------
	// Analyse and uniform arguments.

	let args = new overload2.ParamList(
		/* config */
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
		[ config, content, callback ] = args;

		if (typeof content == 'undefined' || content == null) content = '';

		if (typeof config == 'string') {
			config = { name: config };
		}
		config = Object.assign({
			// Use property of current connection as default.		
			container: this.container,
		}, config);
	}

	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${config.container}/${config.name}`);

		let headers = parseOptions(config, {
			caseSensitive: false,
			explicit: true,
			columns: [
				'content-type alias(contentType)',
			]
		});

		if (config.meta) {
			for (let name in config.meta) {
				// @tag 20180605.a
				let value = config.meta[name];
				if (!reASCII.test(value)) value = mifo.base64.encode(value);
				headers[`X-Object-Meta-${name}`] = value;
			}
		}

		// By default, use method PUT to create(upload) a new object.
		let method = 'put';

		// To rewrite metadata of an existing object.
		// The old metadata will be deleted.
		if (config.metaFlag == 'w') {
			method = 'post';
		}

		// To append metadata of an existing object.
		else if (config.metaFlag == 'a') {
			method = 'copy';
			// Destination is as same as original path.
			headers['Destination'] = urlname;
		}

		this.agent[method](urlname, headers, content, (err, response) => {
			err = err || this._parseResponseError('OBJECT_CREATE', { name: config.name }, 
				[ 
					201, // Created, PUT
					202, // Accept, POST
				],
				response);
			
			let data = null;
			if (!err) {
				data = {
					lastModified: new Date(response.headers['last-modified']),
					transId: response.headers['x-trans-id'],
					etag: response.headers['etag']
				};
			}
			else if (isNotFoundError(err) && config.suppressNotFoundError) {
				err = null;
			}
			done(err, data);
		});
	}, callback);
};

/**
 * Update the meta data of an object.
 * @param {Object}    config
 * @param {string}    config        regarded as name of object
 * @param {Object}   [meta]          meta data
 * @param {string}   [metaFlag='w']  'a' = append, 'w' = write
 * @param {Function} [callback]
 */
Connection.prototype.createObjectMeta = function(config, meta, metaFlag, callback) {
	let args = new overload2.ParamList(
		/* config */
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
		[ config, meta, metaFlag, callback ] = args;

		if (typeof config == 'string') {
			config = { name: config };
		}
		config = Object.assign({ meta, metaFlag }, config);
		return this.createObject(config, callback);
	}
};

/**
 * @param  {Object}           config
 * @param  {string}           config              regard as config.name
 * @param  {string}          [config.name]        container name
 * @param  {Function}        [callback]
 */
Connection.prototype.deleteContainer = function(config, callback) {
	// ---------------------------
	// Uniform arguments.
	
	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({}, config);
	
	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${config.name}`);
		this.agent.delete(urlname, (err, response) => {
			err = err || this._parseResponseError(
				'CONTAINER_DELETE', 
				cloneObject(config, ['name']),
				[ 204 ],
				response
			);
			done(err);
		});
	}, callback);
};

/**
 * @param  {Object}           config
 * @param  {string}           config              regard as config.name
 * @param  {string}          [config.container]   container name
 * @param  {string}          [config.name]        name(key) of object
 * @param  {Function}        [callback]
 */
Connection.prototype.deleteObject = function(config, callback) {
	// ---------------------------
	// Uniform arguments.
	
	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({
		// Use property of current connection as default.
		container: this.container,
	}, config);
	
	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${config.container}/${config.name}`);
		this.agent.delete(urlname, (err, response) => {
			err = err || this._parseResponseError(
				'OBJECT_DELETE', 
				cloneObject(config, ['container', 'name']),
				[ 204 ],
				response
			);
			done(err);
		});
	}, callback);
};

/**
 * @param  {Object}   [config]
 * @param  {number}   [config.limit]   return top n(limit) containers
 * @param  {string}   [config.marker]  name of container where cursor on
 * @param  {Function} [callback]
 */
Connection.prototype.findContainers = function(config, callback) {
// ---------------------------
	// Uniform arguments.

	if (typeof arguments[0] == 'function') {
		config = {};
		callback = arguments[0];
	}

	if (!config) {
		config = {};
	}

	return this._action((done) => {
		let urlname = encodeAndAppendQuery('/', config, [ 'limit', 'marker' ]);
		this.agent.get(urlname, (err, response) => {
			if (err) return done(err);
			
			// ...
			done(null, response.body);
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
 *                                                 By default, up to 10,000 will be returned. 
 *                                                 The maximum value is configurable for server admin.
 * @param  {Function}        [callback]
 * 
 * -- READMORE：path and delimiter --
 * name(key) of objects are also regarded as path. And config.delimiter is 
 * used to suppose path delimiter as we are fimilar with path.
 * 
 * Suppose that following object names(keys) exist,
 *   [1] foo
 *   [2] foo/bar/0
 *   [3] foo/bar/1
 * When config.delimiter absent, all objects matched.
 * When config.delimiter set to '/', it will return
 *   { name: 'foo' }
 *   { subir: 'foo/' }
 * 
 * -- READMORE: path vs. prefix --
 * Suppose that following object names(keys) exist,
 *   [1] foo/bar/0
 *   [2] foo/quz/1
 * config.path "foo/bar" matches [1]
 * config.path "foo" matches [1][2]
 * config.path "fo" matches NONE
 * config.prefix "fo" matches [1][2]
 * 
 * -- READMORE: should name prefixed with / ? --
 * 
 */
Connection.prototype.findObjects = function(config, callback) {
	// ---------------------------
	// Uniform arguments.

	if (typeof config == 'string') {
		config = { prefix: config };
	}
	config = Object.assign({
		// Use property of current connection as default.
		container: this.container,
	}, config);
	
	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${config.container}`, config, [ 'delimiter', 'limit', 'path', 'prefix', 'marker' ]);
		this.agent.get(urlname, (err, response) => {
			err = err || this._parseResponseError(
				'OBJECT_FIND', 
				cloneObject(config, [ 'container' ]),
				[ 200, 204 ],
				response
			);
			
			let data = err ? null : response.body;
			done(err, data);
		});
	}, callback);
};

/**
 * @param  {Object}           config
 * @param  {string}           config           regard as the name(key) of object to be stored
 * @param  {string}           config.name      name(key) of object to be stored
 * @param  {number}           config.ttl       time to live (in seconds)
 * @param  {string}           config.container container/bucket to place the object
 * @return {string}
 * 
 * -- REFERENCES --
 * https://docs.openstack.org/kilo/config-reference/content/object-storage-tempurl.html
 */
Connection.prototype.generateTempUrl = function(config, callback) {
	// ---------------------------
	// Uniform arguments.

	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({	
		// Use property of current connection as default.
		container: this.container,		
		// Default ttl is 24 hours.
		ttl: 86400,
	}, config);

	return this._action((done) => {
		let urlname = this.storageUrl + '/' + config.container + '/' + encodeAndAppendQuery(config.name);
		let temp_url_expires = parseInt(Date.now() / 1000) + config.ttl;
		let temp_url_sig;
	
		// Genereate temp_url_sig.
		if (1) {
			let method = 'GET';
			let pathname = `/v1/${config.container}/${config.name}`;
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
		case 'style'       : return 'swift';
		case 'endpoint'    : return this.endPoint;
		case 'username'    : return this.username;
		case 'subusername' : return this.subUsername;
		case 'subuser'     : return this.subuser;
		case 'container'   : return this.container;
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
 * @param  {Object}           config
 * @param  {string}           config                 regard as config.name
 * @param  {string}          [config.name]           name(key) of object
 * @param  {boolean}         [config.suppressNotFoundError=false]
 * @param  {Function}        [callback]
 */
Connection.prototype.readContainer = function(config, callback) {
	// ---------------------------
	// Uniform arguments.
	
	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({
		suppressNotFoundError: false,
	}, config);
	
	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${config.name}`, config, []);
		this.agent.head(urlname, (err, response) => {
			err = err || this._parseResponseError(
				'CONTAINER_GET', 
				cloneObject(config, [ 'name' ]),
				[ 204 ],
				response
			);
			let data = null;
			if (!err) {
				data = parseContainerMeta(response);
			}
			else if (isNotFoundError(err) && config.suppressNotFoundError) {
				err = null;
			}
			done(err, data);
		});
	}, callback);
};

/**
 * Retrieve an object from remote storage.
 * @param  {Object}           config
 * @param  {string}           config                 regard as config.name
 * @param  {string}          [config.container]      container name
 * @param  {string}          [config.name]           name(key) of object
 * @param  {boolean}         [config.onlyMeta=false] 
 * @param  {boolean}         [config.suppressNotFoundError=false]
 * @param  {Function}        [callback]
 */
Connection.prototype.readObject = function(config, callback) {
	// ---------------------------
	// Uniform arguments.
	
	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({
		// Use property of current connection as default.
		container: this.container, 
		onlyMeta: false,
		suppressNotFoundError: false,
	}, config);
		
	return this._action((done) => {
		let urlname = encodeAndAppendQuery(`${config.container}/${config.name}`, config, []);
		let method = config.onlyMeta ? 'head' : 'get';
		this.agent[method](urlname, (err, response) => {
			err = err || this._parseResponseError(
				'OBJECT_GET', 
				cloneObject(config, [ 'name' ]),
				[ 200 ],
				response
			);
			let data = null;
			if (!err) {
				data = parseObjectMeta(response);
				if (!config.onlyMeta) data.buffer = response.bodyBuffer;
			}
			else if (isNotFoundError(err) && config.suppressNotFoundError) {
				err = null;
			}
			done(err, data);
		});
	}, callback);
};

Connection.prototype.readObjectMeta = function(config, callback) {
	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({ onlyMeta: true }, config);
	return this.readObject(config, callback);
};

/**
 * Retrieve an object from remote storage.
 * @param  {Object}           config
 * @param  {string}           config              regard as config.name
 * @param  {string}          [config.container]   container name
 * @param  {string}          [config.name]        name(key) of object
 * @param  {Function}        [callback]
 * @return {stream.Readable}
 */
Connection.prototype.pullObject = function(config, callback) {
	// ---------------------------
	// Uniform arguments.
	
	if (typeof config == 'string') {
		config = { name: config };
	}
	config = Object.assign({
		// Use property of current connection as default.
		container: this.container,
	}, config);	
	
	let urlname = encodeAndAppendQuery(`${config.container}/${config.name}`, config, []);
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
				let err = this._parseResponseError(
					'OBJECT_GET',
					cloneObject(config, [ 'name' ]),
					[ 200 ],
					response
				);
				if (err) {
					done(err);
				}
				else {
					meta = parseObjectMeta(response);
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


function isNotFoundError(ex) {
	return ex instanceof RequestRefusedError && ex.response.statusCode == 404;
}

module.exports = {
	Connection,
	isNotFoundError,
};
