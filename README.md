Remutable
=========

Ultra simple, ultra efficient key/value map with mutations recording, diffing and patching.

Remutable is specifically designed to be nearly as performant as a plain Object, but with patching over the wire in mind.

Implementation is extremely straightforward.

Example
=======
```js
const robert = 'Robert Heinlein';
const isaac = 'Isaac Asimov';
const dan = 'Dan Simmons';

const userList = new Remutable();
userList.hash.should.be.exactly('60ba4b2daa4ed4d070fec06687e249e0e6f9ee45');
userList.set('1', robert);
userList.set('2', isaac);
(userList.head.get('1') === void 0).should.be.ok;
userList.working.get('1').should.be.exactly(robert);
userList.commit();
userList.head.get('1').should.be.exactly(robert);
userList.head.get('2').should.be.exactly(isaac);
const json = userList.toJSON();
json.should.be.exactly('{"h":"87a149821b29aac81a0fda55ff1de4fde2ba4659","v":1,"d":{"1":"Robert Heinlein","2":"Isaac Asimov"}}');
const userListCopy = Remutable.fromJSON(json);
userListCopy.toJSON().should.be.exactly(json);
userListCopy.head.size.should.be.exactly(2);
userList.set('3', dan);
const patch = userList.commit();
const revert = Patch.revert(patch);
userListCopy.apply(patch);
userListCopy.head.get('3').should.be.exactly(dan);
userListCopy.set('3', isaac);
userListCopy.working.get('3').should.be.exactly(isaac);
userListCopy.rollback();
userListCopy.working.get('3').should.be.exactly(dan);
userListCopy.apply(revert);
userListCopy.head.has('3').should.be.exactly(false);
userListCopy.head.contains(dan).should.be.exactly(false);
userListCopy.head.contains(isaac).should.be.exactly(true);

```


API
===

`new Remutable(): new Remutable`

Creates a new Remutable object instance.

`r.set(key: string, value: any): Remutable`

`r.get(key): any`

`r.delete(key): Remutable`

Get/set/delete value in the underlying map. Only `string` keys are allowed. `value` should be JSON-stringifyiable.
After a `.set`/`.delete`, `.get` will return the cached, modified value.
`.set` with `value === undefined` is equivalent to `.delete`.

`get r.head: Immutable.Map`

Returns an Immutable.Map which represents the state after the last commit.
You can use all the methods of Immutable.Map, such as `r.head.map`, `r.head.contains`, etc.

`get r.working: Immutable.Map`

Returns an Immutable.Map which represents the cached, up-to-date state, including any mutations since the last commit.
You can use all the methods of Immutable.Map, such as `r.working.map`, `r.working.contains`, etc.

`get r.hash: String`

Returns a string hash of the remutable object, so that `r1.hash === r2.hash` implies that `r1` and `r2` are identical.

`r.commit(): new Patch`

Flush the current mutations and returns a patch object.
After a commit, memory from the previous commit is lost and you can not rollback unless you explicitly store and revert the patch object.

`r.rollback(): Remutable`

Cancel all the non-commited mutations.

`r.match(patch: Patch)`

Checks whether the given patch can be applied to the current remutable.

`r.apply(patch: Patch)`

Checks that the patch is a fast-forward from the current object version (or throws) and applies the patch efficiently.

`r.toJSON(): string`

Returns a compact JSON string representing the remutable instance. Can then be passed to `Remutable.fromJSON()`.

`Remutable.fromJSON(json: String): new Remutable`

Reconstructs a fresh Remutable instance from a JSON string representation.
It is guaranteed that `Remutable.fromJSON(r.toString()).head.is(r.head) === true`.

`patch.toJSON(): string`

Returns a compact JSON string representing the patch instance. Can then be passed to `Remutable.Patch.fromJSON()`.

`Remutable.Patch.fromJSON(json): new Patch`

Reconstructs a fresh Patch instance from a JSON string representation.

`Remutable.Patch.revert(patch: Patch): new Patch`

Creates a new Patch instance which does the exact reverse mutations that `patch` does.
Useful to implement undo/redo mechanisms.
