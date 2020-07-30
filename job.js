const job = (loop = 5000000) => {
  let i = 0;
  while (i < loop) {
    JSON.parse('{}');
    i++;
  }
  return i;
};

module.exports = job;
