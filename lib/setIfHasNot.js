'use strict';

const MODULE_REQUIRE = 1
    /* built-in */
    
    /* NPM */
    
    /* in-package */
    ;

function setIfHasNot(obj, name, value) {
    if (!obj.hasOwnProperty(name)) {
        obj[name] = value;
    }
}

module.exports = setIfHasNot;
