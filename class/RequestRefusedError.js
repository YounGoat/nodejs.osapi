'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	
	/* NPM */
	, defineError = require('jinang/defineError')
	
	/* in-package */
	;

module.exports = defineError('RequestRefusedError', Error, function(action, meta, response) {
	this.message = `Failed on requesting remote storage`;
	this.action = action;
	this.meta = meta;
	this.response = response;

	this.toString = () => [ 'RequestRefusedError', action, JSON.stringify(meta), JSON.stringify(response) ].join(' ');
});