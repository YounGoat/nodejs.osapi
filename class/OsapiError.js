'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	
	/* NPM */
	, defineError = require('jinang/defineError')
	
	/* in-package */
	;

/**
 * 
 * @param {string}  action    - what operation is bein processed, it is named in form of <ENTITY>_<ACTION>
 * 
 * @param {object}  request   - request meta data
 * @param {string}  request.name
 * 
 * @param {object}  response  - response meta data
 * @param {number}  response.statusCode
 * @param {number}  response.statusMessage
 * 
 * Both `request` and `response` are simple object instead of HTTP req / res instances.
 * They both may have more properties than what listed above.
 */
function OsapiError(action, request, response) {
	let message = [ 
		'failed', 
		action,
		request && request.name || '-',
		response.statusCode,
		response.statusMessage,
	].join(' ');

	Object.defineProperties(this, {
		message: {
			value: message,
			enumerable: false,
		},
		action: {
			value: action,
			enumerable: false,
		},
		request: {
			value: request, 
			enumerable: false,
		},
		response: {
			value: response,
			enumerable: false,
		},
	});
}

OsapiError = defineError('OsapiError', Error, OsapiError);

OsapiError.isNotFound = function(ex) {
	return ex instanceof OsapiError && ex.response.statusCode == 404;
};

OsapiError.isBadRequest = function(ex) {
	return ex instanceof OsapiError && ex.request.statusCode == 400;	
};

module.exports = OsapiError;