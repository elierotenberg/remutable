Remutable
=========

Ultra simple key-value map with constant-time identity check, replayable, undo-able and serializable diffing.

Remutable is specifically designed to be nearly as performant as a plain Object, but with patching over the wire in mind.

Implementation is backed by the awesome Immutable-JS lib.

### The problem

Immutable-JS is neat, but what happens when you want to share Immutable objects over the wire, across a transport which doesn't understand Javascript reference identity?

Remutable solves this by leveraging a simple fact: if you apply the same set of mutations, in the same order, to the same initial state, then the final state will also be the same. Internally, Remutable uses patch hashing to preserve the identity check constant-time, as the hash of the current state is computed by recursively hashing the initial state and each subsequent mutation (think git commit hash).

We can illustrate this pseudocode diagram:

```
single source of truth (server)       consumer (client)
v1 = Immutable.Map()
send(serialize(v1))       ----------> v1 = unserialize(receive())
(v2, diff1) = v1.set(...)
send(diff1)               ----------> v2 = v1.patch(unserialize(receive()))
(v3, diff2) = 2.set(...)
send(diff2)               ----------> v3 = v2.patch(unserialize(receive()))
```


Example
=======
```js
const Remutable = require('remutable');
const { Patch } = Remutable;

const robert = 'Robert Heinlein';
const isaac = 'Isaac Asimov';
const dan = 'Dan Simmons';
const bard = 'William Shakespeare';
const manu = 'Emmanuel Kant';

// Let's create an empty Remutable object
const userList = new Remutable();
userList.hash.should.be.exactly(366298937);
userList.dirty.should.not.be.ok;

// And set two values
userList.set('1', robert);
userList.dirty.should.be.ok;
userList.set('2', isaac);

// Head is the latest committed state and is an empty object right now
(userList.head.get('1') === void 0).should.be.ok;
// Working is the most up to date version
userList.working.get('1').should.be.exactly(robert);

// After we commit, head now reflects the changes
userList.commit();
userList.head.get('1').should.be.exactly(robert);
userList.head.get('2').should.be.exactly(isaac);

// We can rollback changes that have no been committed yet
userList.set('3', dan);
userList.working.get('3').should.be.exactly(dan);
userList.rollback();
(userList.working.get('3') === void 0).should.be.ok;

// Now we can serialize it to send it to the server via toJSON
const json = userList.toJSON();
json.should.be.exactly('{"h":2045445329,"v":1,"d":{"1":"Robert Heinlein","2":"Isaac Asimov"}}');

// and read it back from the server via fromJSON
const userListCopy = Remutable.fromJSON(json);
userListCopy.toJSON().should.be.exactly(json);
userListCopy.head.size.should.be.exactly(2);

// In order to communicate changes between the client and the server,
// we get a patch when doing a commit and apply it
userList.set('3', dan);
const patch = userList.commit();
// We can transfer the patch in JSON form
const jsonPatch = patch.toJSON();
jsonPatch.should.be.exactly('{"m":{"3":{"t":"Dan Simmons"}},"f":{"h":2045445329,"v":1},"t":{"h":-195302221,"v":2}}');
const patchCopy = Patch.fromJSON(jsonPatch);
userListCopy.apply(patchCopy);
userListCopy.head.get('3').should.be.exactly(dan);

// It's possible to implement an undo stack by reverting patches
const revert = Patch.revert(patch);
userListCopy.apply(revert);
userListCopy.head.has('3').should.be.exactly(false);
userListCopy.head.contains(dan).should.be.exactly(false);
userListCopy.head.contains(isaac).should.be.exactly(true);

// Several small patches can be combined into a bigger one
const userListCopy2 = Remutable.fromJSON(userList.toJSON());
userList.set('4', bard);
const patchA = userList.commit();
userList.set('5', manu);
const patchB = userList.commit();
const patchC = Patch.combine(patchA, patchB);
patchC.source.should.be.exactly(patchA.source);
patchC.target.should.be.exactly(patchC.target);
userListCopy2.apply(patchC);
userListCopy2.head.contains(bard).should.be.exactly(true);
userListCopy2.head.contains(manu).should.be.exactly(true);

// We make some changes without recording the patch objects
userList.delete('5');
userList.commit();
userList.delete('4');
userList.commit();
// We can deep-diff and regenerate a new patch object
// It is relatively slow and should be used with care.
const diffPatch = Patch.fromDiff(userListCopy2, userList);
userListCopy2.apply(diffPatch);
userListCopy2.head.has('5').should.be.exactly(false);

// We can also restrict to Consumer and Producer facades.
const userListProducer = userList.createProducer();
const userListConsummer = userList.createConsumer();
userListProducer.should.not.have.property('get');
userListConsummer.should.not.have.property('set');
userListProducer.set('5', manu).commit();
userListConsummer.head.get('5').should.be.exactly(manu);

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

`r.toJSON(): string`/`r.toJS(): Object`

Returns a compact JSON string representing (resp. a serializable Object) the remutable instance. Can then be passed to `Remutable.fromJSON()` (resp. `Remutable.fromJS()`).

This methods is efficently cached so that each subsequent call to `toJSON()` (resp. `toJS()`) is nearly instant. The result from `toJS()` should be considered read-only.

`r.createConsumer(): new Remutable.Consumer`

Create a new Consumer object, with read-only semantics interface, namely mirrors `head`, `hash` and `version` of `r`.

`r.createProducer(): new Remutable.Producer`

Creates a new Producer object, with write-only semantics interface, eg. `set`, `delete`, `rollback`, `commit`, `match` and `apply`. `set` and `apply` return the producer instance for chainability and non-leaking.

`Remutable.fromJSON(json: String): new Remutable`

Reconstructs a fresh Remutable instance from a JSON string representation.
It is guaranteed that `Remutable.fromJSON(r.toString()).head.is(r.head) === true`.

`patch.toJSON(): string`/`patch.toJS(): Object`

Returns a compact JSON string (resp. a serializable Object) representing the patch instance. Can then be passed to `Remutable.Patch.fromJSON()` (resp. `Remutable.Patch.fromJS()`.

This method is efficiently cached so that each subsequent call to `toJSON()` (resp. `toJS()`) is nearly instant. The result from `toJS()` should be considered read-only.

`Remutable.Patch.fromJSON(json): new Patch`/`Remutable.Patch.fromJS(js): Object`

Reconstructs a fresh Patch instance from a JSON string representation (resp. from a serializable Object).

`get patch.source: string`

`get patch.target: string`

Returns the underlying hash of the patch source/target, so that `p1.target === p2.target` implies that `p1` and `p2` are identical
and `r.match(p)` is equivalent to `r.hash === p.source`.

`Remutable.Patch.revert(patch: Patch): new Patch`

Creates a new Patch instance which does the exact reverse mutations that `patch` does.
Useful to implement undo/redo mechanisms.

`Remutable.Patch.combine(patchA: Patch, patchB: Patch): new Patch`

Assuming that patchA's target is exactly patchB's source, creates a new Patch instance which maps patchA's source to patchB's target.
Internal representation is optimized, so that there is no redundant information.

`Remutable.Patch.fromDiff(prev: Remutable, next: Remutable): new Patch`

In some rare cases, you __known__ that `next` is a more recent version of `prev`, but don't have the underlying transition patches (for example, after a server full resync). `Patch#fromDiff` creates a new Patch object that reflects this transition: its source match `prev` and its target match `next`. Note however that this construction is relatively slow, as it requires to scan all the key/value pairs of both `prev` and `next`. Whenever possible, avoid deep diffing and maintain patches.

Configuration
=============

By default, `Remutable` uses CRC-32 as its hash function and `JSON.stringify` as its object signature function.

You may override this by simply setting `Remutable.hashFn` and/or `Remutable.signFn` before instanciating any Remutable or Remutable.Patch object.

If you want to use, say, `sha1` and `sigmund`, you may do the following:

```js
Remutable.hashFn = require('sha1');
Remutable.signFn = require('sigmund');
```
