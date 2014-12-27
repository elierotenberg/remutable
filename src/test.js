const Remutable = require('../');
const { Patch } = Remutable;
require('lodash-next');

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


