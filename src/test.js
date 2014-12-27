var Remutable = require('../');
function l() {
  console.log.apply(console, arguments);
}

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
