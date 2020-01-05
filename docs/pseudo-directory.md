#	Pseudo Directory In Object Storage

There is one or more buckets (containers) in object storage server. Objects are stored in a bucket as KEY-VALUE pairs. KEY is a unique name in a bucket. Actually, different from file-system we are fimiliar with, there are no directories in bucket. However, we are used to name the objects with pseudo hierachical syntax. E.g.

```bash
images/2020/Jan/0001.png
images/2020/Jan/0002.png
images/2020/Feb/0003.png
images/2020/Feb/0004.png
```

Method [`conn.findObjects(options)`](./connection.md#findobjects) will regard object names as something like "path" in file system and response "directory" items under certain conditions:

*	*options.delimiter* is [truthy][^truthy] value. Or
*	*options.path* is [truthy][^truthy] or zero-length string `""`.

__ATTENTION:__ The two conditions above are mutually exclusive. If they are both present, sometimes 400 will be responsed, or *options.path* will be ignored.

Suppose that following object names(keys) exist,
*   [1] foo
*   [2] foo/bar/0
*   [3] foo/bar/1

When `options.delimiter` absent, all objects matched:
```javascript
[
	{ name: "foo", ... },
	{ name: "foo/bar/0", ... },
	{ name: "foo/bar/1", ... },
]
```

When `options.delimiter == '/'`, what responsed will be:
```javascript
[
	{ name: 'foo', ... }
 	{ dirname: 'foo/' }
]
```

[^truthy]: https://developer.mozilla.org/en-US/docs/Glossary/Truthy