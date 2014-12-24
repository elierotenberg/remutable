Remutable
=========

Ultra simple, ultra efficient key/value map with mutations recording, diffing and patching.

Remutable is specifically designed to be nearly as performant as a plain Object, but with patching over the wire in mind.

Implementation is extremely straightforward.

Example
=======
```js
var r1 = new Remutable();
r1.set('foo', 'bar');
r1.commit();
var s1 = r1.serialize();
var r2 = Remutable.unserialize(s1);
r2.get('foo'); // = 'bar'
r1.set('baz', 'fuzz');
r1.del('foo');
r1.get('foo'); // = 'undefined'
r1.rollback();
r1.get('foo'); // = 'bar'
r1.set('foo', 'fizz');
var patch = r1.commit();
r2.apply(patch);
r2.get('foo'); // = 'fizz'
```


API
===

`new Remutable()`

Creates a new Remutable object instance.

`r.set(key, value)`
`r.get(key, value)`
`r.del(key)`

Getter/setter/deleter.
After a `.set`/`.del`, `.get` will return the cached, modified value.

`r.checkout(key)`
Return the value at `key` from the last commit (even if it was mutated in between).

`r.commit(): patch`

Flush the current mutations and returns a patch object.
After a commit, memory from the previous commit is lost and you can not rollback.

`r.rollback()`

Cancel all the non-commited mutations.

`r.canApply(patch)`

Checks whether the given patch can be applied to the current remutable (internal ObjectID and version match).

`r.apply(patch)`

Checks that the patch is a fast-forward from the current object version (or throws) and applies the patch efficiently.

`r.serialize(): serialized`
`Remutable.unserialize(serialized): new Remutable`

Returns a string representation of `r`/constructs a Remutable object from a serialized string representation.
