'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	, stream = require('stream')
	
	/* NPM */
	, noda = require('noda')
	
	/* in-package */
	, swift = noda.inRequire('swift')
	;

let connJson = noda.inRequire('_auth/swift.json');
let conn = new swift.Connection(connJson);

let t = new stream.Transform();
t._transform = function(chunk, encoding, callback) {
	callback(null, chunk);
};

let E = new Error('something wrong');

conn.createObject('foobar.txt', t, (err, data) => {
	if (err) {
		console.log(err === E);
		console.log(err.message);
	}
});

setTimeout(() => {
	t.write('1');
	t.write('2');

	// Error of the body stream will be passed throught to conn.createObject() method.
	t.emit('error', E);
	
	t.end('3');
}, 100);