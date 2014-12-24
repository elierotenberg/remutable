Remutable
=========

Ultra simple, ultra efficient key/value map with mutations recording, diffing and patching.

Remutable is specifically designed to be nearly as performant as a plain Object, but with patching over the wire in mind.

Implementation is extremely straightforward.

Example
=======
```js
var Remutable = require('remutable');
var user1 = { id: 1325325, name: 'Isaac Asimov' };
var user2 = { id: 5128581, name: 'Robert Heinlein' };
var userList = new Remutable();
console.log(userList.serialize());
userList.set(user1.id, user1);
userList.set(user2.id, user2);
console.log(JSON.stringify(userList.commit())); // patch string
var str = userList.serialize();
console.log(str);
var remoteUserList = Remutable.unserialize(str);
remoteUserList.equals(userList); // true
remoteUserList.map(function(user) {
  console.log(user.name);
}); // 'Isaac Asimov' 'Robert Heinlein'
userList.del(user1.id);
userList.get(user1.id); // undefined
var patch = userList.commit();
remoteUserList.equals(userList); // false
remoteUserList.canApply(patch); // true
remoteUserList.apply(patch);
remoteUserList.map(function(user) {
  console.log(user.name);
}); // 'Robert Heinlein'
remoteUserList.set(user1.id, user2);
remoteUserList.get(user1.id); // { id: 5128581, name: 'Robert Heinlein' }
remoteUserList.rollback();
console.log(remoteUserList.get(user1.id)); // undefined
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

`r.keys`

Returns the list of keys in the remutable object, including new keys defined by `.set` and not including keys undefined by `.del` in the current mutations stack.

`r.map(fn)`

Map `fn` to all `(value, key)` couples in the remutable object, using `this.keys()` semantics.

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

`r1.equals(r2): boolean`/

Instantly verifies if `r1` is `r2`.
Note that `r1` and `r2` may wrap the same keys/values but not be equal, if they have diverged at some point.
You may implement your own deep check, but as it is probably not relevant in most cases, I don't provide an implementation.
