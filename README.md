Remutable
=========

Ultra simple, ultra efficient key/value map with mutations recording, diffing and patching.

Remutable is specifically designed to be nearly as performant as a plain Object, but with patching over the wire in mind.

Implementation is extremely straightforward.

Example
=======
```js
function l() { console.log.apply(console, arguments); }

var u1 = { id: 1, name: 'Robert Heinlein' };
var u2 = { id: 2, name: 'Isaac Asimov' };
var u3 = { id: 3, name: 'Dan Simmons' };

var userList = new Remutable();
l(userList.hash); // '60ba4b2daa4ed4d070fec06687e249e0e6f9ee45'
userList.set(u1.id, u1.name);
userList.set(u2.id, u2.name);
userList.commit();
var str = userList.serialize();
l(str); // '{"h":"87a149821b29aac81a0fda55ff1de4fde2ba4659","v":1,"d":{"1":"Robert Heinlein","2":"Isaac Asimov"}}'
var userListCopy = Remutable.unserialize(str);
l(userList.hash); // '87a149821b29aac81a0fda55ff1de4fde2ba4659'
l(userListCopy.hash); // '87a149821b29aac81a0fda55ff1de4fde2ba4659'
l(userList.get(u1.id)); // 'Robert Heinlein'
l(userListCopy.get(u1.id)); // 'Robert Heinlein'
userList.set(u1.id, u3.name);
var patch = userList.commit();
var reverse = patch.reverse();
l(patch.serialize()); // '{"m":{"1":{"f":"Robert Heinlein","t":"Dan Simmons"}},"f":{"h":"87a149821b29aac81a0fda55ff1de4fde2ba4659","v":1},"t":{"h":"4b550dbd372828c61d38073b617c31cc2c75c936","v":2}}'
l(reverse.serialize()); // '{"m":{"1":{"f":"Dan Simmons","t":"Robert Heinlein"}},"f":{"h":"4b550dbd372828c61d38073b617c31cc2c75c936","v":2},"t":{"h":"56e9e0dabe35ca2ff574d1fd4efe41eb67e209f4","v":3}}'
userListCopy.apply(patch);
l(userListCopy.get(u1.id)); // 'Dan Simmons'
userListCopy.apply(reverse);
l(userListCopy.get(u1.id)); // 'Robert Heinlein'
```


API
===

`new Remutable()`

Creates a new Remutable object instance.

`r.set(key, value)`

`r.get(key)`

`r.del(key)`


Getter/setter/deleter.
After a `.set`/`.del`, `.get` will return the cached, modified value.
`.set` with `value === undefined` is equivalent to `.del`.

`r.check(key)`
Return the value at `key` from the last commit (even if it was mutated in between).

`r.keys()`

Returns the list of keys in the remutable object, including new keys defined by `.set` and not including keys undefined by `.del` in the current mutations stack.

`r.map(fn)`

Map `fn` to all `(value, key)` couples in the remutable object, using `this.keys()` semantics.

`r.commit(): new Patch`

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

`r1.equals(r2): boolean`

Instantly verifies if `r1` is `r2`.
Note that `r1` and `r2` may wrap the same keys/values but not be equal, if they have diverged at some point.
You may implement your own deep check, but as it is probably not relevant in most cases, I don't provide an implementation.

`r.uid`
Expose a string representation of the unique id of the remutable object and its current state, so that `r1.uid === r2.uid` is equivalent to `r1.equals(r2)` (though slower).

`r.dirty`
Expose a boolean, indicating if there are pending, uncommited mutations.

`patch.serialize(): serialized`

`Patch.unserialize(serialize): new Patch`

Return a string representation of `patch`/constructs a patch object from a serialized string representation.

`patch.reverse(): new Patch`

Creates a new patch object which reverse all the mutations from the patch. Useful to implement undo/redo semantics.
