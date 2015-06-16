import Remutable, { Patch } from '../';
import should from 'should';

const robert = 'Robert Heinlein';
const isaac = 'Isaac Asimov';
const dan = 'Dan Simmons';
const bard = 'William Shakespeare';
const manu = 'Emmanuel Kant';

const { it, describe } = global;

describe('Remutable', () => {
  describe('just after creation', () => {
    it('should not be dirty', () =>
      new Remutable().dirty.should.not.be.ok
    );
    it('should have default hash', () =>
      new Remutable().hash.should.be.exactly(-1549353149)
    );
  });

  describe('after setting two values', () => {
    describe('before committing the changes', () => {
      const userList = new Remutable()
        .set('1', robert)
        .set('2', isaac);
      it('should be dirty', () =>
        userList.dirty.should.be.ok
      );
      it('head should not be modified', () =>
        should(userList.head.get('1')).be.exactly(void 0)
      );
      it('working should be modified', () =>
        should(userList.working.get('1')).be.exactly(robert)
      );
    });

    describe('after committing the changes', () => {
      const userList = new Remutable()
        .set('1', robert)
        .set('2', isaac);
      userList.commit();
      it('head should be modified', () => {
        should(userList.head.get('1')).be.exactly(robert);
        should(userList.head.get('2')).be.exactly(isaac);
      });
    });

  });
  describe('after uncommmitted changes', () => {
    const userList = new Remutable()
      .set('1', robert)
      .set('2', isaac);
    userList.commit();

    userList.set('3', dan);
    it('working should be modified', () =>
      should(userList.working.get('3')).be.exactly(dan)
    );
  });

  describe('after rollback', () => {
    const userList = new Remutable()
      .set('1', robert)
      .set('2', isaac);
    userList.commit();

    userList.set('3', dan);
    userList.rollback();

    it('working should be restored', () =>
      should(userList.working.get('3')).be.exactly(void 0)
    );
  });

  describe('toJSON()', () => {
    const userList = new Remutable()
      .set('1', robert)
      .set('2', isaac);
    userList.commit();

    userList.set('3', dan);
    userList.rollback();

    const json = userList.toJSON();

    it('should output the correct JSON string', () =>
      json.should.be.exactly('{"h":1232569233,"v":1,"d":{"1":"Robert Heinlein","2":"Isaac Asimov"}}')
    );
  });

  describe('toJSON() into fromJSON()', () => {
    const userList = new Remutable()
      .set('1', robert)
      .set('2', isaac);
    userList.commit();

    userList.set('3', dan);
    userList.rollback();

    const json = userList.toJSON();

    const userListCopy = Remutable.fromJSON(json);

    it('should be idempotent', () => {
      userListCopy.toJSON().should.be.exactly(json);
      userListCopy.head.size.should.be.exactly(userList.head.size);
    });
  });
});

describe('Patch', () => {
  const userList = new Remutable()
    .set('1', robert)
    .set('2', isaac);
  userList.commit();

  userList.set('3', dan);
  userList.rollback();

  const userListCopy = Remutable.fromJSON(userList.toJSON());

  userList.set('3', dan);
  const patch = userList.commit();
  const jsonPatch = patch.toJSON();

  describe('toJSON()', () =>
    it('should output the correct JSON string', () =>
      should(jsonPatch).be.exactly(JSON.stringify({
        m: {
          '3': {
            t: 'Dan Simmons',
          },
        },
        f: {
          h: 1232569233,
          v: 1,
        },
        t: {
          h: -1034672275,
          v: 2,
        },
      }))
    )
  );

  const patchCopy = Patch.fromJSON(jsonPatch);

  describe('after transmission in JSON form', () => {
    userListCopy.apply(patchCopy);
    it('should correctly update a local copy', () => {
      should(userListCopy.head.get('3')).be.exactly(dan);
    });
  });
});

describe('Patch revert, combine, Consumer, Producer', () => {
  const userList = new Remutable()
    .set('1', robert)
    .set('2', isaac);
  userList.commit();

  userList.set('3', dan);
  userList.rollback();

  const userListCopy = Remutable.fromJSON(userList.toJSON());

  userList.set('3', dan);
  const patch = userList.commit();
  const jsonPatch = patch.toJSON();

  const patchCopy = Patch.fromJSON(jsonPatch);
  userListCopy.apply(patchCopy);

  it('should not throw', () => {
    // It's possible to implement an undo stack by reverting patches
    userListCopy.set('4', bard);
    const patch1 = userListCopy.commit();
    userListCopy.set('5', manu);
    const patch2 = userListCopy.commit();
    userListCopy.head.has('5').should.be.exactly(true);
    userListCopy.head.contains(manu).should.be.exactly(true);
    const revert2 = Patch.revert(patch2);
    userListCopy.apply(revert2);
    userListCopy.head.has('4').should.be.exactly(true);
    userListCopy.head.has('5').should.be.exactly(false);
    userListCopy.head.contains(bard).should.be.exactly(true);
    userListCopy.head.contains(manu).should.be.exactly(false);
    const revert1 = Patch.revert(patch1);
    userListCopy.apply(revert1);
    userListCopy.head.has('4').should.be.exactly(false);
    userListCopy.head.contains(bard).should.be.exactly(false);

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
  });
});
