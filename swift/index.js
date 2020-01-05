'use strict';

const MODULE_REQUIRE = 1
	/* built-in */
	
	/* NPM */
	, noda = require('noda')
	
	/* in-package */
	, OsapiError = noda.inRequire('class/OsapiError')
	;


const swift = noda.requireDir('.');
swift.isNotFoundError = OsapiError.isNotFound;

module.exports = swift;