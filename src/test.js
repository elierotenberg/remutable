const Remutable = require('../');
const { Patch } = Remutable;
require('lodash-next');

const robert = 'Robert Heinlein';
const isaac = 'Isaac Asimov';
const dan = 'Dan Simmons';
const bard = 'William Shakespeare';
const manu = 'Emmanuel Kant';

// Let's create an empty Remutable object
const userList = new Remutable();
userList.hash.should.be.exactly('60ba4b2daa4ed4d070fec06687e249e0e6f9ee45');
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
json.should.be.exactly('{"h":"87a149821b29aac81a0fda55ff1de4fde2ba4659","v":1,"d":{"1":"Robert Heinlein","2":"Isaac Asimov"}}');

// and read it back from the server via fromJSON
const userListCopy = Remutable.fromJSON(json);
userListCopy.toJSON().should.be.exactly(json);
userListCopy.head.size.should.be.exactly(2);

// In order to communicate changes between the client and the server,
// we get a patch when doing a commit and apply it
userList.set('3', dan);
const patch = userList.commit();
userListCopy.apply(patch);
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
