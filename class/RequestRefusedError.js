'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	
	/* NPM */
	, defineError = require('jinang/defineError')
	
	/* in-package */
	;

function RequestRefusedError(action, meta, response) {
	this.message = `ceph.RequestRefused: ${response.statusMessage}`;
	this.action = action;
	this.meta = meta;
	this.response = response;
	
	this.toString = function() {
		return [ 'RequestRefusedError', this.action, JSON.stringify(this.meta), JSON.stringify(this.response) ].join(' ');
	};

	this.print = function() {
		console.log('RequestRefusedError');
		console.log('Action:', this.action);
		console.log('Message:', this.message);
		console.log('Meta:', JSON.stringify(this.meta));
		console.log('Response:');
		console.log('\tstatusCode:', this.response.statusCode);
		console.log('\tstatusMessage:', this.response.statusMessage);
		console.log('\tcode:', this.response.code);
	};
}

module.exports = defineError('RequestRefusedError', Error, RequestRefusedError);