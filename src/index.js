const _ = require('lodash-next');

const MUTATIONS = {
  SET: 's',
  DEL: 'd',
};

class Remutable {
  constructor() {
    this._data = {};
    this._mutations = {};
    this._version = 0;
    this._remutableId = _.random(0, 4294967296);
  }

  get(key) {
    if(this._mutations[key] !== void 0) {
      const { m, v } = this._mutations[key];
      if(m === MUTATIONS.DEL) {
        return void 0;
      }
      if(m === MUTATIONS.SET) {
        return v;
      }
    }
    return this._data[key];
  }

  checkout(key) {
    return this._data[key];
  }

  set(key, val) {
    this._mutations[key] = { d: MUTATIONS.SET, v: val };
  }

  del(key) {
    this._mutations[key] = { d: MUTATIONS.DEL };
  }

  commit() {
    return this._applyPatchWithoutCheckingMutations({
      remutableId: this._remutableId,
      mutations: this._mutations,
      prev: this._version,
      next: this._version + 1,
    });
  }

  rollback() {
    this._mutations = {};
  }

  canApply(patch) {
    const { remutableId, prev } = patch;
    return (this._remutableId === remutableId && this._version === prev);
  }

  _applyPatchWithoutCheckingMutations(patch) {
    const { remutableId, mutations, prev, next } = patch;
    this.canApply(patch).should.be.ok;
    Object.keys(mutations).forEach((key) => {
      const { m, v } = this._mutations[key];
      if(m === MUTATIONS.DEL) {
        delete this._data[key];
      }
      if(m === MUTATIONS.SET) {
        this._data[key] = v;
      }
    });
    this._version = next;
    this._mutations = {};
    return patch;
  }

  apply(patch) {
    this._mutations.should.eql({});
    return this._applyPatchWithoutCheckingMutations(patch);
  }

  serialize() {
    return JSON.stringify({
      remutableId: this._remutableId,
      version: this._version,
      data: this._data,
    });
  }

  static unserialize(serialized) {
    const { remutableId, version, data } = JSON.parse(serialized);
    _.dev(() => remutableId.should.be.a.Number &&
      version.should.be.a.Number &&
      data.should.be.an.Object
    );
    const remutable = new Remutable();
    remutable._remutableId = remutableId;
    remutable._version = version;
    remutable._data = data;
    return remutable;
  }
}

_.extend(Remutable.prototype, {
  _data: null,
  _mutations: null,
  _version: null,
  _remutableId: null,
});

module.exports = Remutable;
