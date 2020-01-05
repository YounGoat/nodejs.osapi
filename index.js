'use strict';

const MODULE_REQUIRE = 1
    /* built-in */
    
    /* NPM */
    , noda = require('noda')
    , cloneObject = require('jinang/cloneObject')
    
    /* in-package */
    , s3 = noda.inRequire('s3')
    , swift = noda.inRequire('swift')
    ;

function createConnection(options, settings) { 
    options = cloneObject(options, (key, value) => [ key.toLowerCase(), value ]);

    let Conn = null;
    if (options.username || options.subusername || options.subuser) {
        Conn  = swift.Connection;
    }
    else {
        Conn = s3.Connection;
    }

    return new Conn(options, settings);
}

function isConnection(conn) {
    return conn instanceof s3.Connection || conn instanceof swift.Connection;
}

function getConnectionStyle(conn) {
    return isConnection(conn) ? conn.get('style') : null;
}

module.exports = {
    createConnection,
    isConnection,
    getConnectionStyle,
};