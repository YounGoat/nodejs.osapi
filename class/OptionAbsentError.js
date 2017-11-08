'use strict';

const MODULE_REQUIRE = 1
    /* built-in */
    
    /* NPM */
    , defineError = require('jinang/defineError')
    
    /* in-package */
    ;

/**
 * Require option(s) absent.
 * If any argument is an array, all in the array are required.
 * If there are more than one arguments supplied, it means that at least one of them is reuqired.
 * @param {string|Array} name required option name or names
 */
module.exports = defineError('OptionAbsentError', Error, function(name /*, name, ... */ ) {
    // The code is fixed and can be used to distinguished this kind of error from other errors.
    this.code = 'OPTION_ABSENT';

    let expressions = [];
    for (var i = 0, argument, expression; i < arguments.length; i++) {
        argument = arguments[i];
        if (argument instanceof Array) {
            expression = `(${argument.join(', ')})`;
        }
        else {
            expression = argument;
        }
        expressions.push(expression);
    }

    this.message = `Required option(s) absent: ${expressions.join(' | ')}`;
});