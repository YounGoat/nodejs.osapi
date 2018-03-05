#   osapi Change Log

Notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

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
