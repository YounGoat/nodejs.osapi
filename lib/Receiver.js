'use strict';

const MODULE_REQUIRE = 1
    /* built-in */
    , stream = require('stream')
    , util = require('util')

    /* NPM */
    
    /* in-package */
    ;

function Receiver(options) {
    // init Transform
    stream.Transform.call(this, options);
}

util.inherits(Receiver, stream.Transform);

Receiver.prototype._transform = function(chunk, enc, callback) {
    this.push(chunk);
    callback();
};

module.exports = Receiver;