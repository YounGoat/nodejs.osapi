#	osapi/swift

```javascript
const swift = require('osapi/swift');
```

*   class [__swift.Connection__](./connection.md) extends [__Connection__](../connection.md)
*   [__swift.isNotFoundError()__](#swiftisnotfounderror)

##  swift.isNotFoundError()

*   boolean __swift.isNotFoundError__( Error *ex* )

Whether *ex* is an Error instance emitted because requested target (container or object) is not found.