const updateSubDocument = (model, prop, inM, inProp) => {
  const inModel = inM;
  const newIds = [];
  if (inModel[inProp]) {
    inModel[inProp].forEach(function (item) {
      if (item.id && !item.isNew) {
        const found = model[prop].filter((r) => r.id === item.id);
        if (found.length > 0) {
          Object.assign(found[0], item);
        }
      } else {
        model[prop].push(item);
        newIds.push(model[prop][model[prop].length - 1].id);
      }
    });
    // eslint-disable-next-line no-param-reassign
  }
  // eslint-disable-next-line no-self-compare
  return model[prop].filter(
    (r) =>
      newIds.filter((b) => b === r.id).length > 0 ||
      typeof r.id === 'undefined' ||
      inModel[inProp].filter((a) => a.id === r.id).length > 0
  );
};

module.exports = {
  updateSubDocument,
};
