const _ = require('lodash-next');
const sha1 = require('sha1');
const sigmund = require('sigmund');

class Patch {
  constructor({ mutations, from, to }) {
    _.dev(() => mutations.should.be.an.Object &&
      from.should.be.an.Object &&
      from.h.should.be.a.String &&
      from.v.should.be.a.Number &&
      to.should.be.an.Object &&
      to.h.should.be.a.String &&
      to.v.should.be.a.Number
    );
    _.extend(this, {
      mutations,
      from,
      to,
    });
    this._serialized = null;
  }

  toJSON() {
    if(this._serialized === null) {
      this._serialized = JSON.stringify({
        m: this.mutations,
        f: this.from,
        t: this.to,
      });
    }
    return this._serialized;
  }

  static revert(patch) {
    const mutations = {};
    Object.keys(patch.mutations).forEach((key) => {
      const { f, t } = patch.mutations[key];
      mutations[key] = { f: t, t: f };
    });
    return Patch.fromMutations({ mutations, hash: patch.to.h, version: patch.to.v });
  }

  static fromMutations({ mutations, hash, version }) {
    const from = { h: hash, v: version };
    // New hash is calculated so that if two identical remutables are updated
    // using structurally equal mutations, then they will get the same hash.
    const to = { h: sha1(hash + sigmund(mutations)), v: version + 1 };
    return new Patch({ mutations, from, to });
  }

  static fromJSON(json) {
    const { m, f, t } = JSON.parse(json);
    return new Patch({ mutations: m, from: f, to: t });
  }

  static combine(patchA, patchB) {
    _.dev(() => patchA.should.be.an.instanceOf(Patch) &&
      patchB.should.be.an.instanceOf(Patch) &&
      // One can only combine compatible patches
      patchA.to.h.should.be.exactly(patchB.from.h)
    );
    return new Patch({
      mutations: _.extend(_.clone(patchA.mutations), patchB.mutations),
      from: _.clone(patchA.from),
      to: _.clone(patchB.to),
    });
  }
}

module.exports = Patch;
