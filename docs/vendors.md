#	Compatible Services

So far, according to limited practice, this package may be used to access three kinds of storage services powered by different vendors:

*	__AWS S3__  
	compatible with: `osapi/s3`  
	named as: `"aws"`  
	official NPM package: [aws-sdk](https://www.npmjs.com/package/aws-sdk)

*	__Aliyun OSS__  
	compatible with: `osapi/s3`  
	named as: `"aliyun"`  
	official NPM package: [ali-oss](https://www.npmjs.com/package/ali-oss)

*	__CEPH__  
	compatible with: `osapi/s3` | `osapi/swift`  
	named as: `"ceph"`  
	no official NPM package found

However, the package `osapi` or `ceph` is designed for specified light-weighted usage, and is NOT the equivalent of those official packages.