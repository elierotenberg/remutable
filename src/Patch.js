const _ = require('lodash-next');

module.exports = function(Remutable) {
  class Patch {
    constructor({ mutations, from, to }) {
      _.dev(() => {
        mutations.should.be.an.Object;
        from.should.be.an.Object;
        from.h.should.be.ok;
        from.v.should.be.a.Number;
        to.should.be.an.Object;
        to.h.should.be.ok;
        to.v.should.be.a.Number;
      });
      _.extend(this, {
        mutations,
        from,
        to,
      });
      this._serialized = null;
    }

    get source() {
      return this.from.h;
    }

    get target() {
      return this.to.h;
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
      const to = { h: Remutable.hashFn(hash + Remutable.signFn(mutations)), v: version + 1 };
      return new Patch({ mutations, from, to });
    }

    static fromJSON(json) {
      const { m, f, t } = JSON.parse(json);
      return new Patch({ mutations: m, from: f, to: t });
    }

    static combine(patchA, patchB) {
      _.dev(() => {
        patchA.should.be.an.instanceOf(Patch);
        patchB.should.be.an.instanceOf(Patch);
        // One can only combine compatible patches
        patchA.target.should.be.exactly(patchB.source);
      });
      return new Patch({
        mutations: _.extend(_.clone(patchA.mutations), patchB.mutations),
        from: _.clone(patchA.from),
        to: _.clone(patchB.to),
      });
    }
  }

  return Patch;
};

