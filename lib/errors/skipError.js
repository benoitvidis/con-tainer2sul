class SkipError extends Error {
  constructor (msg) {
    super(msg);
  }
}

module.exports = SkipError;
