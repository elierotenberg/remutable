const _ = require('lodash-next');
const sha1 = require('sha1');
const sigmund = require('sigmund');

class Patch {
  constructor({ mutations, from, to }) {
    _.extend(this, { mutations, from, to });
  }

  serialize() {
    const { mutations, from, to } = this;
    return JSON.stringify({
      m: mutations,
      f: from,
      t: to,
    });
  }

  get hash() {
    return `${this.from.hash}:${this.to.hash}`;
  }

  reverse() {
    const mutations = {};
    Object.keys(this.mutations).forEach((key) => {
      const { f, t } = this.mutations[key];
      mutations[key] = { f: t, t: f };
    });
    return Patch.create({ mutations, hash: this.to.h, version: this.to.v });
  }

  static create({ mutations, hash, version }) {
    const from = { h: hash, v: version };
    // New hash is calculated so that if two identical remutables are updated
    // using structurally equal mutations, then they will get the same hash.
    const to = { h: sha1(hash + sigmund(mutations)), v: version + 1 };
    return new Patch({ mutations, from, to });
  }

  static unserialize(str) {
    const { m, f, t } = JSON.parse(str);
    return new Patch({ mutations: m, from: f, to: t });
  }
}

module.exports = Patch;
