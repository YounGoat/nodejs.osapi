#	ceph | osapi

Package `osapi` or `ceph` is designed to access object storage (e.g. CEPH) via S3 API or Swift API.

*	[Design Patterns Used in osapi](./design.md)
*	[Pseudo Directory In Object Storage](./pseudo-directory.md)
*	APIs
	*	[main](./main.md)
	*	[Class: Connection](./connection.md)
		*	[s3.Connection](./s3/connection.md)
		*	[swift.Connection](./swift/connection.md)
	*	[Class: OsapiError](./osapierror.md)

##	References

*	openstack, [Object Storage API Reference 2.24.1](https://docs.openstack.org/api-ref/object-store/index.html)
*	[Amazon S3 REST API Introduction](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
*	Ceph Documentation, [Ceph Object Gateway](https://docs.ceph.com/docs/mimic/radosgw/)
*	阿里云 / 对象存储 OSS / [API概览](https://help.aliyun.com/document_detail/31948.html)
