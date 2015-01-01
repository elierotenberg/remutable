module.exports = function(Remutable) {
  class Patch {
    constructor({ mutations, from, to }) {
      if(__DEV__) {
        mutations.should.be.an.Object;
        from.should.be.an.Object;
        from.h.should.be.ok;
        from.v.should.be.a.Number;
        to.should.be.an.Object;
        to.h.should.be.ok;
        to.v.should.be.a.Number;
      }
      _.extend(this, {
        mutations,
        from,
        to,
      });
      this._serialized = null;

      _.bindAll(this);
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
      if(__DEV__) {
        patchA.should.be.an.instanceOf(Patch);
        patchB.should.be.an.instanceOf(Patch);
        // One can only combine compatible patches
        patchA.target.should.be.exactly(patchB.source);
      }
      return new Patch({
        mutations: _.extend(_.clone(patchA.mutations), patchB.mutations),
        from: _.clone(patchA.from),
        to: _.clone(patchB.to),
      });
    }

    static fromDiff(prev, next) {
      if(__DEV__) {
        (prev instanceof Remutable || prev instanceof Remutable.Consumer).should.be.ok;
        (next instanceof Remutable || next instanceof Remutable.Consumer).should.be.ok;
        prev.version.should.be.below(next.version);
        prev.dirty.should.not.be.ok;
        next.dirty.should.not.be.ok;
      }
      const from = {
        h: prev.hash,
        v: prev.version,
      };
      const to = {
        h: next.hash,
        v: next.version,
      };
      const mutations = {};
      const diffKeys = {};
      [prev, next].forEach((rem) =>
        rem.head.forEach((val, key) =>
          prev.head.get(key) !== next.head.get(key) ? (diffKeys[key] = null) : void 0
        )
      );
      Object.keys(diffKeys).forEach((key) => mutations[key] = { f: prev.head.get(key), t: next.head.get(key) });
      return new Patch({ mutations, from, to });
    }
  }

  return Patch;
};

