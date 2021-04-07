#   osapi Change Log

Notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

##	[1.2.1] - Apr 7th, 2021

*	Fix bug where `suppressBadRequestError` is ineffective.

##	[1.2.0] - Apr 6th, 2021

*	New options property `suppressBadRequestError` added.

##	[1.1.3] - Dec 31st, 2020

*	Fixed bug in in [s3/Connection.js](s3/Connection.js), `async (done) => {}` is self-contradictory. 

##	[1.1.2] - Dec 31st, 2020

*	Remove debug line `console.log()` in [s3/Connection.js](s3/Connection.js).

##	[1.1.0] - Jun 30th, 2020

*	`(new Connection).updateObjectUserMeta()` added.
*	Fixed bug in `s3.Connection` that signature wrong if user meta value containing WHITESPACE or NEWLINE character(s).

##	[1.0.1] - Jan 6th, 2020

*	Remove debugging sentences.
*	Add `options.proxy` in `Connection(options)`.
*	Make up for the flaw that slashes in object names are encoded unnecessarily.

##	[1.0.0] - Jan 5th, 2020

This is a milestone version to be compatible with both *S3* server and *SWIFT* server. Before this version, it is nearly useless when faced with *S3* server.

And, documentation is nearly completed.

##	[0.9.6] - Dec 15th, 2018

*	New `options.acl` is supported in `(new s3.Connection).createObject()`.

##	[0.9.5] - Aug 24th, 2018

*	Fixed bug in `(new swift.Connection).createObect()` invoking `(new htp.SimpleAgent).copy()` with payload.

##	[0.9.4] - Aug 6th, 2018

*	Second parameter defined in `new swift.Connection(config, options)`.

##	[0.9.3] - Aug 5th, 2018

*	Fixed bug in `(new swift.Connection).copyObject()` via upgrading version of dependency [htp](https://www.npmjs.com/package/htp) to 10.0.2.

##	[0.9.0] - Aug 2nd, 2018

*	Make `(new swift.Connection)` use `keepAlive` connections on requesting.

##	[0.8.7] - July 14th, 2018

*	Fixed bug in `(new swift.Connection).createObject()` that it will fail if object name contains non-ASCII characters.

##	[0.8.6] - July 13th, 2018

*	Fixed bug in `(new swift.Connection).createObject()` that `suppressNotFoundError` option suppresses not only `NotFoundError` but any other errors, and `NotFoundError` will never be thrown.

##	[0.8.5] - June 7th, 2018

*	Option `suppressNotFoundError` accepted by `(new swift.Connection).createObject()` and `(new swift.Connection).createObjectMeta()`. 
*	Property lastModifed which is Date instance is added to returned value of `(new swift.Connection).createObject()` method.

##	[0.8.4] - June 5th, 2018 - DISPUTABLE

*	Non-ASCII metadata will be encoded via [mifo.base64](https://www.npmjs.com/package/mifo) on creating and automatically decoded on reading.

##	[0.8.0] - June 5th, 2018 - RISKY

*	`(new swift.Connection).createObjectMeta()` added.
*	Sizable adjustment on argument uniform processing in [swift/index.js](./swift/index.js).

##	[0.7.3] - June 5th, 2018

*	Option `suppressNotFoundError` accepted by `(new swift.Connection).readObject()` and `(new swift.Connection).readContainer()`. 

##	[0.7.2] - May 7th, 2018

*	Upgrade dependency version of *htp*.

##	[0.7.1] - Apr 25th, 2018

*	Fixed bug in `(new swift.Connection).generateTempURL()` that protocal is encoded to 'http%3A'. 

##	[0.7.0] - Apr 23rd, 2018

*	`(new swift.Connection).toString()` added.
*	`(new s3.Connection).toString()` added.

##	[0.6.0] - Mar 21st, 2018 - RISKY

*	`(new swift.Connection).connect()` added.

##	[0.5.2] - Mar 13th, 2018

*	`swift.isNotFoundError()` added.

##	[0.5.1] - Mar 6th, 2018, RISKY

*	README greatly re-constructed.
*	`(new swift.Connection).createObject()` accepts customised meta data.
*	`(new swift.Connection).createObject()` validates arguments and may throw error with message "invalid arguments".

##	[0.5.0@unpublished]

##	[0.4.2] - Feb 8th, 2018

*	Remove redundant debug code which was wrongly published in version 0.4.0 and 0.4.1 .

##	[0.4.1@unpublished] - Feb 8th, 2018

*	dependencies updated.

##	[0.4.0@unpublished] - Feb 8th, 2018

*	Option property `contentType` supported in Method `(new swift.Connection).createObject()`.
*	Return more object meta information in `(new swift.Connection).pullObject().on('meta')` and `(new swift.Connection).findObjects()`:
	-	__contentType__
	-	__contentLength__
	-	__lastModified__
*	[RISKY] In methods of `(new swift.Connection)`, encode container/object name in order to operate with those whose names contains special characters (e.g. whitespaces).

##	[0.3.0] - Jan 10, 2018

###	News

*	Method `(new swift.Connection).createContainer()` released.
*	Method `(new swift.Connection).deleteContainer()` released.
*	Method `(new swift.Connection).findContainers()` released.
*	Method `(new swift.Connection).findObjects()` released.

###	Fixed

*	Fixed the bug that method `(new swift.Connection).findObjects()`

###	Others

*	Dependencies upgraded.

##	[0.2.1] - Jan 5, 2018

###	New

*	Method `(new RequestRefusedError).print()` will format and output the error information.

###	Fixed

*	*ReferenceError: ServerError is not defined* throwed when `(new swift.Connection).createContainer()` failed.

##	[0.2.0] - Jan 5, 2018

*	Update dependencies.

##	[0.1.3] - Jan 4, 2018

*	Customised Error [__RequestRefusedError__](./README.md#customised-error) added.

##	[0.1.2] - Dec 25, 2017

*	Upgrade depedency __htp__ from version `^0.2.1` to `^0.4.0`.
*	Fixed the `too many listeners` bug.

##  [0.1.1] - Nov 29, 2017

*   README edited.

##  [0.1.0] - Nov 28, 2017

*   Main enterance of the package turned from `swift/index.js` to `index.js`. And since now, the main enterance will evolve independently of `osapi/swift`.

##  [0.0.4] - Nov 23, 2017

*   开始提供[简单中文](./README.zh_CN.md)和[繁体中文](./README.zh_TW.md)说明文档。

##  [0.0.3] - 2017-11-10

*   Explictly require the version of Node.js in [package.json](./package.json).

##	[0.0.2] - 2017-11-9

Released.

---
This CHANGELOG.md follows [*Keep a CHANGELOG*](http://keepachangelog.com/).
