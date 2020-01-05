#    Design Patterns Used in osapi | ceph

So far, the main body of the package is two classes named `Connection` respectively belonging to __osapi/swift__ and __osapi/s3__. We interact with CEPH storages with the help of methods of `Connection` instances. These methods (called "the METHODs" or "a METHOD" hereinafter) are what I wanna talk about in this document.

##    Method Parameters and Returned Value

Generally, the METHODs are ASYNCHRONOUS. Most (NOT ALL) of them may be invoked in two ways to the same destination.

__TL;DR;__
*   `callback` should be THE LAST argument.
*	`callback` is OPTIONAL.
*   `callback` expects arguments `(err, response)`.
*   If `callback` is ingored, an instance of `Promise` will be returned.

Before `Promise` invented, we were used to pass in a `callback` on invoking an asynchronous function. E.g.

```javascript
// Suppose an instance of Connection, named `conn`, has been created.

// Function callback will receive one or two arguments:
// The first is an `Error` instance or null.
// The second is an object containing information what requested.
function callback(err, response) {
    if (err) {
        // ...
    }
    else {
        // ...
    }
};

// Send a request and to do with response in a callback function.
conn.readObject('my/love.md', callback);

// In this way, `conn` itself will be returned so you may continue to invoke 
// other methods in chain.
conn
    .readObject('my/love.md', callback)
    .readObject('my/hate.md', callback)
    // ...
```

If no `callback` passed in, a instance of `Promise` will be returned.

```javascript
conn.readObject('my/love.md') /* a Promise instance returned */
    .then(response => {
        // ...
    })
    .catch(err => {
        // ...
    });
```

Now, maybe `Promise` is more popular because it works well with `yield` in generator functions. 
```javascript
co(function*() {
    // ...
    let love = yield conn.readObject('my/love.md');
    let hate = yield conn.readObject('my/hate.md');
    // ...
}).catch(err => {
    // ...
});
```

##   Method Names

A METHOD is designed to achieve a simple task related with only one thing. So, they are generally named in form of "*verb* + *Noun*" in camelCase. The frequently used verbs including:

*	create
*	delete
*	find
*	pull
*	read

Verb *get* is avoided because it is usually used in naming sychrounous functions.